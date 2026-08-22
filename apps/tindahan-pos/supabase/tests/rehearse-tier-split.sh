#!/usr/bin/env bash
# Rehearse the tier-split backfill at production scale.
#
#   bash supabase/tests/rehearse-tier-split.sh [tenants]   # default 700
#
# WHY THIS EXISTS. 20260815113000 grandfathers every capability a tenant
# already holds so the narrowed plans cannot take anything away. On a fresh
# local database there are no organizations at the moment it runs, so the
# backfill updates ZERO rows -- the riskiest step in the whole rollout is the
# one the test suite cannot reach. In production it re-sources roughly 9,915
# grants across 661 tenants, and the first time anyone sees it work is on live
# data.
#
# So: build a database that looks like production the moment before the split,
# then run THE ACTUAL MIGRATION FILE against it -- not a copy of its SQL, which
# would drift from the real thing and prove nothing -- and check that every
# tenant came out the other side holding what they went in with.
#
# Exits non-zero if any check fails, so it is usable as a gate.
set -uo pipefail

TENANTS="${1:-700}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_tindahan-pos}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION="$here/../migrations/20260815113000_tier_split_and_grandfather.sql"

if [ ! -f "$MIGRATION" ]; then
  echo "✖ cannot find $MIGRATION"; exit 1
fi

psql() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres "$@"; }
q()    { psql -tAc "$1"; }

echo "→ rewinding to the pre-split world ($TENANTS tenants)"

# NOTE: this script CANNOT clean up after itself, and does not pretend to.
# core.audit_logs is immutable by design (core.reject_audit_mutation), every
# tenant it invents writes audit rows, and core.organizations is referenced by
# them -- so the invented tenants cannot be deleted once they exist. That
# immutability is a property worth more than a tidy scratch database, so the
# script works around it rather than weakening it.
#
# Consequence: tenants accumulate across runs. Every check below is written to
# be correct anyway -- totals are measured before and after WITHIN a run, and
# the newcomer is counted by id rather than by name. Run preflight.sh, which
# resets the database first, if you want the numbers to be comparable
# between runs.

# Undo the split: every plan sells everything again, which is exactly what
# 20260815109000 left behind and what every deployed environment still looks
# like today.
psql -q <<SQL
insert into core.plan_features (plan_id, feature_code)
select p.id, f.code from core.subscription_plans p cross join core.features f
on conflict do nothing;

-- Tenants as they are before the split: holding the whole catalogue, every
-- grant SUBSCRIPTION-sourced, because nobody had comped anything yet.
update core.organization_features set source = 'SUBSCRIPTION', enabled = true;
SQL

# Seed to scale. Inserting an organization auto-provisions it, so the features
# arrive through the same trigger a real sign-up uses.
psql -q <<SQL
do \$\$
declare i int;
begin
  for i in 1..$TENANTS loop
    insert into core.organizations (name, status)
    values ('Rehearsal Store ' || i, 'ACTIVE');
  end loop;
end \$\$;

-- The trigger materialises from the (now un-split) plans, but do it explicitly
-- too so every tenant certainly holds all fifteen.
insert into core.organization_features (organization_id, feature_code, enabled, source)
select o.id, f.code, true, 'SUBSCRIPTION'
from core.organizations o cross join core.features f
on conflict (organization_id, feature_code)
do update set enabled = true, source = 'SUBSCRIPTION';
SQL

# One tenant with a genuine comp, to prove the backfill leaves MANUAL alone.
psql -q -c "update core.organization_features set source = 'MANUAL'
            where organization_id = (select id from core.organizations
                                     order by created_at limit 1)
              and feature_code = 'pos.utang';"

before_tenants=$(q "select count(*) from core.organizations")
before_grants=$(q "select count(*) from core.organization_features where enabled")
before_manual=$(q "select count(*) from core.organization_features where enabled and source='MANUAL'")

echo "  tenants=$before_tenants  enabled grants=$before_grants  manual=$before_manual"
echo "→ running the real migration file"

start=$(date +%s)
out="$(psql -v ON_ERROR_STOP=1 -f - < "$MIGRATION" 2>&1)"
rc=$?
elapsed=$(( $(date +%s) - start ))

