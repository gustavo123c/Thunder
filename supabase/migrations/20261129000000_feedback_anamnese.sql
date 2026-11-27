-- run_feedback: captures what the runner felt after a workout
create table if not exists public.run_feedback (
  id                   uuid primary key default gen_random_uuid(),
  run_id               uuid not null references public.runs(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  issues               text[] not null default '{}',
  pain_regions         jsonb,
  other_text           text check (char_length(other_text) <= 500),
  next_preference      text check (next_preference in ('lighter', 'same')),
  safety_alert         boolean not null default false,
  generated_workout_id uuid references public.generated_workouts(id),
  created_at           timestamptz not null default now()
);

alter table public.run_feedback enable row level security;

drop policy if exists run_feedback_select_own on public.run_feedback;
create policy run_feedback_select_own on public.run_feedback
  for select using (user_id = auth.uid());

drop policy if exists run_feedback_insert_own on public.run_feedback;
create policy run_feedback_insert_own on public.run_feedback
  for insert with check (user_id = auth.uid());

grant select, insert on public.run_feedback to authenticated;

-- health_anamnese: PAR-Q + health history (sensitive LGPD data, user-only access)
create table if not exists public.health_anamnese (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.profiles(id) on delete cascade,
  running_experience text check (running_experience in ('none','beginner','intermediate','advanced')),
  weekly_frequency   smallint check (weekly_frequency between 0 and 14),
  current_injuries   text[],
  past_injuries      text[],
  surgeries          text check (char_length(surgeries) <= 500),
  health_conditions  text[],
  medications        text check (char_length(medications) <= 500),
  par_q              jsonb not null default '{}',
  par_q_risk         boolean not null default false,
  consented_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.health_anamnese enable row level security;

drop policy if exists anamnese_select_own on public.health_anamnese;
create policy anamnese_select_own on public.health_anamnese
  for select using (user_id = auth.uid());

drop policy if exists anamnese_insert_own on public.health_anamnese;
create policy anamnese_insert_own on public.health_anamnese
  for insert with check (user_id = auth.uid());

drop policy if exists anamnese_update_own on public.health_anamnese;
create policy anamnese_update_own on public.health_anamnese
  for update using (user_id = auth.uid());

drop policy if exists anamnese_delete_own on public.health_anamnese;
create policy anamnese_delete_own on public.health_anamnese
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.health_anamnese to authenticated;

create trigger anamnese_set_updated_at
  before update on public.health_anamnese
  for each row execute function public.set_updated_at();
