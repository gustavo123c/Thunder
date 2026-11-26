-- =============================================================================
-- Explicit privileges for signed-in users.
--
-- Earlier migrations relied on Supabase's default privileges to expose tables to
-- the `authenticated` role. Newer projects may not grant those automatically,
-- which made every query fail with "permission denied". Privileges are now
-- explicit; RLS policies still decide which ROWS each user can touch.
-- `anon` gets nothing: the app requires sign-in for all data.
-- Idempotent: safe to run more than once.
-- =============================================================================

grant usage on schema public to authenticated;
grant usage on schema extensions to authenticated;

-- Read access (rows filtered by RLS).
grant select on public.profiles, public.runs, public.run_points, public.run_splits,
                public.follows, public.kudos, public.comments
  to authenticated;

-- Inserts. `runs` keeps its column-level INSERT grant (counters are trigger-only),
-- and `profiles` rows are created by the sign-up trigger only.
grant insert on public.run_points, public.run_splits, public.follows, public.kudos,
                public.comments
  to authenticated;

-- Deletes (RLS: only your own rows). Comments are soft-deleted via UPDATE.
grant delete on public.runs, public.follows, public.kudos to authenticated;

-- Column-level UPDATE grants from the initial migration are kept as they are:
-- profiles (editable fields), runs (title, description, visibility), comments (body, deleted_at).

-- Backfill: profiles for users who signed up before the trigger existed (or whose
-- profile insert failed). Harmless when every user already has one.
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
