/**
 * Rules for photos/videos attached to runs and avatars. Limits mirror the
 * run_media CHECK constraints and the Storage bucket settings — keep them in sync.
 */

export const MEDIA_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024, // 10 MB
  videoMaxBytes: 50 * 1024 * 1024, // 50 MB (Supabase free plan upload limit)
  avatarMaxBytes: 5 * 1024 * 1024, // 5 MB
  maxItemsPerRun: 10,
  videoMaxDurationS: 120,
} as const;

export type MediaKind = 'image' | 'video';

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/** Picker output, structurally (expo-image-picker's ImagePickerAsset). */
export type PickedMedia = {
  uri: string;
  type?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  duration?: number | null; // ms (expo-image-picker)
};

export type MediaError = 'unsupported_format' | 'too_large' | 'too_long' | 'too_many';

export type ValidMedia = { kind: MediaKind; mimeType: string; extension: string };

function extensionOf(value: string | null | undefined): string | null {
  const match = /\.([a-z0-9]+)(?:\?.*)?$/i.exec(value ?? '');
  return match ? (match[1] as string).toLowerCase() : null;
}

/** Resolves a supported MIME type from the picker's mimeType, file name or URI. */
export function resolveMimeType(media: PickedMedia): string | null {
  const declared = media.mimeType?.toLowerCase();
  if (declared && EXTENSION_BY_MIME[declared]) return declared;
  const ext = extensionOf(media.fileName) ?? extensionOf(media.uri);
  return ext ? (MIME_BY_EXTENSION[ext] ?? null) : null;
}

export function validateMedia(
  media: PickedMedia,
  sizeBytes: number,
  existingCount = 0,
): { ok: true; value: ValidMedia } | { ok: false; error: MediaError } {
  if (existingCount >= MEDIA_LIMITS.maxItemsPerRun) return { ok: false, error: 'too_many' };

  const mimeType = resolveMimeType(media);
  if (!mimeType) return { ok: false, error: 'unsupported_format' };

  const kind: MediaKind = mimeType.startsWith('video/') ? 'video' : 'image';
  const maxBytes = kind === 'video' ? MEDIA_LIMITS.videoMaxBytes : MEDIA_LIMITS.imageMaxBytes;
  if (sizeBytes > maxBytes) return { ok: false, error: 'too_large' };

  if (kind === 'video' && (media.duration ?? 0) / 1000 > MEDIA_LIMITS.videoMaxDurationS) {
    return { ok: false, error: 'too_long' };
  }

  return { ok: true, value: { kind, mimeType, extension: EXTENSION_BY_MIME[mimeType] as string } };
}

/** Storage path for run media: "{userId}/{runId}/{fileId}.{ext}" (required by the policies). */
export function runMediaPath(userId: string, runId: string, fileId: string, extension: string) {
  return `${userId}/${runId}/${fileId}.${extension}`;
}

/** Avatar path; the timestamp busts image caches when the photo changes. */
export function avatarPath(userId: string, timestamp: number, extension: string) {
  return `${userId}/avatar-${timestamp}.${extension}`;
}
