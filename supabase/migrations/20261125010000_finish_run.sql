-- =============================================================================
-- finish_run: atomic, idempotent upload of a recorded run.
-- SECURITY INVOKER: all RLS policies and column grants still apply.
-- =============================================================================

create function public.finish_run(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id   uuid := auth.uid();
  v_client_id uuid := (payload ->> 'client_id')::uuid;
  v_run_id    uuid;
  v_route     extensions.geography;
  v_start     extensions.geography;
begin
  if v_user_id is null then
    raise exception 'finish_run requires an authenticated user' using errcode = '28000';
  end if;
  if v_client_id is null then
    raise exception 'client_id is required' using errcode = '22023';
  end if;

  -- Idempotency: a retried upload returns the run created the first time.
  select r.id into v_run_id
    from public.runs r
   where r.client_id = v_client_id and r.user_id = v_user_id;
  if found then
    return v_run_id;
  end if;

  if jsonb_array_length(coalesce(payload -> 'route', '[]'::jsonb)) >= 2 then
    select extensions.st_makeline(
             array_agg(
               extensions.st_setsrid(
                 extensions.st_makepoint((p ->> 0)::float8, (p ->> 1)::float8), 4326)
               order by ord))::extensions.geography
      into v_route
      from jsonb_array_elements(payload -> 'route') with ordinality as r(p, ord);
  end if;

  if jsonb_array_length(coalesce(payload -> 'route', '[]'::jsonb)) >= 1 then
    select extensions.st_setsrid(
             extensions.st_makepoint((p ->> 0)::float8, (p ->> 1)::float8), 4326
           )::extensions.geography
      into v_start
      from jsonb_array_elements(payload -> 'route') with ordinality as r(p, ord)
     where ord = 1;
  end if;

  begin
    insert into public.runs (
      client_id, user_id, title, started_at, ended_at, elapsed_time_s, moving_time_s,
      distance_m, avg_pace_s_per_km, best_pace_s_per_km, elevation_gain_m, calories_kcal,
      route, start_point, visibility
    ) values (
      v_client_id,
      v_user_id,
      coalesce(nullif(btrim(payload ->> 'title'), ''), 'Corrida'),
      (payload ->> 'started_at')::timestamptz,
      (payload ->> 'ended_at')::timestamptz,
      (payload ->> 'elapsed_time_s')::integer,
      (payload ->> 'moving_time_s')::integer,
      (payload ->> 'distance_m')::numeric,
      (payload ->> 'avg_pace_s_per_km')::numeric,
      (payload ->> 'best_pace_s_per_km')::numeric,
      (payload ->> 'elevation_gain_m')::numeric,
      (payload ->> 'calories_kcal')::integer,
      v_route,
      v_start,
      coalesce((payload ->> 'visibility')::public.run_visibility, 'followers')
    )
    returning id into v_run_id;
  exception when unique_violation then
    -- Two concurrent retries: the other one won.
    select r.id into v_run_id
      from public.runs r
     where r.client_id = v_client_id and r.user_id = v_user_id;
    if v_run_id is null then
      raise;
    end if;
    return v_run_id;
  end;

  insert into public.run_points (
    run_id, seq, segment, recorded_at, location, altitude_m, accuracy_m, speed_mps
  )
  select v_run_id,
         p.seq,
         p.segment,
         to_timestamp(p.t / 1000.0),
         extensions.st_setsrid(extensions.st_makepoint(p.lon, p.lat), 4326)::extensions.geography,
         p.alt,
         p.acc,
         p.speed
    from jsonb_to_recordset(coalesce(payload -> 'points', '[]'::jsonb))
           as p(seq integer, segment smallint, t float8, lat float8, lon float8,
                alt real, acc real, speed real);

  insert into public.run_splits (
    run_id, split_index, distance_m, duration_s, pace_s_per_km, elevation_delta_m
  )
  select v_run_id, s.split_index, s.distance_m, s.duration_s, s.pace_s_per_km, s.elevation_delta_m
    from jsonb_to_recordset(coalesce(payload -> 'splits', '[]'::jsonb))
           as s(split_index smallint, distance_m numeric, duration_s integer,
                pace_s_per_km numeric, elevation_delta_m numeric);

  return v_run_id;
end;
$$;

revoke execute on function public.finish_run(jsonb) from public, anon;
grant execute on function public.finish_run(jsonb) to authenticated;
