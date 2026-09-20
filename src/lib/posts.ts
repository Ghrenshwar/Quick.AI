import { supabase } from "@/integrations/supabase/client";

export type Post = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type SnippetItem = { platform: string; content: string };

export async function listPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPost(userId: string): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({ user_id: userId, title: "Untitled draft" })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create the post");
  return data;
}

export async function updatePost(
  id: string,
  patch: { title?: string; content?: string; status?: string },
): Promise<void> {
  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveSnippets(
  userId: string,
  postId: string | null,
  items: SnippetItem[],
): Promise<void> {
  const rows = items.map((item) => ({
    user_id: userId,
    post_id: postId,
    platform: item.platform,
    content: item.content,
  }));
  const { error } = await supabase.from("snippets").insert(rows);
  if (error) throw new Error(error.message);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
