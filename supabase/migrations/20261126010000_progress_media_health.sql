-- =============================================================================
-- v2: activity stats, run media (photos/videos), avatars, pain logs (body map)
-- and saved personalized workouts.
-- Reuses existing tables: `runs` = workouts, `comments` = run comments.
-- Idempotent: safe to run again if a previous run stopped halfway.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profile: sex, used to pick the body-map model (male/female silhouette).
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists sex text check (sex in ('male', 'female'));

grant update (sex) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- run_media: photos and videos attached to a run (files live in Storage).
-- -----------------------------------------------------------------------------
create table if not exists public.run_media (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.runs (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  storage_path  text not null unique,
  media_type    text not null check (media_type in ('image', 'video')),
  mime_type     text not null check (mime_type in (
                  'image/jpeg', 'image/png', 'image/heic', 'image/webp',
                  'video/mp4', 'video/quicktime')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 52428800),
  width         integer check (width > 0),
  height        integer check (height > 0),
  duration_s    numeric(7, 2) check (duration_s >= 0),
  created_at    timestamptz not null default now(),

  -- path convention: {user_id}/{run_id}/{file}
  constraint run_media_path_matches check (
    storage_path like user_id::text || '/' || run_id::text || '/%'
  )
);

create index if not exists run_media_run_idx on public.run_media (run_id, created_at);

alter table public.run_media enable row level security;

drop policy if exists run_media_select on public.run_media;
create policy run_media_select on public.run_media
  for select to authenticated using (public.can_view_run(run_id));
drop policy if exists run_media_insert_own on public.run_media;
create policy run_media_insert_own on public.run_media
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_run(run_id));
drop policy if exists run_media_delete_own on public.run_media;
create policy run_media_delete_own on public.run_media
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.run_media to authenticated;

-- Max 10 media items per run.
create or replace function public.enforce_run_media_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.run_media m where m.run_id = new.run_id) >= 10 then
    raise exception 'A run can have at most 10 photos/videos' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists run_media_limit on public.run_media;
create trigger run_media_limit
  before insert on public.run_media
  for each row execute function public.enforce_run_media_limit();

-- -----------------------------------------------------------------------------
-- pain_logs: pain/discomfort marked on the body map. Health data: owner only.
-- -----------------------------------------------------------------------------
create table if not exists public.pain_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  region       text not null check (region in (
                 'neck', 'shoulder', 'upper_back', 'chest', 'elbow', 'wrist',
                 'lower_back', 'abdomen', 'hip', 'glute', 'groin',
                 'quadriceps', 'hamstring', 'knee', 'shin', 'calf',
                 'ankle', 'achilles', 'foot')),
  side         text not null default 'center' check (side in ('left', 'right', 'center')),
  intensity    smallint not null check (intensity between 1 and 10),
  notes        text check (char_length(notes) <= 280),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

-- One open entry per region/side.
create unique index if not exists pain_logs_open_unique on public.pain_logs (user_id, region, side)
  where resolved_at is null;

alter table public.pain_logs enable row level security;

drop policy if exists pain_logs_select_own on public.pain_logs;
create policy pain_logs_select_own on public.pain_logs
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists pain_logs_insert_own on public.pain_logs;
create policy pain_logs_insert_own on public.pain_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists pain_logs_update_own on public.pain_logs;
create policy pain_logs_update_own on public.pain_logs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists pain_logs_delete_own on public.pain_logs;
create policy pain_logs_delete_own on public.pain_logs
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.pain_logs to authenticated;
grant update (intensity, notes, resolved_at) on public.pain_logs to authenticated;

-- -----------------------------------------------------------------------------
-- generated_workouts: personalized workouts the user generated (rules now,
-- AI later). Owner only.
-- -----------------------------------------------------------------------------
create table if not exists public.generated_workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  generator   text not null check (generator in ('rules', 'ai')),
  request     jsonb not null,
  plan        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists generated_workouts_user_idx on public.generated_workouts (user_id, created_at desc);

alter table public.generated_workouts enable row level security;

drop policy if exists generated_workouts_select_own on public.generated_workouts;
create policy generated_workouts_select_own on public.generated_workouts
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists generated_workouts_insert_own on public.generated_workouts;
create policy generated_workouts_insert_own on public.generated_workouts
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists generated_workouts_delete_own on public.generated_workouts;
create policy generated_workouts_delete_own on public.generated_workouts
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.generated_workouts to authenticated;

-- -----------------------------------------------------------------------------
-- Activity list for streaks and the progress dashboard. Raw runs (grouped into
-- local days/weeks on the device, which knows the user's time zone).
-- -----------------------------------------------------------------------------
create or replace function public.list_activity(p_user_id uuid, p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'started_at', r.started_at,
           'distance_m', r.distance_m,
           'moving_time_s', r.moving_time_s,
           'avg_pace_s_per_km', r.avg_pace_s_per_km) order by r.started_at), '[]')
    from (
      select * from public.runs r
       where r.user_id = p_user_id and r.started_at >= p_since
       order by r.started_at desc
       limit 3000
    ) r;
$$;

revoke execute on function public.list_activity(uuid, timestamptz) from public, anon;
grant execute on function public.list_activity(uuid, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- run_summary_json now also lists the run's media (used by feed and detail).
-- Media rows are filtered by RLS like the run itself.
-- -----------------------------------------------------------------------------
create or replace function public.run_summary_json(r public.runs)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'title', r.title,
    'description', r.description,
    'started_at', r.started_at,
    'ended_at', r.ended_at,
    'elapsed_time_s', r.elapsed_time_s,
    'moving_time_s', r.moving_time_s,
    'distance_m', r.distance_m,
    'avg_pace_s_per_km', r.avg_pace_s_per_km,
    'best_pace_s_per_km', r.best_pace_s_per_km,
    'elevation_gain_m', r.elevation_gain_m,
    'calories_kcal', r.calories_kcal,
    'visibility', r.visibility,
    'kudos_count', r.kudos_count,
    'comments_count', r.comments_count,
    'route', case when r.route is null then null
                  else extensions.st_asgeojson(r.route, 6)::jsonb end,
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id,
               'path', m.storage_path,
               'type', m.media_type,
               'width', m.width,
               'height', m.height,
               'duration_s', m.duration_s) order by m.created_at)
        from public.run_media m where m.run_id = r.id), '[]')
  );
$$;

-- -----------------------------------------------------------------------------
-- Storage buckets and policies.
--   avatars:        public read; users write only inside "{their id}/".
--   workout-media:  private; readable when the run is visible to the caller;
--                   path "{user_id}/{run_id}/{file}", written only by the run owner.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('workout-media', 'workout-media', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Safe uuid parse for path segments (a malformed path must not raise in a policy).
create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.try_uuid(text) to authenticated;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists workout_media_select_visible on storage.objects;
create policy workout_media_select_visible on storage.objects
  for select to authenticated
  using (
    bucket_id = 'workout-media'
    and public.can_view_run(public.try_uuid((storage.foldername(name))[2]))
  );
drop policy if exists workout_media_insert_own on storage.objects;
create policy workout_media_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'workout-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.owns_run(public.try_uuid((storage.foldername(name))[2]))
  );
drop policy if exists workout_media_delete_own on storage.objects;
create policy workout_media_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'workout-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
