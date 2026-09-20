import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, PenLine, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Panel, Select, TextArea, TextInput } from "@/components/studio";
import { countWords, createPost, deletePost, listPosts, updatePost, type Post } from "@/lib/posts";
import { authHeaders, useSession } from "@/lib/session";
import { streamWriting } from "@/lib/stream-text";

export const Route = createFileRoute("/app/write")({
  head: () => ({
    meta: [
      { title: "Write posts — Quick.AI" },
      { name: "description", content: "Draft and refine blog posts with AI in Quick.AI." },
      { property: "og:title", content: "Write posts — Quick.AI" },
      { property: "og:description", content: "Draft and refine blog posts with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WritePage,
});

const TONES = ["Conversational", "Professional", "Playful", "Technical", "Persuasive"];
const LENGTHS = [
  { value: "short", label: "Short — ~500 words" },
  { value: "medium", label: "Medium — ~900 words" },
  { value: "long", label: "Long — ~1500 words" },
];

function WritePage() {
  const { user } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState("medium");
  const [writing, setWriting] = useState(false);
  const [thinking, setThinking] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  function select(post: Post) {
    setActiveId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setStatus(post.status);
    setThinking("");
  }

  async function newPost() {
    if (!user) return;
    try {
      const post = await createPost(user.id);
      setPosts((prev) => [post, ...prev]);
      select(post);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the post");
    }
  }

  async function save() {
    if (!activeId || saving) return;
    setSaving(true);
    try {
      await updatePost(activeId, { title, content, status });
      setPosts((prev) =>
        prev.map((p) => (p.id === activeId ? { ...p, title, content, status } : p)),
      );
      toast.success("Post saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the post");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!activeId) return;
    try {
      await deletePost(activeId);
      setPosts((prev) => prev.filter((p) => p.id !== activeId));
      setActiveId(null);
      setTitle("");
      setContent("");
      setStatus("draft");
      toast.success("Post deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the post");
    }
  }

  async function draft() {
    if (!topic.trim() || writing) return;
    setWriting(true);
    setThinking("");
    const base = content;
    let buffer = "";
    try {
      const headers = await authHeaders();
      await streamWriting(
        "/api/write-post",
        { topic: topic.trim(), tone, length },
        (delta, kind) => {
          if (kind === "thinking") {
            setThinking((prev) => (prev + delta).slice(-300));
            return;
          }
          buffer += delta;
          setContent(base ? `${base}\n\n${buffer}` : buffer);
        },
        headers,
      );
      if (!title.trim()) {
        const firstLine = buffer.split("\n").find((l) => l.trim().startsWith("#"));
        if (firstLine) setTitle(firstLine.replace(/^#+\s*/, "").trim());
      }
      toast.success("Draft ready — review it, then save");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Writing failed — try again");
    } finally {
      setWriting(false);
    }
  }

  const active = posts.find((p) => p.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-primary">Tool 03</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Write</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft posts from a brief, then refine them in the editor.
          </p>
        </div>
        <Button onClick={newPost} variant="secondary">
          <Plus /> New post
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <Panel className="h-fit max-h-[70vh] overflow-y-auto p-3">
          <p className="label-mono px-2 pb-2 pt-1 text-muted-foreground">Your posts</p>
          {loadingList ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No posts yet — start a new one.
            </p>
          ) : (
            <ul className="space-y-1">
              {posts.map((post) => (
                <li key={post.id}>
                  <button
                    onClick={() => select(post)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      post.id === activeId
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium">{post.title}</span>
                    </span>
                    <span className="mt-1 block pl-5 font-mono text-[10px] uppercase tracking-widest opacity-70">
                      {post.status} · {countWords(post.content)}w
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel className="space-y-4 p-5">
            <p className="label-mono text-muted-foreground">AI draft</p>
            <Field label="Brief" hint="Topic, angle, key points — one or two sentences is plenty.">
              <TextArea
                placeholder="Why small studios should publish build logs, with three practical examples"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tone">
                <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Length">
                <Select value={length} onChange={(e) => setLength(e.target.value)}>
                  {LENGTHS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {writing && thinking ? (
              <p className="truncate font-mono text-xs italic text-muted-foreground">
                thinking: {thinking}
              </p>
            ) : null}
            <Button onClick={draft} disabled={writing || !topic.trim()}>
              {writing ? <Loader2 className="animate-spin" /> : <PenLine />}
              {writing ? "Writing…" : "Draft with AI"}
            </Button>
          </Panel>

          <Panel className="space-y-4 p-5">
            {active ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <TextInput
                    className="min-w-0 flex-1"
                    placeholder="Post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Select
                    className="w-36"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                    <option value="published">Published</option>
                  </Select>
                </div>
                <TextArea
                  className="min-h-[420px] font-mono text-[13px]"
                  placeholder="# Your post in Markdown…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {countWords(content)} words
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={remove}>
                      <Trash2 /> Delete
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving}>
                      {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Pick a post on the left, or start a new one.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
