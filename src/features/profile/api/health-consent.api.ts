import { supabase } from '@/services/supabase/client';

export async function grantHealthConsent(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ health_consent_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/** Clears the consent and deletes pains, the questionnaire and post-run feedback. */
export async function revokeHealthConsent(): Promise<void> {
  const { error } = await supabase.rpc('revoke_health_consent');
  if (error) throw error;
}
