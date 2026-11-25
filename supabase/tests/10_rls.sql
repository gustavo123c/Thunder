-- RLS, column grants and counter triggers.
-- A follows B; C is a stranger. B owns one public, one followers-only and one private run.

insert into auth.users (id, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '{"full_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '{}'),
  ('cccccccc-0000-0000-0000-000000000003', '{}');

select pg_temp.check((select count(*) from public.profiles) = 3, 'profiles are created on sign up');
select pg_temp.check(
  (select full_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Ana',
  'full_name comes from sign-up metadata');

insert into public.follows values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');

insert into public.runs (id, client_id, user_id, title, started_at, ended_at, elapsed_time_s,
                         moving_time_s, distance_m, visibility) values
  ('11111111-0000-0000-0000-000000000001', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'pub', now() - interval '1 hour', now(), 3600, 3500, 10000, 'public'),
  ('11111111-0000-0000-0000-000000000002', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'fol', now() - interval '1 hour', now(), 3600, 3500, 10000, 'followers'),
  ('11111111-0000-0000-0000-000000000003', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   'priv', now() - interval '1 hour', now(), 3600, 3500, 10000, 'private');

set role authenticated;

-- Follower (A)
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select string_agg(title, ',' order by title) from public.runs) = 'fol,pub',
  'a follower sees public and followers-only runs');

insert into public.kudos (run_id, user_id)
  values ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.comments (run_id, user_id, body)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Bora!');

select pg_temp.expect_error(
  $$insert into public.kudos (run_id, user_id) values
    ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '42501');
select pg_temp.check(true, 'no kudos on a run you cannot see');

select pg_temp.expect_error(
  $$insert into public.kudos (run_id, user_id) values
    ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$, '42501');
select pg_temp.check(true, 'no kudos on behalf of someone else');

select pg_temp.expect_error(
  $$insert into public.follows values
    ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001')$$, '23514');
select pg_temp.check(true, 'cannot follow yourself');

select pg_temp.expect_error(
  $$insert into public.run_points (run_id, seq, recorded_at, location) values
    ('11111111-0000-0000-0000-000000000001', 0, now(), 'SRID=4326;POINT(0 0)')$$, '42501');
select pg_temp.check(true, 'cannot add points to someone else''s run');

with updated as (
  update public.runs set title = 'hack'
   where user_id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1)
select pg_temp.check((select count(*) from updated) = 0, 'cannot edit someone else''s run');

with updated as (
  update public.profiles set full_name = 'x'
   where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1)
select pg_temp.check((select count(*) from updated) = 0, 'cannot edit someone else''s profile');

select pg_temp.expect_error(
  $$insert into public.runs (client_id, user_id, started_at, ended_at, elapsed_time_s,
      moving_time_s, distance_m, kudos_count)
    values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001', now(), now(), 0, 0, 0, 99)$$,
  '42501');
select pg_temp.check(true, 'cannot forge counters on insert');

-- Stranger (C)
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select string_agg(title, ',' order by title) from public.runs) = 'pub',
  'a stranger sees only public runs');
select pg_temp.check((select count(*) from public.kudos) = 0,
  'kudos on followers-only runs are hidden from strangers');

-- Owner (B)
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select string_agg(title, ',' order by title) from public.runs) = 'fol,priv,pub',
  'the owner sees all own runs');
select pg_temp.expect_error(
  $$update public.runs set kudos_count = 500
     where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'$$, '42501');
select pg_temp.check(true, 'even the owner cannot edit counters');

-- Soft-delete a comment as its author
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
update public.comments set deleted_at = now()
 where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

reset role;
select pg_temp.check(
  (select kudos_count from public.runs where title = 'fol') = 1, 'kudos counter increments');
select pg_temp.check(
  (select comments_count from public.runs where title = 'pub') = 0,
  'comments counter decrements on soft delete');

set role anon;
select pg_temp.expect_error('select count(*) from public.runs', '42501');
select pg_temp.check(true, 'anonymous users cannot read runs');
reset role;
