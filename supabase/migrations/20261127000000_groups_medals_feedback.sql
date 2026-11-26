-- =============================================================================
-- Running groups, medals and post-workout feedback.
-- Idempotent: safe to run more than once (the SQL editor has no transaction).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- groups / group_members
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 3 and 40),
  invite_code  text not null unique
                 default upper(substr(md5(gen_random_uuid()::text), 1, 8))
                 check (invite_code ~ '^[A-Z0-9]{6,12}$'),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);

-- Membership checks bypass RLS (SECURITY DEFINER) so policies don't recurse.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
     where m.group_id = target_group_id and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups g
     where g.id = target_group_id and g.owner_id = (select auth.uid())
  );
$$;

-- True when the signed-in user and `other_id` are in at least one group together.
create or replace function public.shares_group_with(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
     where mine.user_id = (select auth.uid()) and theirs.user_id = other_id
  );
$$;

revoke execute on function public.is_group_member(uuid) from public, anon;
revoke execute on function public.owns_group(uuid) from public, anon;
revoke execute on function public.shares_group_with(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.owns_group(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists groups_select_member on public.groups;
create policy groups_select_member on public.groups
  for select to authenticated using (public.is_group_member(id) or owner_id = (select auth.uid()));
drop policy if exists groups_insert_own on public.groups;
create policy groups_insert_own on public.groups
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists groups_update_owner on public.groups;
create policy groups_update_owner on public.groups
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists groups_delete_owner on public.groups;
create policy groups_delete_owner on public.groups
  for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists group_members_select_member on public.group_members;
create policy group_members_select_member on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
-- Direct inserts only for the owner joining their own new group; others join
-- through join_group() with the invite code.
drop policy if exists group_members_insert_owner on public.group_members;
create policy group_members_insert_owner on public.group_members
  for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'owner' and public.owns_group(group_id));
-- Leave a group, or the owner removes a member (the owner can't remove themself).
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role = 'member')
    or (public.owns_group(group_id) and user_id <> (select auth.uid()))
  );

grant select, insert, delete on public.groups to authenticated;
grant update (name) on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;

-- Creates a group and makes the caller its owner. Returns the group id.
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.groups (name, owner_id)
       values (btrim(p_name), (select auth.uid()))
    returning id into new_id;
  insert into public.group_members (group_id, user_id, role)
       values (new_id, (select auth.uid()), 'owner');
  return new_id;
end;
$$;

-- Joins a group by invite code. SECURITY DEFINER because non-members can't see
-- the group yet; it only ever adds the caller, and caps groups at 50 members.
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  select id into target from public.groups where invite_code = upper(btrim(p_code));
  if target is null then
    raise exception 'invite code not found' using errcode = 'P0002';
  end if;
  if (select count(*) from public.group_members where group_id = target) >= 50 then
    raise exception 'group is full' using errcode = '54000';
  end if;
  insert into public.group_members (group_id, user_id, role)
       values (target, caller, 'member')
  on conflict (group_id, user_id) do nothing;
  return target;
end;
$$;

revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;

-- My groups with member counts.
create or replace function public.list_my_groups()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', g.id,
           'name', g.name,
           'invite_code', g.invite_code,
           'owner_id', g.owner_id,
           'member_count', (select count(*) from public.group_members m where m.group_id = g.id),
           'created_at', g.created_at) order by g.created_at desc), '[]')
    from public.groups g
   where public.is_group_member(g.id);
$$;

-- Ranking of a group since a date: distance and runs per member. Private runs
-- never count, so every member sees the same ranking.
create or replace function public.group_leaderboard(p_group_id uuid, p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_json order by distance_m desc, runs desc, name), '[]')
    from (
      select p.full_name as name,
             coalesce(sum(r.distance_m), 0) as distance_m,
             count(r.id) as runs,
             jsonb_build_object(
               'author', public.author_json(p),
               'distance_m', coalesce(sum(r.distance_m), 0),
               'runs', count(r.id),
               'moving_time_s', coalesce(sum(r.moving_time_s), 0)) as row_json
        from public.group_members m
        join public.profiles p on p.id = m.user_id
        left join public.runs r
          on r.user_id = m.user_id
         and r.started_at >= p_since
         and r.visibility <> 'private'
       where m.group_id = p_group_id
         and public.is_group_member(p_group_id)
       group by p.id, p.full_name
    ) ranking;
$$;

-- Shared feed: members' runs (not private), newest first, keyset pagination.
create or replace function public.get_group_feed(
  p_group_id uuid,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by started_at desc, id desc), '[]')
    from (
      select r.started_at,
             r.id,
             public.run_summary_json(r)
               || jsonb_build_object(
                    'author', public.author_json(p),
                    'has_kudo', exists (
                      select 1 from public.kudos k
                       where k.run_id = r.id and k.user_id = (select auth.uid()))) as item
        from public.runs r
        join public.profiles p on p.id = r.user_id
       where public.is_group_member(p_group_id)
         and r.visibility <> 'private'
         and r.user_id in (select m.user_id from public.group_members m where m.group_id = p_group_id)
         and (p_before is null
              or (r.started_at, r.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')))
       order by r.started_at desc, r.id desc
       limit least(greatest(p_limit, 1), 50)
    ) feed;
$$;

revoke execute on function public.list_my_groups() from public, anon;
revoke execute on function public.group_leaderboard(uuid, timestamptz) from public, anon;
revoke execute on function public.get_group_feed(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.list_my_groups() to authenticated;
grant execute on function public.group_leaderboard(uuid, timestamptz) to authenticated;
grant execute on function public.get_group_feed(uuid, timestamptz, uuid, integer) to authenticated;

-- "Followers" runs are also visible to people who share a group with the runner,
-- so the group feed, run details, kudos and comments work between members.
create or replace function public.can_view_run_row(owner_id uuid, run_visibility public.run_visibility)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select owner_id = (select auth.uid())
      or run_visibility = 'public'
      or (
        run_visibility = 'followers'
        and (
          exists (
            select 1
              from public.follows f
             where f.follower_id = (select auth.uid())
               and f.following_id = owner_id
          )
          or public.shares_group_with(owner_id)
        )
      );
$$;

-- -----------------------------------------------------------------------------
-- user_achievements: medals unlocked (computed on the device, stored with date).
-- -----------------------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  achievement_id  text not null check (achievement_id ~ '^[a-z0-9_]{2,40}$'),
  unlocked_at     timestamptz not null default now(),
  run_id          uuid references public.runs (id) on delete set null,
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists user_achievements_select_own on public.user_achievements;
create policy user_achievements_select_own on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists user_achievements_insert_own on public.user_achievements;
create policy user_achievements_insert_own on public.user_achievements
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (run_id is null or public.owns_run(run_id))
  );

grant select, insert on public.user_achievements to authenticated;

-- -----------------------------------------------------------------------------
-- Post-workout check-in on generated workouts ("Como você se sentiu?").
-- -----------------------------------------------------------------------------
alter table public.generated_workouts
  add column if not exists feedback text check (feedback in ('helped', 'neutral', 'discomfort')),
  add column if not exists feedback_at timestamptz,
  add column if not exists run_id uuid references public.runs (id) on delete set null;

drop policy if exists generated_workouts_update_own on public.generated_workouts;
create policy generated_workouts_update_own on public.generated_workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (run_id is null or public.owns_run(run_id)));

grant update (feedback, feedback_at, run_id) on public.generated_workouts to authenticated;


-- Pain history: index for "last 90 days" lookups.
create index if not exists pain_logs_user_created_idx on public.pain_logs (user_id, created_at desc);
