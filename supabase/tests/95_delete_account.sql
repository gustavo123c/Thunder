-- In-app account deletion removes only the caller and everything that belongs to them.

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002');

insert into public.runs (id, client_id, user_id, started_at, ended_at, elapsed_time_s, moving_time_s,
                         distance_m, visibility) values
  ('33333333-0000-0000-0000-000000000001', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-11-20 07:00Z', '2026-11-20 07:30Z', 1800, 1800, 5000, 'public'),
  ('33333333-0000-0000-0000-000000000002', gen_random_uuid(), 'bbbbbbbb-0000-0000-0000-000000000002',
   '2026-11-20 07:00Z', '2026-11-20 07:30Z', 1800, 1800, 5000, 'public');
insert into public.follows values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.kudos (run_id, user_id) values
  ('33333333-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.pain_logs (user_id, region, side, intensity) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'knee', 'left', 6);
insert into public.terms_acceptances (user_id, terms_version, health_data_consent, age_statement, birth_date)
values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-12-01', true, true, '1990-01-01');

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.delete_my_account();
reset role;

select pg_temp.check(
  not exists (select 1 from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'the caller''s user and profile are deleted');
select pg_temp.check(
  not exists (select 1 from public.runs where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.pain_logs where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.follows where following_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.kudos where user_id = 'aaaaaaaa-0000-0000-0000-000000000001')
  and not exists (select 1 from public.terms_acceptances where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'runs, health data, social links and acceptances go with it');
select pg_temp.check(
  exists (select 1 from public.profiles where id = 'bbbbbbbb-0000-0000-0000-000000000002')
  and exists (select 1 from public.runs where id = '33333333-0000-0000-0000-000000000002'),
  'other users are untouched');

select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($$select public.delete_my_account()$$, '42501');
select pg_temp.check(true, 'anonymous callers cannot delete anything');
