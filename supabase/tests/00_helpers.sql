-- Test helpers (session-local). Loaded before every test file by scripts/test-db.sh.

create or replace function pg_temp.as_user(user_id text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', user_id, false);
end;
$$;

-- Runs `stmt` and fails unless it raises the given SQLSTATE.
create or replace function pg_temp.expect_error(stmt text, expected_state text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'no error raised';
exception when others then
  if sqlstate <> expected_state then
    raise exception 'expected SQLSTATE % but got % (%) for: %', expected_state, sqlstate, sqlerrm, stmt;
  end if;
end;
$$;

create or replace function pg_temp.check(ok boolean, label text)
returns void language plpgsql as $$
begin
  if ok is not true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;
