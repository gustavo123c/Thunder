import { supabase } from '@/services/supabase/client';

import { normalizeEmail } from '../credentials';

export type SignUpInput = {
  email: string;
  password: string;
  fullName?: string;
};

export type SignUpResult = {
  /** false when the project requires email confirmation before the first sign in. */
  hasSession: boolean;
};

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
}

export async function signUp({ email, password, fullName }: SignUpInput): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    // Read by the handle_new_user trigger to prefill profiles.full_name.
    options: { data: fullName ? { full_name: fullName.trim() } : {} },
  });
  if (error) throw error;
  return { hasSession: data.session !== null };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
