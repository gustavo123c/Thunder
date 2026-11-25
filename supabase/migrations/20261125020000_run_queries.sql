-- =============================================================================
-- Read RPCs for history and run detail. All SECURITY INVOKER: RLS decides what
-- the caller can see. Routes are returned as GeoJSON.
-- =============================================================================

-- Shared JSON shape of a run (used by history, detail and feed).
create function public.run_summary_json(r public.runs)
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
                  else extensions.st_asgeojson(r.route, 6)::jsonb end
  );
$$;

create function public.author_json(p public.profiles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url
  );
$$;

-- Keyset-paginated runs of one user, newest first.
create function public.list_user_runs(
  p_user_id uuid,
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
  select coalesce(jsonb_agg(public.run_summary_json(r) order by r.started_at desc, r.id desc), '[]')
    from (
      select *
        from public.runs r
       where r.user_id = p_user_id
         and (p_before is null or (r.started_at, r.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')))
       order by r.started_at desc, r.id desc
       limit least(greatest(p_limit, 1), 50)
    ) r;
$$;

-- Everything the post-run screen needs in one round trip; null when not visible.
create function public.get_run_detail(p_run_id uuid, p_history_limit integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select public.run_summary_json(r)
         || jsonb_build_object(
              'author', public.author_json(p),
              'has_kudo', exists (
                select 1 from public.kudos k
                 where k.run_id = r.id and k.user_id = (select auth.uid())),
              'splits', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'index', s.split_index,
                         'distance_m', s.distance_m,
                         'duration_s', s.duration_s,
                         'pace_s_per_km', s.pace_s_per_km,
                         'elevation_delta_m', s.elevation_delta_m) order by s.split_index)
                  from public.run_splits s where s.run_id = r.id), '[]'),
              -- Earlier runs of the same athlete, for "compared with your previous runs".
              'previous_runs', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', prev.id,
                         'started_at', prev.started_at,
                         'distance_m', prev.distance_m,
                         'moving_time_s', prev.moving_time_s,
                         'avg_pace_s_per_km', prev.avg_pace_s_per_km,
                         'best_pace_s_per_km', prev.best_pace_s_per_km) order by prev.started_at desc)
                  from (
                    select * from public.runs pr
                     where pr.user_id = r.user_id and pr.started_at < r.started_at
                     order by pr.started_at desc
                     limit least(greatest(p_history_limit, 0), 100)
                  ) prev), '[]')
            )
    from public.runs r
    join public.profiles p on p.id = r.user_id
   where r.id = p_run_id;
$$;

revoke execute on function public.list_user_runs(uuid, timestamptz, uuid, integer) from public, anon;
revoke execute on function public.get_run_detail(uuid, integer) from public, anon;
grant execute on function public.list_user_runs(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_run_detail(uuid, integer) to authenticated;
