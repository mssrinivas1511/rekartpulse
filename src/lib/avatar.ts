import { supabase } from "@/integrations/supabase/client";

/** Uploads an avatar image to the private avatars bucket and returns its storage path. */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id ?? "shared";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return path;
}
