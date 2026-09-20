import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Images, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/studio";
import { deleteAsset, listAssets, type Asset } from "@/lib/library";
import { copyToClipboard } from "@/lib/session";

export const Route = createFileRoute("/app/library")({
  head: () => ({
    meta: [
      { title: "Media library — Quick.AI" },
      { name: "description", content: "Your saved AI-generated and edited images in Quick.AI." },
      { property: "og:title", content: "Media library — Quick.AI" },
      { property: "og:description", content: "Your saved AI-generated and edited images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listAssets()
      .then(setAssets)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function copyPrompt(asset: Asset) {
    await copyToClipboard(asset.prompt);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId((c) => (c === asset.id ? null : c)), 1500);
  }

  async function remove(asset: Asset) {
    setDeletingId(asset.id);
    try {
      await deleteAsset(asset);
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the image");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="label-mono text-primary">Your vault</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every image you save lands here — private to your account.
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : assets.length === 0 ? (
        <Panel className="mt-8 flex flex-col items-center gap-3 p-14 text-center">
          <Images className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Generate or edit an image and hit “Save to library”.
          </p>
        </Panel>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Panel key={asset.id} className="overflow-hidden">
              {asset.url ? (
                <img
                  src={asset.url}
                  alt={asset.prompt}
                  className="aspect-square w-full bg-background/40 object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-background/40 text-sm text-muted-foreground">
                  Preview unavailable
                </div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`label-mono rounded-full px-2 py-0.5 ${
                      asset.kind === "edit"
                        ? "bg-accent text-accent-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {asset.kind === "edit" ? "Edited" : "Generated"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {asset.prompt || "No prompt recorded"}
                </p>
                <div className="flex gap-1">
                  {asset.url ? (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={asset.url} target="_blank" rel="noreferrer">
                        <ExternalLink /> Open
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => void copyPrompt(asset)}>
                    {copiedId === asset.id ? <Check className="text-primary" /> : <Copy />}
                    Prompt
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void remove(asset)}
                    disabled={deletingId === asset.id}
                  >
                    {deletingId === asset.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
