import { createFileRoute } from "@tanstack/react-router";

import { jsonError, requireUser } from "@/lib/gateway-auth.server";
import {
  RESPONSES_URL,
  collectResponsesText,
  responsesBody,
  responsesHeaders,
} from "@/lib/responses.server";

const SNIPPET_SCHEMA = {
  type: "object",
  properties: {
    twitter: { type: "string", description: "X/Twitter post, max 280 characters" },
    linkedin: { type: "string", description: "LinkedIn post, about 120 words" },
    instagram: { type: "string", description: "Instagram caption, about 60 words" },
    hashtags: { type: "array", items: { type: "string" }, description: "5 hashtags, no # prefix" },
    email_subject: { type: "string", description: "Email subject line promoting the post" },
  },
  required: ["twitter", "linkedin", "instagram", "hashtags", "email_subject"],
  additionalProperties: false,
} as const;

export const Route = createFileRoute("/api/snippets")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;

        let body: { title?: string; content?: string; audience?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonError("Invalid request body", 400);
        }
        const content = body.content?.trim();
        if (!content) return jsonError("Write the post first, then make snippets", 400);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError("AI is not configured for this workspace", 500);

        const instructions =
          "You turn blog posts into social content inside a content studio tool. " +
          "Write in each platform's native voice. Never invent facts that are not in the post. " +
          "Return only the JSON object.";

        const prompt =
          `Blog title: ${body.title?.trim() || "Untitled"}\n` +
          `Audience: ${body.audience?.trim() || "general"}\n\n` +
          `Post:\n${content.slice(0, 12000)}\n\n` +
          "Create the snippet pack for this post.";

        const upstream = await fetch(RESPONSES_URL, {
          method: "POST",
          headers: responsesHeaders(apiKey),
          body: JSON.stringify(
            responsesBody({
              instructions,
              input: [{ role: "user", content: prompt }],
              effort: "low",
              jsonSchema: { name: "snippet_pack", schema: { ...SNIPPET_SCHEMA } },
            }),
          ),
        });

        try {
          const text = await collectResponsesText(upstream);
          const snippets = JSON.parse(text) as Record<string, unknown>;
          return Response.json({ snippets });
        } catch (error) {
          return jsonError(
            error instanceof Error ? error.message : "Snippet generation failed — try again",
            502,
          );
        }
      },
    },
  },
});
