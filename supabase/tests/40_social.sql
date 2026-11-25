-- get_feed, list_comments, search_profiles, get_profile_stats, kudos/comments/follows writes.
-- Ana follows Bia. Caio is a stranger. Bia has public, followers and private runs; Caio a public one.

insert into auth.users (id, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"full_name":"Ana Souza"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '{"full_name":"Bia Lima"}'),
  ('cccccccc-0000-0000-0000-000000000003', '{"full_name":"Caio_Rocha"}');
update public.profiles set username = 'ana', onboarded_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.profiles set username = 'bia.lima', onboarded_at = now() where id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.profiles set username = 'caio', onboarded_at = now() where id = 'cccccccc-0000-0000-0000-000000000003';

insert into public.follows values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into public.runs (id, client_id, user_id, title, started_at, ended_at, elapsed_time_s,
                         moving_time_s, distance_m, visibility) values
  ('22222222-0000-0000-0000-000000000001', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   'ana own', '2026-11-25 07:00Z', '2026-11-25 07:30Z', 1800, 1800, 5000, 'private'),
  ('22222222-0000-0000-0000-000000000002', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia public', '2026-11-24 07:00Z', '2026-11-24 07:30Z', 1800, 1800, 5000, 'public'),
  ('22222222-0000-0000-0000-000000000003', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia followers', '2026-11-23 07:00Z', '2026-11-23 07:30Z', 1800, 1800, 5000, 'followers'),
  ('22222222-0000-0000-0000-000000000004', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia private', '2026-11-22 07:00Z', '2026-11-22 07:30Z', 1800, 1800, 5000, 'private'),
  ('22222222-0000-0000-0000-000000000005', gen_random_uuid(), 'cccccccc-0000-0000-0000-000000000003',
   'caio public', '2026-11-25 08:00Z', '2026-11-25 08:30Z', 1800, 1800, 5000, 'public');

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

select pg_temp.check(
  (select string_agg(item ->> 'title', ',') from jsonb_array_elements(public.get_feed()) item)
    = 'ana own,bia public,bia followers',
  'feed: own runs + visible runs of followed athletes, newest first, no strangers');
select pg_temp.check(
  (select public.get_feed() -> 1 -> 'author' ->> 'username') = 'bia.lima', 'feed items include author');
select pg_temp.check(
  jsonb_array_length(public.get_feed('2026-11-24 07:00Z', '22222222-0000-0000-0000-000000000002', 20)) = 1,
  'feed keyset pagination');

-- Kudos (direct table writes, RLS-guarded)
insert into public.kudos (run_id, user_id)
  values ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select (public.get_feed() -> 1 ->> 'has_kudo')::boolean) and
  (select (public.get_feed() -> 1 ->> 'kudos_count')::int) = 1,
  'kudo is reflected in has_kudo and kudos_count');
select pg_temp.expect_error(
  $$insert into public.kudos (run_id, user_id)
    values ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '23505');
select pg_temp.check(true, 'double kudo is rejected');
delete from public.kudos where run_id = '22222222-0000-0000-0000-000000000002';
select pg_temp.check(
  (select (public.get_feed() -> 1 ->> 'kudos_count')::int) = 0, 'removing a kudo decrements the count');

-- Comments
insert into public.comments (run_id, user_id, body) values
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Que ritmo!'),
  ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'apagar');
update public.comments set deleted_at = now() where body = 'apagar';
select pg_temp.check(
  jsonb_array_length(public.list_comments('22222222-0000-0000-0000-000000000002')) = 1
  and public.list_comments('22222222-0000-0000-0000-000000000002') -> 0 -> 'author' ->> 'username' = 'ana',
  'list_comments hides deleted comments and includes author');
select pg_temp.expect_error(
  $$insert into public.comments (run_id, user_id, body)
    values ('22222222-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '   ')$$,
  '23514');
select pg_temp.check(true, 'blank comments are rejected');

-- Search
select pg_temp.check(
  (select string_agg(item ->> 'username', ',') from jsonb_array_elements(public.search_profiles('LIMA')) item)
    = 'bia.lima',
  'search matches full name, case-insensitive');
select pg_temp.check(
  (select (public.search_profiles('bia') -> 0 ->> 'is_following')::boolean), 'search shows follow state');
select pg_temp.check(
  jsonb_array_length(public.search_profiles('ana')) = 0, 'search excludes yourself');
select pg_temp.check(
  (select string_agg(item ->> 'username', ',') from jsonb_array_elements(public.search_profiles('_')) item) is null,
  'one-character queries return nothing');
select pg_temp.check(
  (select string_agg(item ->> 'username', ',') from jsonb_array_elements(public.search_profiles('o_r')) item) = 'caio',
  'underscore is matched literally, not as a wildcard');

-- Profile stats
select pg_temp.check(
  public.get_profile_stats('bbbbbbbb-0000-0000-0000-000000000002')
    @> '{"followers_count": 1, "following_count": 0, "is_following": true, "runs_count": 2}',
  'stats count only runs visible to the viewer');
select pg_temp.check(
  public.get_profile_stats('bbbbbbbb-0000-0000-0000-000000000002') -> 'profile' ->> 'full_name' = 'Bia Lima',
  'stats include the profile');

-- Follow / unfollow Caio, then his public run shows up in the feed
insert into public.follows values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select public.get_feed() -> 0 ->> 'title') = 'caio public', 'following adds runs to the feed');
delete from public.follows where following_id = 'cccccccc-0000-0000-0000-000000000003';
select pg_temp.expect_error(
  $$insert into public.follows values
    ('bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000003')$$, '42501');
select pg_temp.check(true, 'cannot create follows for someone else');

-- Stranger's view
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  public.list_comments('22222222-0000-0000-0000-000000000003') = '[]'::jsonb,
  'comments of an invisible run are not listed');
reset role;
