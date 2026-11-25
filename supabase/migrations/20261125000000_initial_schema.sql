-- =============================================================================
-- Thunder — initial schema
-- Units: meters, seconds, pace in seconds per km. Coordinates: WGS84 (SRID 4326).
-- =============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists citext with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.runner_level as enum ('beginner', 'intermediate');

create type public.runner_goal as enum (
  'complete_5k',
  'complete_10k',
  'improve_pace',
  'increase_endurance',
  'lose_weight'
);

create type public.run_visibility as enum ('public', 'followers', 'private');

-- -----------------------------------------------------------------------------
-- Shared trigger: updated_at
-- -----------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                         uuid primary key references auth.users (id) on delete cascade,
  username                   extensions.citext unique
                               check (username ~ '^[A-Za-z0-9_.]{3,30}$'),
  full_name                  text check (char_length(full_name) <= 80),
  avatar_url                 text,
  level                      public.runner_level,
  weight_kg                  numeric(5, 2) check (weight_kg between 20 and 300),
  height_cm                  smallint check (height_cm between 100 and 250),
  birth_date                 date check (birth_date > date '1900-01-01'),
  main_goal                  public.runner_goal,
  goal_target_pace_s_per_km  integer check (goal_target_pace_s_per_km between 120 and 1200),
  onboarded_at               timestamptz, -- null until onboarding is completed
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

comment on column public.profiles.onboarded_at is
  'Set when the user finishes onboarding (level, body metrics, goal). The app gates on it.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create an empty profile for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- runs
-- -----------------------------------------------------------------------------
create table public.runs (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null unique, -- generated on device; makes uploads idempotent
  user_id             uuid not null references public.profiles (id) on delete cascade,
  title               text not null default 'Corrida' check (char_length(title) between 1 and 100),
  description         text check (char_length(description) <= 2000),
  started_at          timestamptz not null,
  ended_at            timestamptz not null,
  elapsed_time_s      integer not null check (elapsed_time_s >= 0),
  moving_time_s       integer not null check (moving_time_s >= 0),
  distance_m          numeric(9, 2) not null check (distance_m >= 0),
  avg_pace_s_per_km   numeric(7, 2) check (avg_pace_s_per_km > 0),
  best_pace_s_per_km  numeric(7, 2) check (best_pace_s_per_km > 0),
  elevation_gain_m    numeric(7, 2) check (elevation_gain_m >= 0),
  calories_kcal       integer check (calories_kcal >= 0),
  route               extensions.geography(linestring, 4326), -- simplified polyline for maps/feed
  start_point         extensions.geography(point, 4326),
  visibility          public.run_visibility not null default 'followers',
  kudos_count         integer not null default 0 check (kudos_count >= 0),
  comments_count      integer not null default 0 check (comments_count >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint runs_time_order check (ended_at >= started_at),
  constraint runs_moving_le_elapsed check (moving_time_s <= elapsed_time_s)
);

create index runs_user_started_idx on public.runs (user_id, started_at desc, id desc);
create index runs_public_started_idx on public.runs (started_at desc, id desc)
  where visibility = 'public';
create index runs_start_point_gix on public.runs using gist (start_point);

create trigger runs_set_updated_at
  before update on public.runs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- run_points (raw GPS samples)
-- -----------------------------------------------------------------------------
create table public.run_points (
  id           bigint generated always as identity primary key,
  run_id       uuid not null references public.runs (id) on delete cascade,
  seq          integer not null check (seq >= 0),
  segment      smallint not null default 0 check (segment >= 0), -- +1 on each pause/resume
  recorded_at  timestamptz not null,
  location     extensions.geography(point, 4326) not null,
  altitude_m   real,
  accuracy_m   real check (accuracy_m >= 0),
  speed_mps    real check (speed_mps >= 0),

  constraint run_points_run_seq_key unique (run_id, seq)
);

-- -----------------------------------------------------------------------------
-- run_splits (per-km splits; the last one may be partial)
-- -----------------------------------------------------------------------------
create table public.run_splits (
  run_id             uuid not null references public.runs (id) on delete cascade,
  split_index        smallint not null check (split_index >= 0),
  distance_m         numeric(7, 2) not null check (distance_m > 0),
  duration_s         integer not null check (duration_s > 0),
  pace_s_per_km      numeric(7, 2) not null check (pace_s_per_km > 0),
  elevation_delta_m  numeric(6, 2),

  primary key (run_id, split_index)
);

-- -----------------------------------------------------------------------------
-- follows
-- -----------------------------------------------------------------------------
create table public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- -----------------------------------------------------------------------------
-- kudos ("Raio")
-- -----------------------------------------------------------------------------
create table public.kudos (
  run_id      uuid not null references public.runs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (run_id, user_id)
);

create index kudos_user_idx on public.kudos (user_id);

-- -----------------------------------------------------------------------------
-- comments (soft delete via deleted_at)
-- -----------------------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.runs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index comments_run_created_idx on public.comments (run_id, created_at)
  where deleted_at is null;

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Denormalized counters on runs
-- SECURITY DEFINER: the person reacting does not own the run, and users have
-- no UPDATE grant on the counter columns.
-- -----------------------------------------------------------------------------
create function public.sync_kudos_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.runs set kudos_count = kudos_count + 1 where id = new.run_id;
  elsif tg_op = 'DELETE' then
    update public.runs set kudos_count = greatest(kudos_count - 1, 0) where id = old.run_id;
  end if;
  return null;
end;
$$;

create trigger kudos_sync_count
  after insert or delete on public.kudos
  for each row execute function public.sync_kudos_count();

create function public.sync_comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := 0;
  target uuid;
begin
  if tg_op = 'INSERT' then
    target := new.run_id;
    delta := case when new.deleted_at is null then 1 else 0 end;
  elsif tg_op = 'DELETE' then
    target := old.run_id;
    delta := case when old.deleted_at is null then -1 else 0 end;
  else -- UPDATE: only soft-delete / restore changes the count
    target := new.run_id;
    if old.deleted_at is null and new.deleted_at is not null then
      delta := -1;
    elsif old.deleted_at is not null and new.deleted_at is null then
      delta := 1;
    end if;
  end if;

  if delta <> 0 then
    update public.runs
       set comments_count = greatest(comments_count + delta, 0)
     where id = target;
  end if;
  return null;
end;
$$;

create trigger comments_sync_count
  after insert or delete or update of deleted_at on public.comments
  for each row execute function public.sync_comments_count();

-- -----------------------------------------------------------------------------
-- Visibility helper
-- SECURITY DEFINER so child-table policies do not re-run runs' RLS per row.
-- -----------------------------------------------------------------------------
create function public.can_view_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.runs r
     where r.id = target_run_id
       and (
         r.user_id = (select auth.uid())
         or r.visibility = 'public'
         or (
           r.visibility = 'followers'
           and exists (
             select 1
               from public.follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = r.user_id
           )
         )
       )
  );
