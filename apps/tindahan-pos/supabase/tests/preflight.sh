#!/usr/bin/env bash
# Every gate that must pass before migrations go anywhere near a real tenant.
#
#   bash supabase/tests/preflight.sh
#
# WHY THIS EXISTS. ROLLOUT.md Phase 7 lists four separate things to run, and
# the one that catches the disaster -- the tier-split rehearsal -- is the
# easiest of them to skip, because it is the only one that does not fail
# loudly on its own if you simply never type it. A rollout is run late, under
# pressure, by someone who has read the document once. "Remember to also run"
# is not a control.
#
# So: one command, one verdict, non-zero if anything is wrong.
#
# This checks the LOCAL database. It is what you run before pushing; the same
# security-surface.sql is then run against staging and production after the
# push, where the tenants actually are.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_tindahan-pos}"
fail=0
declare -a RESULTS

step() { echo; echo "──────── $1"; }
record() {
  if [ "$2" -eq 0 ]; then RESULTS+=("  ✓ $1"); else RESULTS+=("  ✖ $1"); fail=1; fi
}

if ! docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1; then
  echo "✖ $DB_CONTAINER is not reachable. Run: supabase start"
  exit 1
fi

# Reset first, so the run is hermetic. The rehearsal invents hundreds of
# tenants and CANNOT remove them afterwards -- core.audit_logs is immutable by
# design and references them -- so without this the numbers drift upward every
# run and a later run's output cannot be compared with an earlier one.
step "0/3  resetting the local database"
( cd "$here/../.." && supabase db reset --local ) >/dev/null 2>&1
record "database reset" $?

step "1/3  pgTAP suites"
bash "$here/run.sh"
record "pgTAP suites" $?

step "2/3  tier-split rehearsal at production scale"
# Runs the real migration file against a database rebuilt into the pre-split
# state, then re-materialises every tenant -- which is the step that catches a
# broken grandfather, because nothing re-materialises during the migration
# itself and every tenant looks fine until something does.
bash "$here/rehearse-tier-split.sh" 700
record "tier-split rehearsal" $?

step "3/3  security surface"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f - < "$here/../snippets/security-surface.sql"
record "security surface" $?

echo
echo "════════ preflight"
printf '%s\n' "${RESULTS[@]}"
echo

if [ $fail -ne 0 ]; then
  echo "✖ NOT READY TO PUSH"
  exit 1
fi
cat <<'DONE'
✓ ready to push

Next, per ROLLOUT.md Phase 7 — against staging, not locally:

  psql "$STAGING_URL" -f supabase/snippets/tier-split-audit.sql > /tmp/tier-before.txt
  supabase db push
  psql "$STAGING_URL" -f supabase/snippets/tier-split-audit.sql > /tmp/tier-after.txt
  diff /tmp/tier-before.txt /tmp/tier-after.txt
  psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f supabase/snippets/security-surface.sql

If any tenant's count of enabled grants falls by even one, stop.
DONE
