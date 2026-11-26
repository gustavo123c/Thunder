-- Groups (create, join by code, ranking, shared feed, visibility), medals and
-- post-workout feedback.
-- Ana creates a group; Bia joins with the code; Caio is an outsider.
-- Bia has a public, a followers-only and a private run. Nobody follows anybody.

insert into auth.users (id, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"full_name":"Ana Souza"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '{"full_name":"Bia Lima"}'),
  ('cccccccc-0000-0000-0000-000000000003', '{"full_name":"Caio Rocha"}');

insert into public.runs (id, client_id, user_id, title, started_at, ended_at, elapsed_time_s,
                         moving_time_s, distance_m, visibility) values
  ('44444444-0000-0000-0000-000000000001', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia public', now() - interval '1 day', now() - interval '1 day' + interval '30 min', 1800, 1800, 5000, 'public'),
  ('44444444-0000-0000-0000-000000000002', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia followers', now() - interval '2 days', now() - interval '2 days' + interval '30 min', 1800, 1800, 3000, 'followers'),
  ('44444444-0000-0000-0000-000000000003', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'bia private', now() - interval '3 days', now() - interval '3 days' + interval '30 min', 1800, 1800, 10000, 'private'),
  ('44444444-0000-0000-0000-000000000004', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   'ana run', now() - interval '1 day', now() - interval '1 day' + interval '30 min', 1800, 1800, 4000, 'public');

set role authenticated;

-- ---------------------------------------------------------------- create group
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ids as select public.create_group('  Corre Galera  ') as group_id;
grant select on ids to authenticated;

select pg_temp.check(
  (select name from public.groups where id = (select group_id from ids)) = 'Corre Galera',
  'create_group trims the name and returns the id');
select pg_temp.check(
  (select role from public.group_members
    where group_id = (select group_id from ids)
      and user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'owner',
  'creator becomes the owner');
select pg_temp.check(
  (select invite_code ~ '^[A-Z0-9]{8}$' from public.groups where id = (select group_id from ids)),
  'invite code is generated');
select pg_temp.expect_error($$select public.create_group('ab')$$, '23514');
select pg_temp.check(true, 'group names need at least 3 characters');

-- Nobody can add other people directly.
select pg_temp.expect_error(
  $$insert into public.group_members (group_id, user_id, role)
    values ((select group_id from ids), 'cccccccc-0000-0000-0000-000000000003', 'member')$$, '42501');
select pg_temp.check(true, 'members cannot be inserted directly');

create temp table codes as select invite_code from public.groups where id = (select group_id from ids);
grant select on codes to authenticated;

-- ---------------------------------------------------------------- outsiders
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select count(*) from public.groups) = 0, 'outsiders cannot see the group');
select pg_temp.check(
  (select count(*) from public.group_members) = 0, 'outsiders cannot see the members');
select pg_temp.check(
  public.group_leaderboard((select group_id from ids), now() - interval '7 days') = '[]'::jsonb,
  'outsiders get an empty ranking');
select pg_temp.check(
  public.get_group_feed((select group_id from ids)) = '[]'::jsonb,
  'outsiders get an empty group feed');
select pg_temp.check(
  not exists (select 1 from public.runs where title = 'bia followers'),
  'followers-only runs stay hidden from outsiders');
select pg_temp.expect_error($$select public.join_group('NOPE0000')$$, 'P0002');
select pg_temp.check(true, 'unknown invite code is rejected');

-- ---------------------------------------------------------------- join by code
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  public.join_group(lower((select invite_code from codes))) = (select group_id from ids),
  'join_group accepts the code in any case');
select pg_temp.check(
  public.join_group((select invite_code from codes)) = (select group_id from ids),
  'joining twice is harmless');
select pg_temp.check(
  (select (public.list_my_groups() -> 0 ->> 'member_count')::int) = 2,
  'list_my_groups shows the member count');

