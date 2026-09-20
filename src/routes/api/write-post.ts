import { createFileRoute } from "@tanstack/react-router";

import { jsonError, requireUser } from "@/lib/gateway-auth.server";
import { RESPONSES_URL, responsesBody, responsesHeaders } from "@/lib/responses.server";

const LENGTH_GUIDE: Record<string, string> = {
  short: "about 500 words",
  medium: "about 900 words",
  long: "about 1500 words",
};

export const Route = createFileRoute("/api/write-post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;

        let body: { topic?: string; tone?: string; length?: string; stream?: boolean };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonError("Invalid request body", 400);
        }
        const topic = body.topic?.trim();
        if (!topic) return jsonError("Tell me what the post should be about", 400);
        if (topic.length > 2000) return jsonError("Keep the brief under 2000 characters", 400);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError("AI is not configured for this workspace", 500);

        const tone = body.tone?.trim() || "conversational";
        const words = LENGTH_GUIDE[body.length ?? "medium"] ?? LENGTH_GUIDE["medium"];

        const instructions =
          "You are a sharp editorial writer inside a content studio tool. " +
          "Return clean Markdown: a single H1 title line, then sections with H2 subheads, " +
          "short paragraphs, and lists where they genuinely help. No front matter, no meta commentary.";

        const prompt =
          `Write a blog post of ${words} in a ${tone} tone.\n` +
          `Brief: ${topic}\n` +
          "Make the headline specific and non-clickbait. End with a short takeaway section.";

        const upstream = await fetch(RESPONSES_URL, {
          method: "POST",
          headers: responsesHeaders(apiKey),
          body: JSON.stringify(
            responsesBody({
              instructions,
              input: [{ role: "user", content: prompt }],
              effort: "medium",
              stream: body.stream ?? true,
            }),
          ),
        });
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