if [ $rc -ne 0 ]; then
  echo "✖ the migration itself failed:"; echo "$out" | tail -20; exit 1
fi
echo "  applied in ${elapsed}s"
echo "$out" | grep -i "grandfathered" | sed 's/^/  /'

after_tenants=$(q "select count(*) from core.organizations")
after_grants=$(q "select count(*) from core.organization_features where enabled")
after_manual=$(q "select count(*) from core.organization_features where enabled and source='MANUAL'")
after_gf=$(q "select count(*) from core.organization_features where enabled and source='GRANDFATHERED'")

fail=0
check() { # description, actual, expected
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; else echo "  ✖ $1 — got $2, expected $3"; fail=1; fi
}

echo "→ checking"

# THE promise. Not one tenant may come out holding less than they went in with.
check "no tenant lost a capability ($before_grants enabled grants)" "$after_grants" "$before_grants"
check "no tenant appeared or vanished"                              "$after_tenants" "$before_tenants"

# The distinction 20260815113000 exists to preserve: a comp is not a backfill.
check "the one genuine comp stayed MANUAL"                          "$after_manual" "$before_manual"
check "everything else became GRANDFATHERED" "$after_gf" "$(( before_grants - before_manual ))"

# The ladder landed.
for pair in "FREE 4" "BASIC 9" "PRO 14" "ENTERPRISE 15"; do
  set -- $pair
  actual=$(q "select count(*) from core.plan_features pf
              join core.subscription_plans p on p.id=pf.plan_id where p.code='$1'")
  check "$1 sells $2 features" "$actual" "$2"
done

# Per-tenant, not just in aggregate: a total can hold while individuals move.
worst=$(q "select coalesce(min(n),0) from (
             select count(*) filter (where enabled) as n
             from core.organization_features group by organization_id) t")
check "the least-entitled tenant still holds all 15" "$worst" "15"

# THE CHECK THAT ACTUALLY MATTERS, and the one this script did not have at
# first. Nothing re-materialises during the migration, so every tenant still
# looks fine the moment it finishes -- disabling the grandfather step entirely
# leaves the counts above completely unchanged. The loss lands LATER, the first
# time anything calls materialize_subscription_features(): an operator changing
# a plan, a renewal, a support action. So do that to every tenant, and only
# then ask whether anyone lost something.
echo "→ re-materialising every tenant, which is what would strip them"
psql -q -c "do \$\$
declare r record;
begin
  for r in select id from core.organizations loop
    perform core.materialize_subscription_features(r.id);
  end loop;
end \$\$;"

after_materialize=$(q "select count(*) from core.organization_features where enabled")
check "STILL nobody lost a capability after re-materialisation" \
      "$after_materialize" "$before_grants"

worst_after=$(q "select coalesce(min(n),0) from (
                   select count(*) filter (where enabled) as n
                   from core.organization_features
                   where organization_id in (select id from core.organizations)
                   group by organization_id) t")
check "and the least-entitled tenant still holds all 15" "$worst_after" "15"

# And the thing that would make it all pointless -- that a NEW tenant now gets
# only what BASIC sells, so the split is not simply inert.
# Two statements, deliberately. A data-modifying CTE does not see its own
# trigger's writes -- doing this in one statement reports zero and looks
# exactly like the split having eaten the newcomer's entitlements.
psql -q -c "insert into core.organizations (name, status)
            values ('Rehearsal Newcomer', 'ACTIVE');"
# Counted against ONE organization id, not every row sharing the name. The
# name-matching version silently summed across runs.
newco=$(q "select count(*) from core.organization_features f
           where f.organization_id = (select id from core.organizations
                                      where name = 'Rehearsal Newcomer'
                                      order by created_at desc limit 1)
             and f.enabled")
check "a tenant signing up after the split gets BASIC only" "$newco" "9"

if [ $fail -ne 0 ]; then
  echo "✖ rehearsal FAILED — do not push this to staging"
  exit 1
fi
echo "✓ rehearsal passed against $before_tenants tenants and $before_grants grants"