-- ---------------------------------------------------------------- ranking & feed
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select array_agg((x ->> 'distance_m')::numeric) from jsonb_array_elements(
     public.group_leaderboard((select group_id from ids), now() - interval '7 days')) x)
    = array[8000, 4000]::numeric[],
  'ranking sums non-private runs, best first');
select pg_temp.check(
  (select jsonb_agg(x ->> 'title') from jsonb_array_elements(
     public.get_group_feed((select group_id from ids))) x)
    = '["ana run", "bia public", "bia followers"]'::jsonb,
  'group feed has members'' runs without private ones');
select pg_temp.check(
  exists (select 1 from public.runs where title = 'bia followers'),
  'followers-only runs are visible to fellow group members');
select pg_temp.check(
  not exists (select 1 from public.runs where title = 'bia private'),
  'private runs stay private inside groups');

-- ---------------------------------------------------------------- leave / remove
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.groups set name = 'Hacked' where id = (select group_id from ids);
select pg_temp.check(
  (select name from public.groups where id = (select group_id from ids)) = 'Corre Galera',
  'only the owner renames the group');
delete from public.group_members
 where group_id = (select group_id from ids) and user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) from public.group_members where group_id = (select group_id from ids)) = 2,
  'members cannot remove the owner');
delete from public.group_members
 where group_id = (select group_id from ids) and user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.check(
  (select count(*) from public.group_members where group_id = (select group_id from ids)) = 1,
  'the owner removes a member');
select pg_temp.check(
  not exists (select 1 from public.runs where title = 'bia followers'),
  'after leaving, followers-only runs are hidden again');

-- ---------------------------------------------------------------- medals
insert into public.user_achievements (user_id, achievement_id, run_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'first_run', '44444444-0000-0000-0000-000000000004');
select pg_temp.check(
  (select count(*) from public.user_achievements) = 1, 'own medal is stored');
select pg_temp.expect_error(
  $$insert into public.user_achievements (user_id, achievement_id)
    values ('bbbbbbbb-0000-0000-0000-000000000002', 'first_run')$$, '42501');
select pg_temp.check(true, 'cannot grant medals to someone else');
select pg_temp.expect_error(
  $$insert into public.user_achievements (user_id, achievement_id, run_id)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'first_5k', '44444444-0000-0000-0000-000000000001')$$,
  '42501');
select pg_temp.check(true, 'cannot attach a medal to someone else''s run');
select pg_temp.expect_error(
  $$insert into public.user_achievements (user_id, achievement_id)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'first_run')$$, '23505');
select pg_temp.check(true, 'each medal is unlocked once');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) from public.user_achievements) = 0, 'medals are private to their owner');

-- ---------------------------------------------------------------- workout feedback
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.generated_workouts (id, user_id, generator, request, plan)
values ('55555555-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'rules',
        '{"pains":[{"region":"knee","side":"left","intensity":4}]}', '{"title":"x","blocks":[]}');
update public.generated_workouts
   set feedback = 'helped', feedback_at = now(), run_id = '44444444-0000-0000-0000-000000000004'
 where id = '55555555-0000-0000-0000-000000000001';
select pg_temp.check(
  (select feedback from public.generated_workouts) = 'helped', 'owner records workout feedback');
select pg_temp.expect_error(
  $$update public.generated_workouts set feedback = 'great'
     where id = '55555555-0000-0000-0000-000000000001'$$, '23514');
select pg_temp.check(true, 'feedback accepts only the three answers');
select pg_temp.expect_error(
  $$update public.generated_workouts set plan = '{}'
     where id = '55555555-0000-0000-0000-000000000001'$$, '42501');
select pg_temp.check(true, 'the generated plan itself cannot be edited');

select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
update public.generated_workouts set feedback = 'discomfort'
 where id = '55555555-0000-0000-0000-000000000001';
reset role;
select pg_temp.check(
  (select feedback from public.generated_workouts) = 'helped',
  'nobody else can answer the check-in');
