import { createParser } from "eventsource-parser";

export const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
export const CHAT_MODEL = "openai/gpt-6-astra";

export function responsesHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Lovable-API-Key": apiKey,
    "X-Lovable-AIG-SDK": "fetch",
  };
}

export type ChatInput = { role: "user" | "system"; content: string };

export function responsesBody(opts: {
  instructions?: string;
  input: ChatInput[];
  effort?: "low" | "medium" | "high";
  stream?: boolean;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}) {
  return {
    model: CHAT_MODEL,
    ...(opts.instructions ? { instructions: opts.instructions } : {}),
    input: opts.input,
    stream: opts.stream ?? true,
    reasoning: { effort: opts.effort ?? "low", summary: "auto" },
    store: false,
    include: ["reasoning.encrypted_content"],
    ...(opts.jsonSchema
      ? {
          text: {
            format: {
              type: "json_schema",
              name: opts.jsonSchema.name,
              schema: opts.jsonSchema.schema,
              strict: true,
            },
          },
        }
      : {}),
  };
}

type StreamPayload = {
  type?: string;
  delta?: string;
  error?: { message?: string };
  response?: { error?: { message?: string } };
};

/** Consumes a streaming Responses API body and returns the accumulated answer text. */
export async function collectResponsesText(res: Response): Promise<string> {
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `AI request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  let text = "";
  let failure: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: StreamPayload | undefined;
      try {
        payload = JSON.parse(event.data) as StreamPayload;
      } catch {
        return;
      }
      const type = event.event || payload?.type;
      if (type === "error" || type === "response.failed") {
        failure =
          payload?.error?.message ?? payload?.response?.error?.message ?? "AI request failed";
        return;
      }
      if (type === "response.output_text.delta" && payload?.delta) text += payload.delta;
    },
  });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (failure) throw new Error(failure);
  if (!text.trim()) throw new Error("The model returned nothing — try again");
  return text;
}
