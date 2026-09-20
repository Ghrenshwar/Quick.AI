import { createParser } from "eventsource-parser";

type TextPayload = {
  type?: string;
  delta?: string;
  error?: { message?: string };
  response?: { error?: { message?: string } };
};

function extractOutputText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const top = json as { output_text?: string; output?: unknown[] };
  if (typeof top.output_text === "string" && top.output_text) return top.output_text;
  if (!Array.isArray(top.output)) return "";
  let text = "";
  for (const item of top.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const p = part as { type?: string; text?: string };
      if (p?.type === "output_text" && typeof p.text === "string") text += p.text;
    }
  }
  return text;
}

/**
 * Streams a writing request to a server route that proxies the Responses API.
 * onDelta receives ("text" | "thinking") chunks as they arrive.
 */
export async function streamWriting(
  endpoint: string,
  input: Record<string, unknown>,
  onDelta: (text: string, kind: "text" | "thinking") => void,
  headers?: HeadersInit,
): Promise<void> {
  const send = (stream: boolean) => {
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Content-Type", "application/json");
    return fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ ...input, stream }),
    });
  };

  const res = await send(true);
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    let message = `Writing failed (${res.status})`;
    try {
      const parsed = JSON.parse(detail) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      if (detail) message = detail.slice(0, 200);
    }
    throw new Error(message);
  }

  let sawAny = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: TextPayload | undefined;
      try {
        payload = JSON.parse(event.data) as TextPayload;
      } catch {
        return;
      }
      const type = event.event || payload?.type;
      if (type === "error" || type === "response.failed") {
        sawAny = true;
        streamError =
          payload?.error?.message ?? payload?.response?.error?.message ?? "Writing failed";
        return;
      }
      if (type === "response.output_text.delta" && payload?.delta) {
        sawAny = true;
        onDelta(payload.delta, "text");
      } else if (type === "response.reasoning_summary_text.delta" && payload?.delta) {
        sawAny = true;
        onDelta(payload.delta, "thinking");
      }
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
  if (streamError) throw new Error(streamError);
  if (!sawAny) {
    // Zero-event stream: replay once without streaming and read the JSON body.
    const replay = await send(false);
    if (!replay.ok) throw new Error(`Writing failed (${replay.status})`);
    const text = extractOutputText(await replay.json().catch(() => null));
    if (!text.trim()) throw new Error("The model returned nothing — try again");
    onDelta(text, "text");
  }
}
