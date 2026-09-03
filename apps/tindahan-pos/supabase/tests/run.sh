#!/usr/bin/env bash
# Run the pgTAP suites against the local Supabase database.
# Exits non-zero if any assertion fails, so it is usable as a CI gate.
#
#   bash supabase/tests/run.sh
#
# Override the container for a different project name:
#   DB_CONTAINER=supabase_db_other bash supabase/tests/run.sh
set -uo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_tindahan-pos}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failed=0
total=0

if ! docker exec "$DB_CONTAINER" psql -U postgres -d postgres -tAc \
      "select 1 from pg_extension where extname='pgtap'" | grep -q 1; then
  echo "→ installing pgtap"
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres \
    -c "create extension if not exists pgtap with schema extensions;" >/dev/null
fi

for file in "$here"/[0-9]*.sql; do
  name="$(basename "$file")"
  output="$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -f - < "$file" 2>&1)"
  passed="$(grep -cE '^ ok ' <<<"$output" || true)"
  total=$((total + passed))

  if grep -qE '^ *not ok|ERROR:' <<<"$output"; then
    echo "✖ $name"
    # Include pgTAP's own '#' diagnostics, not just the "not ok" line. Those
    # carry the actual failure -- the expected/got values, and the error text
    # behind a lives_ok -- without which a red CI run says a thing failed and
    # not one word about why.
    grep -E '^ *not ok|ERROR:|^ *#' <<<"$output" | sed 's/^/    /'
    failed=1
  else
    echo "✓ $name — $passed assertions"
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "✖ pgTAP failures"
  exit 1
fi
echo "✓ all database tests passed ($total assertions)"
