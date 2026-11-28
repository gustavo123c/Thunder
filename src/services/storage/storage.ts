import { File } from 'expo-file-system';

import { supabase } from '@/services/supabase/client';

export const BUCKETS = {
  avatars: 'avatars',
  workoutMedia: 'workout-media',
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Reads a local file (picker/camera URI) into memory for upload. */
export async function readLocalFile(uri: string): Promise<ArrayBuffer> {
  return new File(uri).arrayBuffer();
}

export async function uploadBytes(
  bucket: Bucket,
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' });
  if (error) throw error;
}

export async function removeFiles(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}

/** Every file under `{userId}/` in both buckets (avatars: one level; run media: two). */
export async function listUserFiles(userId: string): Promise<Record<Bucket, string[]>> {
  const list = async (bucket: Bucket, folder: string) => {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    return data ?? [];
  };
  // Folders come back with a null id.
  const avatars = (await list(BUCKETS.avatars, userId))
    .filter((item) => item.id !== null)
    .map((item) => `${userId}/${item.name}`);
  const media: string[] = [];
  for (const runFolder of await list(BUCKETS.workoutMedia, userId)) {
    if (runFolder.id !== null) continue;
    const prefix = `${userId}/${runFolder.name}`;
    for (const file of await list(BUCKETS.workoutMedia, prefix)) {
      if (file.id !== null) media.push(`${prefix}/${file.name}`);
    }
  }
  return { [BUCKETS.avatars]: avatars, [BUCKETS.workoutMedia]: media };
}

export function publicUrl(bucket: Bucket, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Signed URLs for private files; missing/forbidden paths are simply left out. */
export async function signedUrls(
  bucket: Bucket,
  paths: string[],
  expiresInS = 60 * 60,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresInS);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return urls;
}
