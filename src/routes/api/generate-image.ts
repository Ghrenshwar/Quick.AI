import { createFileRoute } from "@tanstack/react-router";

import { generateImage, imageSettings } from "@/lib/image-gateway.server";
import { jsonError, requireUser } from "@/lib/gateway-auth.server";

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;

        let body: { prompt?: string; stream?: boolean; size?: string; background?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonError("Invalid request body", 400);
        }
        const prompt = body.prompt?.trim();
        if (!prompt) return jsonError("Describe the image you want first", 400);
        if (prompt.length > 4000) return jsonError("Keep the prompt under 4000 characters", 400);

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError("AI is not configured for this workspace", 500);

        const extra: Record<string, unknown> = {};
        if (body.size && ALLOWED_SIZES.has(body.size)) extra["size"] = body.size;
        if (body.background === "transparent") extra["background"] = "transparent";

        const upstream = await generateImage(
          { ...imageSettings, apiKey },
          prompt,
          body.stream ?? true,
          extra,
        );
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
