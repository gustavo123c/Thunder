import { listUserFiles, removeFiles } from '@/services/storage/storage';
import { supabase } from '@/services/supabase/client';

import { deleteAccount } from '../api/delete-account.api';

const calls: string[] = [];

jest.mock('@/services/supabase/client', () => ({
  supabase: { rpc: jest.fn(), auth: { signOut: jest.fn() } },
}));
jest.mock('@/services/storage/storage', () => ({
  BUCKETS: { avatars: 'avatars', workoutMedia: 'workout-media' },
  listUserFiles: jest.fn(),
  removeFiles: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  calls.length = 0;
  jest.mocked(listUserFiles).mockResolvedValue({
    avatars: ['u1/a.jpg'],
    'workout-media': Array.from({ length: 150 }, (_, i) => `u1/r1/${i}.jpg`),
  });
  jest.mocked(removeFiles).mockImplementation(async (bucket, paths) => {
    calls.push(`remove ${bucket} ${paths.length}`);
  });
  jest.mocked(supabase.rpc).mockImplementation((async (fn: string) => {
    calls.push(`rpc ${fn}`);
    return { error: null };
  }) as never);
  jest.mocked(supabase.auth.signOut).mockImplementation((async () => {
    calls.push('signOut');
    return { error: null };
  }) as never);
});

it('removes files in chunks, then the account, then the local session', async () => {
  await deleteAccount('u1');
  expect(calls).toEqual([
    'remove avatars 1',
    'remove workout-media 100',
    'remove workout-media 50',
    'rpc delete_my_account',
    'signOut',
  ]);
  expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('keeps the account when the files cannot be removed', async () => {
  jest.mocked(removeFiles).mockRejectedValueOnce(new Error('offline'));
  await expect(deleteAccount('u1')).rejects.toThrow('offline');
  expect(supabase.rpc).not.toHaveBeenCalled();
});
