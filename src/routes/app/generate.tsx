import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Save, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Panel, Select, TextArea } from "@/components/studio";
import { saveImage } from "@/lib/library";
import { authHeaders, useSession } from "@/lib/session";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/app/generate")({
  head: () => ({
    meta: [
      { title: "Generate images — Quick.AI" },
      { name: "description", content: "Generate images from a text prompt in the Quick.AI studio." },
      { property: "og:title", content: "Generate images — Quick.AI" },
      { property: "og:description", content: "Generate images from a text prompt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GeneratePage,
});

type Frame = { url: string; isFinal: boolean };

function GeneratePage() {
  const { user } = useSession();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);

  async function run() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setFrame(null);
    setSaved(false);
    try {
      const headers = await authHeaders();
      const input: Record<string, unknown> = { prompt: prompt.trim(), size };
      if (transparent) input["background"] = "transparent";
      await streamImage(
        "/api/generate-image",
        input,
        (url, isFinal) => setFrame({ url, isFinal }),
        undefined,
        headers,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed — try again");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!frame?.isFinal || !user || saving) return;
    setSaving(true);
    try {
      await saveImage(user.id, frame.url, "generate", prompt.trim());
      setSaved(true);
      toast.success("Saved to your library");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the image");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="label-mono text-primary">Tool 01</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Generate</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe the visual. Watch it render live, then save it to your library.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Panel className="h-fit space-y-5 p-5">
          <Field label="Prompt" hint="Be concrete: subject, style, lighting, mood.">
            <TextArea
              placeholder="A ceramic coffee cup on a walnut desk, morning light, soft shadows, editorial photography"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
            />
          </Field>
          <Field label="Canvas">
            <Select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="1024x1024">Square — 1024 × 1024</option>
              <option value="1536x1024">Landscape — 1536 × 1024</option>
              <option value="1024x1536">Portrait — 1024 × 1536</option>
            </Select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            Transparent background
          </label>
          <Button className="w-full" onClick={run} disabled={busy || !prompt.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Rendering…" : "Generate"}
          </Button>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex aspect-square items-center justify-center bg-background/40">
            {frame ? (
              <img
                src={frame.url}
                alt={prompt}
                className={`h-full w-full object-contain transition-[filter] duration-500 ${
                  frame.isFinal ? "blur-0" : "scale-105 blur-2xl"
                }`}
              />
            ) : (
              <div className="px-8 text-center">
                {busy ? (
                  <>
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="label-mono mt-4 text-muted-foreground">Warming up the model</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your render appears here, frame by frame.
                  </p>
                )}
              </div>
            )}
          </div>
          {frame?.isFinal ? (
            <div className="flex flex-wrap gap-2 border-t border-border p-4">
              <Button size="sm" variant="secondary" onClick={save} disabled={saving || saved}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {saved ? "Saved" : "Save to library"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={frame.url} download="quickai.png">
                  <Download /> Download
                </a>
              </Button>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