$$;

create function public.owns_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.runs r
     where r.id = target_run_id and r.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.can_view_run(uuid) from public, anon;
revoke execute on function public.owns_run(uuid) from public, anon;
grant execute on function public.can_view_run(uuid) to authenticated;
grant execute on function public.owns_run(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- Everything requires a signed-in user; anon has no access.
-- -----------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.runs       enable row level security;
alter table public.run_points enable row level security;
alter table public.run_splits enable row level security;
alter table public.follows    enable row level security;
alter table public.kudos      enable row level security;
alter table public.comments   enable row level security;

-- profiles: discoverable by any signed-in user; only the owner edits.
create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- runs
create policy runs_select_visible on public.runs
  for select to authenticated
  using (public.can_view_run(id));

create policy runs_insert_own on public.runs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy runs_update_own on public.runs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy runs_delete_own on public.runs
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- run_points / run_splits: readable with the run, writable by the run owner.
create policy run_points_select on public.run_points
  for select to authenticated using (public.can_view_run(run_id));
create policy run_points_insert_own on public.run_points
  for insert to authenticated with check (public.owns_run(run_id));

create policy run_splits_select on public.run_splits
  for select to authenticated using (public.can_view_run(run_id));
create policy run_splits_insert_own on public.run_splits
  for insert to authenticated with check (public.owns_run(run_id));

-- follows: the graph is visible; you only manage your own edges.
create policy follows_select on public.follows
  for select to authenticated using (true);
create policy follows_insert_own on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy follows_delete_own on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- kudos: only on runs you can see.
create policy kudos_select on public.kudos
  for select to authenticated using (public.can_view_run(run_id));
create policy kudos_insert_own on public.kudos
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_run(run_id));
create policy kudos_delete_own on public.kudos
  for delete to authenticated using (user_id = (select auth.uid()));

-- comments: only on runs you can see; authors edit / soft-delete their own.
create policy comments_select on public.comments
  for select to authenticated using (public.can_view_run(run_id));
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_run(run_id));
create policy comments_update_own on public.comments
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Column-level grants: users can only change editable fields.
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.runs, public.run_points, public.run_splits,
              public.follows, public.kudos, public.comments from anon;

revoke insert, update on public.profiles from authenticated;
grant update (username, full_name, avatar_url, level, weight_kg, height_cm, birth_date,
              main_goal, goal_target_pace_s_per_km, onboarded_at)
  on public.profiles to authenticated;

-- Counters (kudos_count, comments_count) are maintained by triggers only.
revoke insert, update on public.runs from authenticated;
grant insert (id, client_id, user_id, title, description, started_at, ended_at, elapsed_time_s,
              moving_time_s, distance_m, avg_pace_s_per_km, best_pace_s_per_km,
              elevation_gain_m, calories_kcal, route, start_point, visibility)
  on public.runs to authenticated;
grant update (title, description, visibility) on public.runs to authenticated;

revoke update on public.run_points, public.run_splits, public.follows, public.kudos
  from authenticated;

revoke update on public.comments from authenticated;
grant update (body, deleted_at) on public.comments to authenticated;
