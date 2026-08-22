#!/usr/bin/env bash
# Every SQL block in ROLLOUT.md still runs against the current schema.
#
#   bash supabase/tests/check-rollout-sql.sh
#
# WHY. ROLLOUT.md is the document someone follows while pushing to 661 live
# stores, at night, having read it once. Its queries are prose-adjacent -- they
# were correct when written and nothing re-checks them, so a renamed column or
# a dropped function rots them silently, and the first person to find out is
# whoever is mid-rollout.
#
# This does NOT check that the answers are right; expectations live in prose
# ("expect 0") and some legitimately vary by environment. It checks the weaker
# thing that can be checked mechanically and still catches real rot: every
# block executes without error against a database with every migration applied.
#
# A block that cannot run unattended -- one needing a real email, or a \i whose
# path resolves on the client rather than inside the container -- opts out with
# a `-- rollout-check: skip` line and says why.
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOC="$here/../../../ROLLOUT.md"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_tindahan-pos}"

[ -f "$DOC" ] || { echo "✖ cannot find $DOC"; exit 1; }
docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c 'select 1' >/dev/null 2>&1 \
  || { echo "✖ $DB_CONTAINER unreachable. Run: supabase start"; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

python3 - "$DOC" "$tmp" <<'PY'
import sys, os
doc, out = sys.argv[1], sys.argv[2]
lines = open(doc).read().split('\n')
cur, inb, start, n = [], False, 0, 0
for i, line in enumerate(lines, 1):
    if line.strip() == '```sql':
        inb, cur, start = True, [], i
        continue
    if inb and line.strip() == '```':
        inb = False
        body = '\n'.join(cur)
        n += 1
        skip = 'rollout-check: skip' in body
        with open(os.path.join(out, f'{start:05d}.sql'), 'w') as f:
            f.write(body)
        if skip:
            open(os.path.join(out, f'{start:05d}.skip'), 'w').close()
        continue
    if inb:
        cur.append(line)
print(n)
PY

total=0; ran=0; skipped=0; failed=0
for f in "$tmp"/*.sql; do
  line="$(basename "$f" .sql | sed 's/^0*//')"
  total=$((total + 1))
  if [ -f "${f%.sql}.skip" ]; then
    echo "  – ROLLOUT.md:$line  skipped (declared)"
    skipped=$((skipped + 1))
    continue
  fi
  out="$(docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres \
          -v ON_ERROR_STOP=1 -f - < "$f" 2>&1)"
  if [ $? -ne 0 ] || grep -q '^ERROR:' <<<"$out"; then
    echo "  ✖ ROLLOUT.md:$line"
    grep -E '^(ERROR|DETAIL|HINT):' <<<"$out" | sed 's/^/      /' | head -4
    failed=$((failed + 1))
  else
    echo "  ✓ ROLLOUT.md:$line"
    ran=$((ran + 1))
  fi
done

echo
if [ $failed -ne 0 ]; then
  echo "✖ $failed of $total SQL blocks in ROLLOUT.md no longer run"
  exit 1
fi
echo "✓ all $ran runnable SQL blocks in ROLLOUT.md still work ($skipped declared skips)"
