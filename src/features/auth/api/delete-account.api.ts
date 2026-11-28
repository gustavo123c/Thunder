import { BUCKETS, listUserFiles, removeFiles } from '@/services/storage/storage';
import { supabase } from '@/services/supabase/client';

const CHUNK = 100;

/**
 * Deletes the signed-in account: storage files first (Supabase only allows that
 * through the Storage API), then the user and every row that cascades from it.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const files = await listUserFiles(userId);
  for (const bucket of [BUCKETS.avatars, BUCKETS.workoutMedia]) {
    const paths = files[bucket];
    for (let i = 0; i < paths.length; i += CHUNK) {
      await removeFiles(bucket, paths.slice(i, i + CHUNK));
    }
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  // The user no longer exists on the server: just drop the local session.
  await supabase.auth.signOut({ scope: 'local' });
}
