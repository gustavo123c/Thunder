do $$ begin if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create schema extensions; create schema auth;
grant usage on schema public, extensions, auth to anon, authenticated;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Strict mode: NO default table privileges for anon/authenticated (new Supabase
-- projects may not expose tables automatically). Migrations must grant explicitly.
