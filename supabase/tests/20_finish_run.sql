-- finish_run: atomic, idempotent run upload.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('cccccccc-0000-0000-0000-000000000003');

create temp table payload as select $json${
  "client_id": "5f8a1e2c-1111-4222-8333-944455556666",
  "title": "  Corrida matinal ",
  "visibility": "public",
  "started_at": "2026-11-25T09:00:00.000Z",
  "ended_at": "2026-11-25T09:22:00.000Z",
  "elapsed_time_s": 1320, "moving_time_s": 1198, "distance_m": 3594.2,
  "avg_pace_s_per_km": 333.33, "best_pace_s_per_km": 332.1,
  "elevation_gain_m": 12.5, "calories_kcal": 214,
  "route": [[-46.63, -23.55], [-46.63, -23.54], [-46.62, -23.54]],
  "points": [
    {"seq": 0, "segment": 0, "t": 1795597200000, "lat": -23.55, "lon": -46.63, "alt": 760, "acc": 5, "speed": 3},
    {"seq": 1, "segment": 0, "t": 1795597201000, "lat": -23.54997, "lon": -46.63, "alt": null, "acc": null, "speed": null},
    {"seq": 2, "segment": 1, "t": 1795597330000, "lat": -23.54, "lon": -46.62, "alt": 761, "acc": 4, "speed": 3.1}
  ],
  "splits": [
    {"split_index": 0, "distance_m": 1000, "duration_s": 333, "pace_s_per_km": 333.1, "elevation_delta_m": 2},
    {"split_index": 1, "distance_m": 594.2, "duration_s": 198, "pace_s_per_km": 333.2, "elevation_delta_m": null}
  ]
}$json$::jsonb as body;
grant select on payload to authenticated, anon;

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

create temp table first_call as select public.finish_run((select body from payload)) as id;
select pg_temp.check((select id from first_call) is not null, 'finish_run returns the new run id');
select pg_temp.check(
  public.finish_run((select body from payload)) = (select id from first_call)
  and (select count(*) from public.runs) = 1,
  'retrying returns the same run without duplicating it');

select pg_temp.check(
  (select title from public.runs) = 'Corrida matinal', 'title is trimmed');
select pg_temp.check(
  (select extensions.st_npoints(route::extensions.geometry) from public.runs) = 3,
  'route polyline is stored');
select pg_temp.check(
  (select round(extensions.st_y(start_point::extensions.geometry)::numeric, 2) from public.runs) = -23.55,
  'start point is the first route vertex');
select pg_temp.check((select count(*) from public.run_points) = 3, 'all points are stored');
select pg_temp.check(
  (select count(*) from public.run_points where altitude_m is null) = 1, 'null altitude is kept');
select pg_temp.check((select count(*) from public.run_splits) = 2, 'splits are stored');

select pg_temp.expect_error(
  $$select public.finish_run('{"client_id":"5f8a1e2c-1111-4222-8333-000000000000",
      "started_at":"2026-11-25T09:00:00Z","ended_at":"2026-11-25T08:00:00Z",
      "elapsed_time_s":10,"moving_time_s":5,"distance_m":10,"points":[],"splits":[]}'::jsonb)$$,
  '23514');
select pg_temp.check((select count(*) from public.runs) = 1, 'an invalid payload stores nothing');

select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from public.runs) = 1, 'public run is visible to others');
select pg_temp.expect_error('select public.finish_run((select body from payload))', '23505');
select pg_temp.check(true, 'another user cannot reuse a client_id');

reset role;
set role anon;
select pg_temp.expect_error('select public.finish_run((select body from payload))', '42501');
select pg_temp.check(true, 'anonymous users cannot upload');
reset role;
