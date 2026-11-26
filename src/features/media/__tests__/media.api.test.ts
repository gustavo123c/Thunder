import { addRunMedia, MediaValidationError, removeRunMedia, uploadAvatar } from '../api/media.api';
import { describeMediaError } from '../media-errors';

const mockStorage = {
  readLocalFile: jest.fn(),
  uploadBytes: jest.fn(),
  removeFiles: jest.fn(),
  publicUrl: jest.fn((_bucket: string, path: string) => `https://cdn.test/${path}`),
};
jest.mock('@/services/storage/storage', () => ({
  BUCKETS: { avatars: 'avatars', workoutMedia: 'workout-media' },
  readLocalFile: (...args: unknown[]) => mockStorage.readLocalFile(...args),
  uploadBytes: (...args: unknown[]) => mockStorage.uploadBytes(...args),
  removeFiles: (...args: unknown[]) => mockStorage.removeFiles(...args),
  publicUrl: (...args: [string, string]) => mockStorage.publicUrl(...args),
}));

const mockDb = { insert: jest.fn(), update: jest.fn(), delete: jest.fn(), list: jest.fn() };
jest.mock('@/services/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (row: unknown) => mockDb.insert(row),
      update: (row: unknown) => ({ eq: () => mockDb.update(row) }),
      delete: () => ({ eq: (_c: string, id: string) => mockDb.delete(id) }),
    }),
    storage: { from: () => ({ list: (folder: string) => mockDb.list(folder) }) },
  },
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'file-1' }));

const MB = 1024 * 1024;
const bytes = (size: number) => new ArrayBuffer(size);

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.uploadBytes.mockResolvedValue(undefined);
  mockStorage.removeFiles.mockResolvedValue(undefined);
  mockDb.insert.mockResolvedValue({ error: null });
  mockDb.update.mockResolvedValue({ error: null });
  mockDb.delete.mockResolvedValue({ error: null });
  mockDb.list.mockResolvedValue({ data: [{ name: 'avatar-1.jpg' }, { name: 'avatar-999.jpg' }] });
});

describe('addRunMedia', () => {
  it('uploads the file to the run folder, then records it', async () => {
    mockStorage.readLocalFile.mockResolvedValue(bytes(2 * MB));
    await addRunMedia('u1', 'r1', { uri: 'file:///a.jpg', width: 1080, height: 1350 }, 0);

    expect(mockStorage.uploadBytes).toHaveBeenCalledWith(
      'workout-media',
      'u1/r1/file-1.jpg',
      expect.any(ArrayBuffer),
      'image/jpeg',
    );
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: 'r1',
        storage_path: 'u1/r1/file-1.jpg',
        media_type: 'image',
        size_bytes: 2 * MB,
        width: 1080,
      }),
    );
  });

  it('stores video duration in seconds', async () => {
    mockStorage.readLocalFile.mockResolvedValue(bytes(5 * MB));
    await addRunMedia('u1', 'r1', { uri: 'file:///c.mov', duration: 12_345 }, 0);
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        media_type: 'video',
        mime_type: 'video/quicktime',
        duration_s: 12.35,
      }),
    );
  });

  it('rejects oversized files before uploading', async () => {
    mockStorage.readLocalFile.mockResolvedValue(bytes(60 * MB));
    const promise = addRunMedia('u1', 'r1', { uri: 'file:///b.mp4' }, 0);
    await expect(promise).rejects.toBeInstanceOf(MediaValidationError);
    await expect(promise).rejects.toMatchObject({ code: 'too_large' });
    expect(mockStorage.uploadBytes).not.toHaveBeenCalled();
  });

  it('removes the uploaded file when the database rejects the row', async () => {
    mockStorage.readLocalFile.mockResolvedValue(bytes(MB));
    mockDb.insert.mockResolvedValue({ error: new Error('limit reached') });
    await expect(addRunMedia('u1', 'r1', { uri: 'file:///a.png' }, 0)).rejects.toThrow(
      'limit reached',
    );
    expect(mockStorage.removeFiles).toHaveBeenCalledWith('workout-media', ['u1/r1/file-1.png']);
  });
});

describe('removeRunMedia', () => {
  it('deletes the row and then the file', async () => {
    await removeRunMedia({ id: 'm1', path: 'u1/r1/x.jpg' });
    expect(mockDb.delete).toHaveBeenCalledWith('m1');
    expect(mockStorage.removeFiles).toHaveBeenCalledWith('workout-media', ['u1/r1/x.jpg']);
  });
});

describe('uploadAvatar', () => {
  it('uploads, updates the profile and cleans previous avatars', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(999);
    mockStorage.readLocalFile.mockResolvedValue(bytes(MB));

    const url = await uploadAvatar('u1', { uri: 'file:///me.jpg' });

    expect(url).toBe('https://cdn.test/u1/avatar-999.jpg');
    expect(mockDb.update).toHaveBeenCalledWith({ avatar_url: url });
    expect(mockStorage.removeFiles).toHaveBeenCalledWith('avatars', ['u1/avatar-1.jpg']);
  });

  it('rejects videos and oversized images', async () => {
    await expect(uploadAvatar('u1', { uri: 'file:///me.mp4' })).rejects.toMatchObject({
      code: 'unsupported_format',
    });
    mockStorage.readLocalFile.mockResolvedValue(bytes(6 * MB));
    await expect(uploadAvatar('u1', { uri: 'file:///me.jpg' })).rejects.toMatchObject({
      code: 'too_large',
    });
  });
});

describe('describeMediaError', () => {
  it('explains each validation error in Portuguese', () => {
    expect(describeMediaError(new MediaValidationError('too_large'))).toMatch(/até 10 MB.*50 MB/);
    expect(describeMediaError(new MediaValidationError('too_many'))).toMatch(/até 10 fotos/);
    expect(describeMediaError(new Error('network'))).toMatch(/conexão/);
  });
});
