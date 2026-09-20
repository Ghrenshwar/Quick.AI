import { createFileRoute } from "@tanstack/react-router";

import { editImage, imageSettings } from "@/lib/image-gateway.server";
import { jsonError, requireUser } from "@/lib/gateway-auth.server";

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError("AI is not configured for this workspace", 500);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonError("Invalid upload", 400);
        }
        const image = form.get("image");
        if (!(image instanceof File) || image.size === 0) {
          return jsonError("Choose an image to edit first", 400);
        }
        if (image.size > 12 * 1024 * 1024) {
          return jsonError("Images up to 12 MB are supported", 400);
        }
        const prompt = form.get("prompt");
        if (typeof prompt !== "string" || !prompt.trim()) {
          return jsonError("Describe the edit you want first", 400);
        }

        const upstream = await editImage({ ...imageSettings, apiKey }, form);
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
