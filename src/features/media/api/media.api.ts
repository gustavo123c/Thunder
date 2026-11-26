import { randomUUID } from 'expo-crypto';

import {
  avatarPath,
  MEDIA_LIMITS,
  type MediaError,
  type PickedMedia,
  resolveMimeType,
  runMediaPath,
  validateMedia,
} from '@/domain/media/media-rules';
import type { RunMediaItem } from '@/domain/types/run';
import {
  BUCKETS,
  publicUrl,
  readLocalFile,
  removeFiles,
  uploadBytes,
} from '@/services/storage/storage';
import { supabase } from '@/services/supabase/client';

export class MediaValidationError extends Error {
  constructor(readonly code: MediaError) {
    super(code);
    this.name = 'MediaValidationError';
  }
}

export type PickedMediaWithSize = PickedMedia & { width?: number; height?: number };

/** Uploads a new avatar (already cropped by the picker) and points the profile at it. */
export async function uploadAvatar(userId: string, asset: PickedMedia): Promise<string> {
  const mimeType = resolveMimeType(asset);
  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new MediaValidationError('unsupported_format');
  }
  const bytes = await readLocalFile(asset.uri);
  if (bytes.byteLength > MEDIA_LIMITS.avatarMaxBytes) throw new MediaValidationError('too_large');

  const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : (mimeType.split('/')[1] as string);
  const path = avatarPath(userId, Date.now(), extension);
  await uploadBytes(BUCKETS.avatars, path, bytes, mimeType);

  const url = publicUrl(BUCKETS.avatars, path);
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (error) {
    await removeFiles(BUCKETS.avatars, [path]).catch(() => undefined);
    throw error;
  }

  // Best effort: delete previous avatar files.
  const { data: files } = await supabase.storage.from(BUCKETS.avatars).list(userId);
  const old = (files ?? [])
    .map((file) => `${userId}/${file.name}`)
    .filter((filePath) => filePath !== path);
  await removeFiles(BUCKETS.avatars, old).catch(() => undefined);

  return url;
}

/** Uploads one photo/video to a run: file first, then the run_media row (rolled back on failure). */
export async function addRunMedia(
  userId: string,
  runId: string,
  asset: PickedMediaWithSize,
  existingCount: number,
): Promise<void> {
  const bytes = await readLocalFile(asset.uri);
  const result = validateMedia(asset, bytes.byteLength, existingCount);
  if (!result.ok) throw new MediaValidationError(result.error);

  const { kind, mimeType, extension } = result.value;
  const path = runMediaPath(userId, runId, randomUUID(), extension);
  await uploadBytes(BUCKETS.workoutMedia, path, bytes, mimeType);

  const { error } = await supabase.from('run_media').insert({
    run_id: runId,
    user_id: userId,
    storage_path: path,
    media_type: kind,
    mime_type: mimeType,
    size_bytes: bytes.byteLength,
    width: asset.width && asset.width > 0 ? Math.round(asset.width) : null,
    height: asset.height && asset.height > 0 ? Math.round(asset.height) : null,
    duration_s: kind === 'video' && asset.duration ? Math.round(asset.duration / 10) / 100 : null,
  });
  if (error) {
    await removeFiles(BUCKETS.workoutMedia, [path]).catch(() => undefined);
    throw error;
  }
}

export async function removeRunMedia(item: Pick<RunMediaItem, 'id' | 'path'>): Promise<void> {
  const { error } = await supabase.from('run_media').delete().eq('id', item.id);
  if (error) throw error;
  await removeFiles(BUCKETS.workoutMedia, [item.path]).catch((cause: unknown) =>
    console.warn('[media] file cleanup failed', cause),
  );
}
