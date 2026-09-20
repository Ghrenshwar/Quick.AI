import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Loader2, Save, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Panel, Select, TextInput } from "@/components/studio";
import { listPosts, saveSnippets, type Post } from "@/lib/posts";
import { authedFetch, copyToClipboard, useSession } from "@/lib/session";

export const Route = createFileRoute("/app/snippets")({
  head: () => ({
    meta: [
      { title: "Social snippets — Quick.AI" },
      { name: "description", content: "Turn blog posts into social snippets with Quick.AI." },
      { property: "og:title", content: "Social snippets — Quick.AI" },
      { property: "og:description", content: "Turn blog posts into social snippets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SnippetsPage,
});

type SnippetPack = {
  twitter: string;
  linkedin: string;
  instagram: string;
  hashtags: string[];
  email_subject: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  email_subject: "Email subject",
};

function SnippetsPage() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postId, setPostId] = useState("");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pack, setPack] = useState<SnippetPack | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    listPosts()
      .then((rows) => {
        setPosts(rows);
        if (rows[0]) setPostId(rows[0].id);
      })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  async function generate() {
    const post = posts.find((p) => p.id === postId);
    if (!post || busy) return;
    if (!post.content.trim()) {
      toast.error("That post is empty — write it first");
      return;
    }
    setBusy(true);
    setPack(null);
    setSaved(false);
    try {
      const res = await authedFetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: post.title, content: post.content, audience }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        snippets?: SnippetPack;
        error?: string;
      };
      if (!res.ok || !json.snippets) {
        throw new Error(json.error ?? `Snippet generation failed (${res.status})`);
      }
      setPack(json.snippets);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Snippet generation failed — try again");
    } finally {
      setBusy(false);
    }
  }

  async function copy(key: string, text: string) {
    await copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  async function saveAll() {
    if (!pack || !user || saving) return;
    setSaving(true);
    try {
      await saveSnippets(user.id, postId || null, [
        { platform: "twitter", content: pack.twitter },
        { platform: "linkedin", content: pack.linkedin },
        { platform: "instagram", content: pack.instagram },
        { platform: "hashtags", content: pack.hashtags.map((h) => `#${h}`).join(" ") },
        { platform: "email_subject", content: pack.email_subject },
      ]);
      setSaved(true);
      toast.success("Snippet pack saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the snippets");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="label-mono text-primary">Tool 04</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Snippets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a post, get platform-ready copy for every channel.
      </p>

      <Panel className="mt-8 space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Post">
            <Select value={postId} onChange={(e) => setPostId(e.target.value)}>
              {posts.length === 0 ? <option value="">No posts yet</option> : null}
              {posts.map((post) => (
                <option key={post.id} value={post.id}>
                  {post.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Audience" hint="Optional — e.g. indie founders, designers">
            <TextInput
              placeholder="General"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </Field>
        </div>
        <Button onClick={generate} disabled={busy || !postId}>
          {busy ? <Loader2 className="animate-spin" /> : <Share2 />}
          {busy ? "Writing snippets…" : "Generate snippet pack"}
        </Button>
      </Panel>

      {pack ? (
        <div className="mt-6 space-y-4">
          {(["twitter", "linkedin", "instagram", "email_subject"] as const).map((key) => (
            <Panel key={key} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="label-mono text-muted-foreground">{PLATFORM_LABELS[key]}</p>
                <Button size="sm" variant="ghost" onClick={() => void copy(key, pack[key])}>
                  {copied === key ? <Check className="text-primary" /> : <Copy />}
                  {copied === key ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{pack[key]}</p>
              {key === "twitter" ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {pack.twitter.length}/280
                </p>
              ) : null}
            </Panel>
          ))}

          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="label-mono text-muted-foreground">Hashtags</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void copy("hashtags", pack.hashtags.map((h) => `#${h}`).join(" "))}
              >
                {copied === "hashtags" ? <Check className="text-primary" /> : <Copy />}
                {copied === "hashtags" ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pack.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </Panel>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={saveAll} disabled={saving || saved}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />}
              {saved ? "Saved" : "Save snippet pack"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
