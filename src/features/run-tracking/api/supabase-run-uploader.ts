import { supabase } from '@/services/supabase/client';
import type { Json } from '@/services/supabase/database.types';

import type { RunUploader } from './run-upload.api';

/** Calls the idempotent `finish_run` RPC; returns the server run id. */
export const supabaseRunUploader: RunUploader = async (payload) => {
  const { data, error } = await supabase.rpc('finish_run', { payload: payload as unknown as Json });
  if (error) throw error;
  return data;
};
