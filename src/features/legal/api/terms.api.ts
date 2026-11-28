import { supabase } from '@/services/supabase/client';

import { TERMS_VERSION } from '../terms-content';

export type TermsAcceptance = { version: string; acceptedAt: string };

/** The user's acceptance of the current terms version, or null if not accepted yet. */
export async function fetchTermsAcceptance(userId: string): Promise<TermsAcceptance | null> {
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('terms_version, accepted_at')
    .eq('user_id', userId)
    .eq('terms_version', TERMS_VERSION)
    .maybeSingle();
  if (error) throw error;
  return data ? { version: data.terms_version, acceptedAt: data.accepted_at } : null;
}

export type AcceptTermsInput = {
  /** ISO date (YYYY-MM-DD); the database refuses anyone under 12. */
  birthDate: string;
  /** Required between 12 and 17. */
  guardian: { name: string; email: string } | null;
};

export async function acceptTerms(userId: string, input: AcceptTermsInput): Promise<void> {
  const { error } = await supabase.from('terms_acceptances').insert({
    user_id: userId,
    terms_version: TERMS_VERSION,
    health_data_consent: true,
    age_statement: true,
    birth_date: input.birthDate,
    guardian_name: input.guardian?.name.trim() ?? null,
    guardian_email: input.guardian?.email.trim() ?? null,
  });
  // Already accepted (e.g. a retry after a lost response): nothing left to do.
  if (error && error.code !== '23505') throw error;
}
