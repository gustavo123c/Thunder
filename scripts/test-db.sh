#!/usr/bin/env bash
# Runs the SQL tests in supabase/tests against a throwaway database.
#
# Needs a Postgres server with PostGIS. Connection via the usual PG* env vars, e.g.
#   PGHOST=localhost PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres npm run test:db
# (54322 is the database port of `supabase start`).
#
# Each test file runs in a fresh database: Supabase stub (auth schema, roles) →
# all migrations → helpers → the test file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="thunder_test_$$"
PSQL=(psql -X -q -t -A -v ON_ERROR_STOP=1)

cleanup() { "${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

passed=0
for test_file in "$ROOT"/supabase/tests/[1-9]*.sql; do
  cleanup
  "${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null

  migration_args=()
  for migration in "$ROOT"/supabase/migrations/*.sql; do
    migration_args+=(-f "$migration")
  done

  echo "▶ $(basename "$test_file")"
  "${PSQL[@]}" -d "$DB" \
    -f "$ROOT/supabase/tests/00_supabase_stub.sql" \
    "${migration_args[@]}" \
    -f "$ROOT/supabase/tests/00_helpers.sql" \
    -f "$test_file" 2>&1 | sed -E 's/^(psql:[^ ]* )?NOTICE:  /  /' | grep -v '^\s*$'
  passed=$((passed + 1))
done

echo "✔ $passed SQL test file(s) passed"
