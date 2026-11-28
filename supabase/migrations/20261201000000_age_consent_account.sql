-- -----------------------------------------------------------------------------
-- Minimum age 12 (LGPD art. 14): the acceptance records the birth date and, for
-- 12–17, the parent or legal guardian who agreed. NOT VALID: rows of earlier
-- terms versions (accepted before these columns existed) are left untouched.
-- -----------------------------------------------------------------------------
alter table public.terms_acceptances
  add column if not exists birth_date date,
  add column if not exists guardian_name text,
  add column if not exists guardian_email text;

alter table public.terms_acceptances drop constraint if exists terms_acceptances_age_check;
alter table public.terms_acceptances
  add constraint terms_acceptances_age_check check (
    birth_date is not null
    and birth_date <= (accepted_at::date - interval '12 years')
    and (
      birth_date <= (accepted_at::date - interval '18 years')
      or (
        guardian_name is not null
        and guardian_email is not null
        and char_length(guardian_name) between 3 and 120
        and guardian_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      )
    )
  ) not valid;

grant insert (birth_date, guardian_name, guardian_email) on public.terms_acceptances to authenticated;

-- -----------------------------------------------------------------------------
-- Health data consent is optional (LGPD art. 8º, §3º/art. 11, I) and revocable.
-- profiles.health_consent_at: null = no consent; the app then hides the pain map,
-- the health questionnaire and the post-run feedback.
-- -----------------------------------------------------------------------------
alter table public.terms_acceptances
  drop constraint if exists terms_acceptances_health_data_consent_check;

alter table public.profiles add column if not exists health_consent_at timestamptz;
grant update (health_consent_at) on public.profiles to authenticated;

drop policy if exists run_feedback_delete_own on public.run_feedback;
create policy run_feedback_delete_own on public.run_feedback
  for delete to authenticated using (user_id = (select auth.uid()));
grant delete on public.run_feedback to authenticated;
grant update (request) on public.generated_workouts to authenticated;

-- Revoking deletes the health data and strips pains from saved workout requests.
create or replace function public.revoke_health_consent()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  delete from public.pain_logs where user_id = uid;
  delete from public.health_anamnese where user_id = uid;
  delete from public.run_feedback where user_id = uid;
  update public.generated_workouts
    set feedback = null, feedback_at = null, request = request - 'pains' - 'discomfortRegions'
    where user_id = uid;
  update public.profiles set health_consent_at = null where id = uid;
end;
$$;

revoke execute on function public.revoke_health_consent() from public, anon;
grant execute on function public.revoke_health_consent() to authenticated;
