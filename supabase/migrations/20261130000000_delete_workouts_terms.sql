-- -----------------------------------------------------------------------------
-- Deleting saved workouts: a post-run feedback keeps existing (it describes the
-- run), it just loses the link to the adapted workout that was generated from it.
-- Without this, deleting such a workout failed with a foreign key violation.
-- -----------------------------------------------------------------------------
alter table public.run_feedback
  drop constraint if exists run_feedback_generated_workout_id_fkey;
alter table public.run_feedback
  add constraint run_feedback_generated_workout_id_fkey
  foreign key (generated_workout_id) references public.generated_workouts (id) on delete set null;

-- -----------------------------------------------------------------------------
-- terms_acceptances: proof that a user accepted a version of the Terms of Use.
-- One row per user and version; rows are never edited or deleted by the user
-- (they go away with the account). A new version in the app asks again.
-- -----------------------------------------------------------------------------
create table if not exists public.terms_acceptances (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  terms_version        text not null check (char_length(terms_version) between 1 and 40),
  -- Separate, highlighted consent for health data (LGPD art. 11, I).
  health_data_consent  boolean not null check (health_data_consent),
  -- "I am 18 or older, or my legal guardian read and agreed" (LGPD art. 14).
  age_statement        boolean not null check (age_statement),
  accepted_at          timestamptz not null default now(),
  unique (user_id, terms_version)
);

alter table public.terms_acceptances enable row level security;

drop policy if exists terms_acceptances_select_own on public.terms_acceptances;
create policy terms_acceptances_select_own on public.terms_acceptances
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists terms_acceptances_insert_own on public.terms_acceptances;
create policy terms_acceptances_insert_own on public.terms_acceptances
  for insert to authenticated with check (user_id = (select auth.uid()));

grant select, insert (user_id, terms_version, health_data_consent, age_statement)
  on public.terms_acceptances to authenticated;
