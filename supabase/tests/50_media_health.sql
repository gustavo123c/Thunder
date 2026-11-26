-- run_media + storage policies, pain_logs, generated_workouts, list_activity, profiles.sex

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000003');
insert into public.follows values
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.runs (id, client_id, user_id, started_at, ended_at, elapsed_time_s, moving_time_s,
                         distance_m, visibility) values
  ('33333333-0000-0000-0000-000000000001', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-11-20 07:00Z', '2026-11-20 07:30Z', 1800, 1800, 5000, 'followers'),
  ('33333333-0000-0000-0000-000000000002', gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000001',
   '2026-11-24 07:00Z', '2026-11-24 07:30Z', 1800, 1700, 5200, 'private');

select pg_temp.check(
  (select count(*) from storage.buckets where id in ('avatars', 'workout-media')) = 2,
  'storage buckets are created');
select pg_temp.check(
  (select file_size_limit from storage.buckets where id = 'workout-media') = 52428800,
  'workout-media limited to 50 MB');

set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');

-- Profile sex
update public.profiles set sex = 'female' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check(
  (select sex from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'female',
  'sex can be set by the owner');
select pg_temp.expect_error(
  $$update public.profiles set sex = 'other' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, '23514');
select pg_temp.check(true, 'sex accepts only male/female');

-- Storage: upload into own run folder
insert into storage.objects (bucket_id, name) values
  ('workout-media', 'aaaaaaaa-0000-0000-0000-000000000001/33333333-0000-0000-0000-000000000001/a.jpg');
select pg_temp.check(true, 'owner uploads media to own run folder');
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name) values
    ('workout-media', 'aaaaaaaa-0000-0000-0000-000000000001/not-a-uuid/a.jpg')$$, '42501');
select pg_temp.check(true, 'malformed media path is rejected without crashing the policy');
insert into storage.objects (bucket_id, name) values
  ('avatars', 'aaaaaaaa-0000-0000-0000-000000000001/avatar-1.jpg');
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name) values
    ('avatars', 'bbbbbbbb-0000-0000-0000-000000000002/avatar-1.jpg')$$, '42501');
select pg_temp.check(true, 'cannot upload an avatar into someone else''s folder');

-- run_media rows
insert into public.run_media (run_id, user_id, storage_path, media_type, mime_type, size_bytes, width, height)
values ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001/33333333-0000-0000-0000-000000000001/a.jpg',
        'image', 'image/jpeg', 120000, 1080, 1350);
select pg_temp.expect_error(
  $$insert into public.run_media (run_id, user_id, storage_path, media_type, mime_type, size_bytes)
    values ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001/33333333-0000-0000-0000-000000000001/b.exe',
            'image', 'application/x-msdownload', 100)$$, '23514');
select pg_temp.check(true, 'unsupported media formats are rejected');
select pg_temp.expect_error(
  $$insert into public.run_media (run_id, user_id, storage_path, media_type, mime_type, size_bytes)
    values ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
            'aaaaaaaa-0000-0000-0000-000000000001/33333333-0000-0000-0000-000000000001/big.mp4',
            'video', 'video/mp4', 60000000)$$, '23514');
select pg_temp.check(true, 'videos over 50 MB are rejected');
select pg_temp.check(
  (select public.get_run_detail('33333333-0000-0000-0000-000000000001') -> 'media' -> 0 ->> 'type') = 'image',
  'run JSON lists its media');

-- Pain logs
insert into public.pain_logs (user_id, region, side, intensity)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'knee', 'left', 6);
select pg_temp.expect_error(
  $$insert into public.pain_logs (user_id, region, side, intensity)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'knee', 'left', 3)$$, '23505');
select pg_temp.check(true, 'only one open pain entry per region and side');
update public.pain_logs set resolved_at = now() where region = 'knee';
insert into public.pain_logs (user_id, region, side, intensity)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'knee', 'left', 3);
select pg_temp.check((select count(*) from public.pain_logs) = 2, 'a resolved pain can be logged again');
select pg_temp.expect_error(
  $$insert into public.pain_logs (user_id, region, intensity)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'elbowz', 5)$$, '23514');
select pg_temp.check(true, 'unknown body regions are rejected');

-- Generated workouts
insert into public.generated_workouts (user_id, generator, request, plan)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'rules', '{}', '{"title":"x"}');

-- Activity
select pg_temp.check(
  jsonb_array_length(public.list_activity('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-01')) = 2,
  'list_activity returns own runs, including private');

-- Follower (B)
select pg_temp.as_user('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) from public.run_media) = 1, 'followers see media of visible runs');
select pg_temp.check(
  (select count(*) from storage.objects where bucket_id = 'workout-media') = 1,
  'followers can read media files of visible runs');
select pg_temp.check(
  jsonb_array_length(public.list_activity('aaaaaaaa-0000-0000-0000-000000000001', '2026-11-01')) = 1,
  'list_activity hides private runs from others');
select pg_temp.check((select count(*) from public.pain_logs) = 0, 'pain logs are private');
select pg_temp.check((select count(*) from public.generated_workouts) = 0, 'generated workouts are private');
with deleted as (delete from storage.objects where bucket_id = 'workout-media' returning 1)
select pg_temp.check((select count(*) from deleted) = 0, 'others cannot delete your media files');
select pg_temp.expect_error(
  $$insert into storage.objects (bucket_id, name) values
    ('workout-media', 'bbbbbbbb-0000-0000-0000-000000000002/33333333-0000-0000-0000-000000000001/x.jpg')$$,
  '42501');
select pg_temp.check(true, 'cannot upload media to someone else''s run');

-- Stranger (C)
select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select count(*) from storage.objects where bucket_id = 'workout-media') = 0,
  'strangers cannot read media of followers-only runs');

-- Owner deletes the run: media rows cascade
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
delete from public.runs where id = '33333333-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) from public.run_media) = 0, 'deleting a run removes its media rows');
reset role;

-- Anatomical regions added for the muscle map
set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.pain_logs (user_id, region, side, intensity)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'forearm', 'right', 3),
       ('aaaaaaaa-0000-0000-0000-000000000001', 'trapezius', 'center', 6);
select pg_temp.check(
  (select count(*) from public.pain_logs where region in ('forearm', 'trapezius')) = 2,
  'new anatomical regions are accepted');
reset role;
