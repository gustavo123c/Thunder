import {
  avatarPath,
  MEDIA_LIMITS,
  resolveMimeType,
  runMediaPath,
  validateMedia,
} from '../media-rules';

const MB = 1024 * 1024;

describe('resolveMimeType', () => {
  it('prefers the declared MIME type', () => {
    expect(resolveMimeType({ uri: 'file:///x', mimeType: 'image/png' })).toBe('image/png');
  });

  it('falls back to the file name or URI extension', () => {
    expect(resolveMimeType({ uri: 'file:///a/IMG_1.HEIC' })).toBe('image/heic');
    expect(resolveMimeType({ uri: 'ph://x', fileName: 'clip.MOV' })).toBe('video/quicktime');
  });

  it('rejects unknown formats', () => {
    expect(resolveMimeType({ uri: 'file:///doc.pdf' })).toBeNull();
    expect(resolveMimeType({ uri: 'file:///x', mimeType: 'image/gif' })).toBeNull();
  });
});

describe('validateMedia', () => {
  it('accepts photos up to 10 MB and videos up to 50 MB', () => {
    expect(validateMedia({ uri: 'a.jpg' }, 9 * MB)).toEqual({
      ok: true,
      value: { kind: 'image', mimeType: 'image/jpeg', extension: 'jpg' },
    });
    expect(validateMedia({ uri: 'a.mp4', duration: 30_000 }, 49 * MB)).toMatchObject({
      ok: true,
      value: { kind: 'video', extension: 'mp4' },
    });
  });

  it('rejects files that are too large', () => {
    expect(validateMedia({ uri: 'a.jpg' }, 11 * MB)).toEqual({ ok: false, error: 'too_large' });
    expect(validateMedia({ uri: 'a.mov' }, 51 * MB)).toEqual({ ok: false, error: 'too_large' });
  });

  it('rejects videos longer than 2 minutes', () => {
    expect(validateMedia({ uri: 'a.mp4', duration: 121_000 }, MB)).toEqual({
      ok: false,
      error: 'too_long',
    });
  });

  it('limits the number of items per run', () => {
    expect(validateMedia({ uri: 'a.jpg' }, MB, MEDIA_LIMITS.maxItemsPerRun)).toEqual({
      ok: false,
      error: 'too_many',
    });
  });
});

describe('storage paths', () => {
  it('follows the folder convention required by the storage policies', () => {
    expect(runMediaPath('u1', 'r1', 'f1', 'jpg')).toBe('u1/r1/f1.jpg');
    expect(avatarPath('u1', 123, 'jpg')).toBe('u1/avatar-123.jpg');
  });
});
