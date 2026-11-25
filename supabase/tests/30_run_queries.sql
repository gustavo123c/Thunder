-- list_user_runs / get_run_detail

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');
update public.profiles set username = 'ana' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

-- Ana: 25 runs, one per day; the newest is private.
insert into public.runs (id, client_id, user_id, title, started_at, ended_at, elapsed_time_s,
                         moving_time_s, distance_m, avg_pace_s_per_km, visibility, route)
select ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
       gen_random_uuid(),
       'aaaaaaaa-0000-0000-0000-000000000001',
       'run ' || i,
       timestamptz '2026-11-01 09:00Z' + (i || ' days')::interval,
       timestamptz '2026-11-01 09:30Z' + (i || ' days')::interval,
       1800, 1750, 5000 + i * 10, 350 - i,
       case when i = 25 then 'private' else 'public' end::public.run_visibility,
       'SRID=4326;LINESTRING(-46.63 -23.55, -46.62 -23.54)'::extensions.geography
  from generate_series(1, 25) as i;

insert into public.run_splits (run_id, split_index, distance_m, duration_s, pace_s_per_km)
values ('00000000-0000-0000-0000-000000000020', 1, 1000, 330, 330),
       ('00000000-0000-0000-0000-000000000020', 0, 1000, 340, 340);

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

create temp table page1 as
  select public.list_user_runs('aaaaaaaa-0000-0000-0000-000000000001', null, null, 10) as body;
select pg_temp.check(jsonb_array_length((select body from page1)) = 10, 'first page has 10 runs');
select pg_temp.check(
  (select body -> 0 ->> 'title' from page1) = 'run 25', 'newest first, own private run included');
select pg_temp.check(
  (select body -> 0 -> 'route' ->> 'type' from page1) = 'LineString', 'route is GeoJSON');

create temp table page2 as
  select public.list_user_runs(
    'aaaaaaaa-0000-0000-0000-000000000001',
    (select (body -> 9 ->> 'started_at')::timestamptz from page1),
    (select (body -> 9 ->> 'id')::uuid from page1),
    10) as body;
select pg_temp.check((select body -> 0 ->> 'title' from page2) = 'run 15',
  'keyset cursor continues exactly after the last item');
select pg_temp.check(
  jsonb_array_length(public.list_user_runs('aaaaaaaa-0000-0000-0000-000000000001', null, null, 500)) = 25,
  'page size is capped (50) and returns all 25');

create temp table detail as
  select public.get_run_detail('00000000-0000-0000-0000-000000000020') as body;
select pg_temp.check((select body -> 'author' ->> 'username' from detail) = 'ana', 'detail includes author');
select pg_temp.check(
  (select body -> 'splits' -> 0 ->> 'index' from detail) = '0', 'splits are ordered');
select pg_temp.check(
  jsonb_array_length((select body -> 'previous_runs' from detail)) = 19,
  'previous runs are only the earlier ones');
select pg_temp.check(
  (select body -> 'previous_runs' -> 0 ->> 'id' from detail) = '00000000-0000-0000-0000-000000000019',
  'previous runs are newest first');
select pg_temp.check((select (body ->> 'has_kudo')::boolean from detail) = false, 'has_kudo flag');

-- Another user
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  jsonb_array_length(public.list_user_runs('aaaaaaaa-0000-0000-0000-000000000001', null, null, 50)) = 24,
  'other users do not see the private run');
select pg_temp.check(
  public.get_run_detail('00000000-0000-0000-0000-000000000025') is null,
  'detail of an invisible run is null');
reset role;
