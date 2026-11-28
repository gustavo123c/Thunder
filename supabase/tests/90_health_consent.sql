-- Optional health consent: grant on the profile, revoke deletes the health data.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

insert into public.runs (id, client_id, user_id, started_at, ended_at, elapsed_time_s, moving_time_s,
                         distance_m, visibility) values
  ('33333333-0000-0000-0000-000000000001', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-11-20 07:00Z', '2026-11-20 07:30Z', 1800, 1800, 5000, 'private');
insert into public.pain_logs (user_id, region, side, intensity) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'knee', 'left', 6),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'knee', 'left', 6);
insert into public.health_anamnese (user_id, consented_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', now());
insert into public.run_feedback (run_id, user_id, issues) values
  ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '{pain}');
insert into public.generated_workouts (user_id, generator, request, plan, feedback) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'rules',
   '{"type": "easy", "pains": [{"region": "knee"}], "discomfortRegions": ["knee"]}', '{}', 'discomfort');

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

update public.profiles set health_consent_at = now() where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check(
  (select health_consent_at from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') is not null,
  'user grants health consent on the profile');

select public.revoke_health_consent();
reset role;
select pg_temp.check(
  (select health_consent_at from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') is null,
  'revoking clears the consent');
select pg_temp.check(
  not exists (select 1 from public.pain_logs where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.health_anamnese where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.run_feedback where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'revoking deletes pains, questionnaire and post-run feedback');
select pg_temp.check(
  (select request from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
    = '{"type": "easy"}'::jsonb
  and (select feedback from public.generated_workouts where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') is null,
  'saved workouts keep the plan but lose pains and check-ins');
select pg_temp.check(
  exists (select 1 from public.pain_logs where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'other users'' health data is untouched');

select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($$select public.revoke_health_consent()$$, '42501');
select pg_temp.check(true, 'anonymous callers cannot revoke');
