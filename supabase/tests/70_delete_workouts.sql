-- Deleting saved workouts (one and all), linked run feedback and runs survive.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

insert into public.runs (id, client_id, user_id, started_at, ended_at, elapsed_time_s, moving_time_s,
                         distance_m, visibility) values
  ('33333333-0000-0000-0000-000000000001', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-11-20 07:00Z', '2026-11-20 07:30Z', 1800, 1800, 5000, 'private');

insert into public.generated_workouts (id, user_id, generator, request, plan, run_id) values
  ('44444444-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'rules', '{}', '{}',
   '33333333-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'rules', '{}', '{}', null),
  ('44444444-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'rules', '{}', '{}', null),
  ('44444444-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000002', 'rules', '{}', '{}', null);

insert into public.run_feedback (id, run_id, user_id, issues, next_preference, generated_workout_id) values
  ('55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', '{breath}', 'lighter', '44444444-0000-0000-0000-000000000002');

set role authenticated;

-- Another user can't delete A's workouts (RLS hides them: 0 rows deleted).
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
delete from public.generated_workouts where id = '44444444-0000-0000-0000-000000000001';
delete from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select pg_temp.check(
  (select count(*) from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 3,
  'another user cannot delete someone else''s workouts');
set role authenticated;

-- The owner deletes a workout that a run feedback points to: the feedback stays, unlinked.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
delete from public.generated_workouts where id = '44444444-0000-0000-0000-000000000002';
reset role;
select pg_temp.check(
  not exists (select 1 from public.generated_workouts where id = '44444444-0000-0000-0000-000000000002'),
  'owner deletes a workout linked to a run feedback');
select pg_temp.check(
  (select generated_workout_id from public.run_feedback
     where id = '55555555-0000-0000-0000-000000000001') is null,
  'the run feedback stays, without the workout link');
set role authenticated;

-- "Apagar todos": only the caller's rows go; the run done with a workout stays.
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
delete from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select pg_temp.check(
  (select count(*) from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0,
  'delete all removes every workout of the owner');
select pg_temp.check(
  (select count(*) from public.generated_workouts where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 1,
  'delete all leaves other users'' workouts');
select pg_temp.check(
  exists (select 1 from public.runs where id = '33333333-0000-0000-0000-000000000001'),
  'the run done with a deleted workout stays');
