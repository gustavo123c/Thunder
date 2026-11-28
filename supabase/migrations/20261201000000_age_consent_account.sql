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
