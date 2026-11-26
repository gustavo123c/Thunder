do $$ begin if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
create schema extensions; create schema auth;
grant usage on schema public, extensions, auth to anon, authenticated;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Strict mode: NO default table privileges for anon/authenticated (new Supabase
-- projects may not expose tables automatically). Migrations must grant explicitly.

-- Minimal Supabase Storage schema (buckets, objects, foldername) for policy tests.
create schema storage;
grant usage on schema storage to anon, authenticated;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
