-- =============================================================================
-- Social: feed, comments, people search and profile stats.
-- All SECURITY INVOKER — RLS on runs/kudos/comments/follows still applies.
-- Kudos, comments and follows are written directly to their tables (RLS-guarded).
-- =============================================================================

-- Own runs + runs of people I follow, newest first (keyset pagination).
create function public.get_feed(
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
       where (
               r.user_id = (select auth.uid())
               or r.user_id in (
                 select f.following_id from public.follows f
                  where f.follower_id = (select auth.uid()))
             )
         and (p_before is null
              or (r.started_at, r.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')))
       order by r.started_at desc, r.id desc
       limit least(greatest(p_limit, 1), 50)
    ) feed;
$$;

-- Visible, non-deleted comments of a run, oldest first.
create function public.list_comments(p_run_id uuid, p_limit integer default 200)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by created_at, id), '[]')
    from (
      select c.created_at,
             c.id,
             jsonb_build_object(
               'id', c.id,
               'run_id', c.run_id,
               'body', c.body,
               'created_at', c.created_at,
               'author', public.author_json(p)) as item
        from public.comments c
        join public.profiles p on p.id = c.user_id
       where c.run_id = p_run_id and c.deleted_at is null
       order by c.created_at, c.id
       limit least(greatest(p_limit, 1), 500)
    ) comments;
$$;

-- Username / name search (case- and wildcard-safe), excluding yourself.
create function public.search_profiles(p_query text, p_limit integer default 20)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select '%' || replace(replace(replace(btrim(coalesce(p_query, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           char_length(btrim(coalesce(p_query, ''))) as query_length
  )
  select coalesce(jsonb_agg(item order by rank, username), '[]')
    from (
      select p.username::text as username,
             case when p.username::text ilike (select btrim(p_query)) then 0 else 1 end as rank,
             public.author_json(p) || jsonb_build_object(
               'is_following', exists (
                 select 1 from public.follows f
                  where f.follower_id = (select auth.uid()) and f.following_id = p.id)) as item
        from public.profiles p, params
       where params.query_length >= 2
         and p.id <> (select auth.uid())
         and p.onboarded_at is not null
         and (p.username::text ilike params.pattern or p.full_name ilike params.pattern)
       order by rank, p.username
       limit least(greatest(p_limit, 1), 50)
    ) results;
$$;

-- Public counters for a profile page. Run totals only include runs the caller can see.
create function public.get_profile_stats(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', (select public.author_json(p) from public.profiles p where p.id = p_user_id),
    'followers_count', (select count(*) from public.follows f where f.following_id = p_user_id),
    'following_count', (select count(*) from public.follows f where f.follower_id = p_user_id),
    'is_following', exists (
      select 1 from public.follows f
       where f.follower_id = (select auth.uid()) and f.following_id = p_user_id),
    'runs_count', (select count(*) from public.runs r where r.user_id = p_user_id),
    'total_distance_m', (select coalesce(sum(r.distance_m), 0) from public.runs r where r.user_id = p_user_id)
  );
$$;

revoke execute on function public.get_feed(timestamptz, uuid, integer) from public, anon;
revoke execute on function public.list_comments(uuid, integer) from public, anon;
revoke execute on function public.search_profiles(text, integer) from public, anon;
revoke execute on function public.get_profile_stats(uuid) from public, anon;
grant execute on function public.get_feed(timestamptz, uuid, integer) to authenticated;
grant execute on function public.list_comments(uuid, integer) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
grant execute on function public.get_profile_stats(uuid) to authenticated;

-- Feed query support: "runs of people I follow, newest first".
create index if not exists follows_follower_idx on public.follows (follower_id, following_id);
