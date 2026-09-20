import { supabase } from "@/integrations/supabase/client";

export type Asset = {
  id: string;
  user_id: string;
  kind: string;
  prompt: string;
  model: string;
  storage_path: string;
  created_at: string;
  url: string | null;
};

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const meta = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function saveImage(
  userId: string,
  dataUrl: string,
  kind: "generate" | "edit",
  prompt: string,
): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, { contentType: "image/png" });
  if (uploadError) throw new Error(uploadError.message);
  const { error: dbError } = await supabase
    .from("assets")
    .insert({ user_id: userId, kind, prompt, storage_path: path });
  if (dbError) {
    await supabase.storage.from("media").remove([path]);
    throw new Error(dbError.message);
  }
}

export async function listAssets(limit = 60): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("media")
        .createSignedUrl(row.storage_path, 3600);
      return { ...row, url: signed?.signedUrl ?? null };
    }),
  );
}

export async function deleteAsset(asset: Asset): Promise<void> {
  const { error } = await supabase.from("assets").delete().eq("id", asset.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from("media").remove([asset.storage_path]);
}
