import { createFileRoute } from "@tanstack/react-router";
import { Download, Loader2, Save, Upload, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Panel, TextArea } from "@/components/studio";
import { listAssets, saveImage, type Asset } from "@/lib/library";
import { authHeaders, useSession } from "@/lib/session";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/app/edit")({
  head: () => ({
    meta: [
      { title: "Edit images — Quick.AI" },
      { name: "description", content: "Restyle and edit images with an instruction in Quick.AI." },
      { property: "og:title", content: "Edit images — Quick.AI" },
      { property: "og:description", content: "Restyle and edit images with an instruction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditPage,
});

type Frame = { url: string; isFinal: boolean };

function EditPage() {
  const { user } = useSession();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [recent, setRecent] = useState<Asset[]>([]);

  useEffect(() => {
    listAssets(8)
      .then(setRecent)
      .catch(() => {});
  }, []);

  function pickFile(next: File | null) {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("That file isn't an image");
      return;
    }
    setFile(next);
    setSourceUrl(URL.createObjectURL(next));
    setFrame(null);
    setSaved(false);
  }

  async function pickFromLibrary(asset: Asset) {
    if (!asset.url) return;
    try {
      const res = await fetch(asset.url);
      const blob = await res.blob();
      pickFile(new File([blob], "library.png", { type: blob.type || "image/png" }));
    } catch {
      toast.error("Could not load that image");
    }
  }

  async function run() {
    if (!file || !prompt.trim() || busy) return;
    setBusy(true);
    setFrame(null);
    setSaved(false);
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.append("image", file);
      form.append("prompt", prompt.trim());
      await streamImage("/api/edit-image", form, (url, isFinal) => setFrame({ url, isFinal }), undefined, headers);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Edit failed — try again");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!frame?.isFinal || !user || saving) return;
    setSaving(true);
    try {
      await saveImage(user.id, frame.url, "edit", prompt.trim());
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
      <p className="label-mono text-primary">Tool 02</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Edit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a visual, say what to change, and the model restyles it.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Panel className="h-fit space-y-5 p-5">
          <Field label="Source image">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background/60 px-3 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose an image"}
            </button>
          </Field>

          {recent.length > 0 ? (
            <Field label="Or from your library">
              <div className="grid grid-cols-4 gap-2">
                {recent.map((asset) =>
                  asset.url ? (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => void pickFromLibrary(asset)}
                      className="overflow-hidden rounded-md border border-border transition-colors hover:border-primary/60"
                      title={asset.prompt}
                    >
                      <img src={asset.url} alt={asset.prompt} className="aspect-square w-full object-cover" />
                    </button>
                  ) : null,
                )}
              </div>
            </Field>
          ) : null}

          <Field label="Edit instruction" hint='e.g. "make it black and white" or "add dramatic sunset lighting"'>
            <TextArea
              placeholder="Turn the background into a neon cityscape at night"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </Field>
          <Button className="w-full" onClick={run} disabled={busy || !file || !prompt.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {busy ? "Editing…" : "Apply edit"}
          </Button>
        </Panel>

        <div className="space-y-6">
          {sourceUrl ? (
            <Panel className="overflow-hidden">
              <p className="label-mono border-b border-border px-4 py-3 text-muted-foreground">Before</p>
              <div className="flex max-h-72 items-center justify-center bg-background/40">
                <img src={sourceUrl} alt="Source" className="max-h-72 w-full object-contain" />
              </div>
            </Panel>
          ) : null}

          <Panel className="overflow-hidden">
            <p className="label-mono border-b border-border px-4 py-3 text-muted-foreground">After</p>
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
                      <p className="label-mono mt-4 text-muted-foreground">Applying your edit</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">The edited image appears here.</p>
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
                  <a href={frame.url} download="quickai-edit.png">
                    <Download /> Download
                  </a>
                </Button>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
