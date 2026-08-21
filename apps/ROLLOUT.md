# Rolling the platform out

**Thirty-one migrations are pending**, and none has ever run against real
data. Measured against both hosted projects on 2026-08-16 — not estimated.
Note that this includes `0044` and `0045`, the RBAC foundation, which were
never applied either; it is not only the platform work. Every PR in this series ends with the same unchecked box, and
this document exists to make that line finally actionable rather than a
standing warning.

Everything below has been executed end to end locally, many times. What it has
never seen is the hosted project: real row counts, real staff, real devices,
and a decade's worth of whatever the schema has actually accumulated. So the
procedure is built around **verifying after each phase**, not around trusting
that it worked because it worked on a laptop.

Read the whole thing before starting. Total: roughly two hours on staging,
plus however long you want to leave it soaking before production.

**Every SQL statement below has been executed against a local database built
from these migrations, and returns the stated expectation.** That is not the
same as having been run against real data — see the closing section — but no
query here is untested.

---

## Before anything

**1. Confirm WHICH project you are pointed at. This is the one that can go
badly wrong.**

There are two ACTIVE_HEALTHY projects with confusingly similar names:

| name | ref |
|---|---|
| `DellsSoftware` | `zwjwbfzrfjhslyxpsxby` — **production** |
| `DellsSoftware-staging` | `qfkdecarbqwbpkzqqdxk` — staging |

The repository was found **linked to production**, so a `supabase db push`
run without checking would have applied all 31 migrations to the live system.
Worse, the names alone do not settle it: `qfkdecarbqwbpkzqqdxk` — the one now
called *staging* — is the ref the original architecture plan describes as the
project both live apps share. Do not infer from the name.

```bash
cat supabase/.temp/project-ref     # what am I actually linked to?
supabase link --project-ref qfkdecarbqwbpkzqqdxk   # staging, explicitly
```

The repo is currently left linked to **staging**, deliberately — if the link
is going to be stale, stale-pointing-at-staging is the safe direction.

**2. Confirm what production actually has.** The migration history in this
repo is the *intended* state. The live project has had things applied to it
outside this repo — that is exactly how the missing table grants
(`20260815101000`) went unnoticed. Before assuming the histories match:

```bash
supabase migration list --linked
```

Any migration marked **local-only** is one this rollout will apply. Any marked
**remote-only** is a change someone made in the dashboard that this repo does
not know about — investigate each one before continuing, because it may
conflict with what follows.

Checked again on 2026-08-20, after staging was migrated:

| | applied | pending | remote-only drift |
|---|---|---|---|
| `DellsSoftware` (**production**) | 42, last `0043` | **33** | **0** |
| `DellsSoftware-staging` | 73, last `20260815106000` | 2 | 0 |

**Zero remote-only migrations on either.** The repo and both hosted schemas
agree about history, and production is exactly where staging was before it
was migrated — so staging really is a rehearsal for production rather than a
different system that happens to share a name.

That said, agreeing about *history* says nothing about objects changed in the
dashboard without a migration, which is what bit us with the table grants.
Checked that separately, with each project's own anon key — the key that
ships in the bundle:

```
production and staging, identically:
  feature_flags, staff, stores, products, sales, customers, devices, audit_log
    -> HTTP 200, zero rows
```

Zero rows everywhere, so RLS is holding on both. The 200s are wide grants
applied outside this repository; `20260815108000` narrows them, and the fact
that both projects answer identically is what makes it safe to prove that
change on staging first.

**3. Take a backup, and confirm it is restorable.** Not "a backup exists" —
actually restore it somewhere. An untested backup is a belief, not a plan.

**4. Pick a quiet window.** Phase 4 changes write behaviour for the back
office. Nothing here stops the till, by design (see §08 of the architecture
and `PLATFORM.md`), but do it when someone is available to watch.

---

## The limit audit — after Phase 3, before Phase 4

> **Corrected.** An earlier version of this document called this "Phase 0" and
> told you to run it before anything else. **That is impossible**, and it was
> found by trying: the audit queries `core.organizations` and
> `core.organization_modules`, which do not exist until Phases 1–3 create and
> seed them. On a database that has not been migrated it fails immediately.
>
> Its purpose was always "before *enforcement*", not "before everything" —
> limits only exist once entitlement is seeded. So it belongs here: after
> Phase 3, before Phase 4. The phases below are otherwise unchanged.

```bash
psql "$DATABASE_URL" -f apps/tindahan-pos/supabase/snippets/limit-audit.sql
```

Read-only. It lists every tenant at or over a plan limit **before** those
limits start being enforced in Phase 4.

- **Empty result** → Phase 4 is a no-op for every existing tenant. Proceed.
- **Rows returned** → decide per tenant: raise their limits, move their plan,
  or hold Phase 4 back. Do not silently break someone who was never told there
  was a ceiling.

Expect at minimum every BASIC tenant to appear **at** the branch ceiling (1 of
1), because the backfill synthesizes one branch per store. That one is
harmless while nothing creates branches — but see it, understand it, and move
on deliberately rather than being surprised by it later.

---

## Phase 1 — RBAC + core schema (migrations 0044, 0045, then 1–14)

`0044` and `0045` first — they are pending too, and everything after assumes
`has_permission()` exists — then `20260815090000` through `20260815091500`.

Creates the `core` schema, its tables, helpers, RLS baseline and indexes.
**Touches nothing in `public`** and no application reads any of it yet.

```bash
supabase db push --include-all
```

*(If you prefer to go phase by phase, push up to a specific version rather
than all; `supabase migration list` shows what landed.)*

### Verify

```sql
-- Every core table has RLS on. Expect rls_off = 0 (total 18 at time of
-- writing).
--
-- relkind IN ('r','p') on purpose: 'p' is the partitioned parent
-- core.audit_logs, and 'r' includes its partitions. An earlier draft of this
-- query used 'r' alone -- which silently excluded the parent while counting
-- the partitions, and returned 5. Those five turned out to be a real
-- cross-tenant leak, fixed in 20260815105000. Keep both kinds.
select count(*) filter (where not c.relrowsecurity) as rls_off, count(*) as total
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'core' and c.relkind in ('r', 'p');

-- The session primitive answers rather than throwing, on an empty setting.
select core.current_user_id() is null as should_be_true;
```

### Abort criteria

Any error at all. Nothing in `public` has changed yet, so the rollback is
`drop schema core cascade` — the only phase where that is true.

---

## Phase 2 — the tenancy backfill (migration 15)

`20260815092000`. **This is the first migration that touches real tenant
data**, and the one to slow down for. It copies `public.stores` and
`public.staff` into `core`, preserving ids, and installs five sync triggers so
the two stay in step.

Every write is idempotent (`on conflict` / `where not exists`), and nothing in
`public` is modified — only read.

### Verify — these are the reconciliation queries that have only ever run against a handful of local rows

```sql
-- 1. Every store became an organization, ids preserved. Expect 0.
select count(*) from public.stores s
where not exists (select 1 from core.organizations o where o.id = s.id);

-- 2. Every store got exactly one primary branch. Expect 0 rows.
select o.id, count(b.id) as branches
from core.organizations o
left join core.branches b on b.organization_id = o.id and b.is_primary
group by o.id having count(b.id) <> 1;

-- 3. Every active staff member became core staff. Expect 0.
select count(*) from public.staff st
where st.active
  and not exists (select 1 from core.staff cs where cs.user_id = st.id);

-- 4. Nobody landed in the wrong tenant. Expect 0 -- this is the one that
--    would be a genuine data breach if it were ever non-zero.
select count(*) from public.staff st
join core.staff cs on cs.user_id = st.id
where cs.organization_id <> st.store_id;

-- 5. Counts line up.
select
  (select count(*) from public.stores)                     as stores,
  (select count(*) from core.organizations)                as organizations,
  (select count(*) from public.staff where active)         as active_staff,
  (select count(*) from core.staff where status = 'ACTIVE') as core_active_staff;
```

**Query 4 must be zero.** If it is not, stop and do not proceed — every later
phase builds tenant isolation on top of this mapping.

### Then test the triggers with a real write

```sql
begin;
insert into public.stores (name) values ('__rollout probe__');
select count(*) from core.organizations where name = '__rollout probe__';  -- expect 1
rollback;
```

### Abort criteria

Any reconciliation query returning unexpected rows. Rollback: drop the five
sync triggers and their two functions, then truncate `core.staff`,
`core.branches`, `core.organizations`. Safe **only** because nothing reads
`core` yet — which stops being true at Phase 3.

---

## Phase 3 — entitlement and platform admin (migrations 16–17, 20–22)

`20260815093000`, `094000`, `096000`, `097000`, `098000`, `099000`.

Seeds plans, modules and subscriptions; adds the platform admin tables and the
public contracts the console calls. Still **nothing enforced** — this is the
data and the API, not the gate.

### Verify

```sql
-- Every organization has an ACTIVE BASIC subscription and its modules.
select count(*) from core.organizations o
where not exists (
  select 1 from core.organization_subscriptions s
  where s.organization_id = o.id and s.status <> 'CANCELLED');   -- expect 0

-- Entitlement answers TRUE for what tenants can already do today.
select count(*) from core.organizations o
where not core.module_enabled(o.id, 'POS')
   or not core.module_enabled(o.id, 'INVENTORY');                -- expect 0
```

That second query is the one that matters: **if it returns anything, Phase 4
will lock those tenants out of an app they are already using.**

### Bootstrap the first platform admin

`core.bootstrap_platform_admin()` is callable by `service_role` only, by
design — it is the break-glass path that creates the first administrator when
no administrator exists to create one.

```sql
-- rollout-check: skip (placeholder email; errors by design until substituted)
-- Run as service_role (SQL editor is fine; it connects with elevated rights).
select core.bootstrap_platform_admin('you@yourdomain', 'SUPERUSER');
```

Then sign into the console once and confirm MFA is recorded — the shell
refuses to show anything without an `aal2` claim.

---

## Phase 4 — enforcement (migrations 18, 23, 25)

`20260815095000`, `100000`, `102000`. **The only phase that changes what
tenants can do.**

- `095000` — inventory writes require the INVENTORY module
- `100000` — suspended/cancelled subscriptions block back-office writes
- `102000` — plan limits are enforced

All three are **write-only**: reads and exports are never affected, existing
records are never hidden or deleted, and the till keeps selling. That is what
bounds the risk here.

**Do not apply this phase until the limit audit is clean and Phase 3's second
verification query returns zero.**

### Verify

```sql
-- Nobody is suspended, so nobody should be write-blocked.
select count(*) from core.organizations o
where not core.org_writes_allowed(o.id);                          -- expect 0

-- Re-run the limit audit. Same expectation as before Phase 4. The path is
-- relative to the REPOSITORY ROOT, so run psql from there.
-- rollout-check: skip (\i resolves on the client, not inside a container)
\i apps/tindahan-pos/supabase/snippets/limit-audit.sql
```

### Then verify as a real user, not as postgres

`postgres` bypasses RLS, so every query above proves nothing about what a
cashier experiences. Sign into the actual apps and confirm:

- the POS rings up a sale
- inventory-app lists products and warehouses
- an admin can create a warehouse
- a cashier still cannot reach admin-only pages

### Abort criteria

Any tenant unable to do something they could do an hour earlier. Rollback:
re-create the 21 policies without the module/writes clauses (see each
migration's own Rollback header), and drop the four limit triggers. All three
are designed to be individually reversible.

---

## Phase 5 — grants (migration 24)

`20260815101000`. Grants `authenticated` and `service_role` DML on `public`
tables, and sets default privileges so new tables inherit them.

**On the live project this is very likely a no-op** — those grants already
exist, applied outside this repo, which is why the apps work today. It is
here so a *new* environment is not dead on arrival. Re-granting is harmless.

### Verify

```sql
-- Expect authenticated = the full table count, anon = 0.
select grantee, count(*)
from information_schema.role_table_grants
where table_schema = 'public' and privilege_type = 'SELECT'
  and grantee in ('anon', 'authenticated', 'service_role')
group by grantee;
```

**`anon` must not appear at all** (or appear as 0). Locally this returns two
rows — `authenticated` and `service_role`, one per public table — and no
`anon` row. If `anon` shows up, something granted it outside this repo, and
that is worth understanding before you move on.

---

## Phase 6 — the rest (migrations 26–28)

`20260815103000`, `104000`, `105000`. Console limit controls, the
tenant-facing limits RPC, and the audit-partition isolation fix.

`105000` revokes direct grants on the partitions of `core.audit_logs` and
enables RLS on them. Nothing legitimate reads a partition by name, so this is
invisible in normal use — but verify it, because it closes a real
cross-tenant read:

```sql
-- Expect 0 for both.
select
  (select count(*) from pg_class c
     join pg_inherits i on i.inhrelid = c.oid
    where i.inhparent = 'core.audit_logs'::regclass
      and not c.relrowsecurity)                                as partitions_without_rls,
  (select count(*) from pg_class c
     join pg_inherits i on i.inhrelid = c.oid
    where i.inhparent = 'core.audit_logs'::regclass
      and has_table_privilege('authenticated', c.oid, 'SELECT')) as partitions_readable;
```

If either is non-zero on the hosted project, a partition was created there
while the old `ensure_audit_partition()` was in place — re-run the `do` block
from `20260815105000` to sweep them up. It is idempotent.

---

## Phase 7 — the tier split (migration 33)

`20260815113000`. The four plans stop being one plan with four names.

**This is the only phase whose riskiest step a local reset cannot exercise.**
A fresh local database has no organizations when the migration runs, so its
grandfather step updates zero rows. Staging has 661 tenants, and there the same
step re-sources roughly 9,915 grants. Treat a green local run as saying nothing
about it.

### Run preflight first — one command, one verdict

```bash
bash apps/tindahan-pos/supabase/tests/preflight.sh
```

Resets the local database, then runs every gate: the pgTAP suites, the
tier-split rehearsal at production scale, and the security-surface assertion.
It exits non-zero if any of them fails, and prints the exact staging commands to
run next if they all pass.

It exists because this phase previously asked you to remember four separate
commands, and the one that catches the disaster — the rehearsal — is the only
one that fails silently if you simply never type it. A rollout is run late, by
someone who read this document once. "Remember to also run" is not a control.

The reset is not optional politeness: the rehearsal invents hundreds of tenants
and **cannot remove them afterwards**, because `core.audit_logs` is immutable by
design and references them. Without a reset the numbers drift upward every run
and two runs cannot be compared.

The rehearsal can also be run alone:

```bash
bash apps/tindahan-pos/supabase/tests/rehearse-tier-split.sh 700
```

This rebuilds a local database into the state production is in the moment
before the split — every tenant holding all fifteen features, every grant
`SUBSCRIPTION`-sourced — and then runs **the actual migration file** against it,
not a copy of its SQL. It takes about two seconds for 10,500 grants, so the push
itself will not be slow.

It ends by calling `materialize_subscription_features()` for every tenant, and
that is the check that matters. Nothing re-materialises during the migration, so
**every tenant looks fine the moment it finishes even if the grandfather step
did nothing at all** — the loss lands later, the first time an operator changes
a plan or a renewal runs. Measured with the grandfather deliberately disabled:
counts unchanged immediately after, then 1,200 of 3,000 grants stripped on
re-materialisation, with the worst-off tenant falling from 15 capabilities to 9.

If this script fails, do not push.

### Before

```bash
psql "$STAGING_URL" -f apps/tindahan-pos/supabase/snippets/tier-split-audit.sql \
  > /tmp/tier-before.txt
```

Section 1 should show every tenant holding all 15 features, all
`SUBSCRIPTION`.

### After

```bash
psql "$STAGING_URL" -f apps/tindahan-pos/supabase/snippets/tier-split-audit.sql \
  > /tmp/tier-after.txt
diff /tmp/tier-before.txt /tmp/tier-after.txt
```

What must be true:

- **`enabled_grants` has not fallen.** This is the whole promise. Every tenant
  keeps every capability they were using; only the `source` column moves, from
  `SUBSCRIPTION` to `GRANDFATHERED`.
- **`manual_grants` stays at whatever it was before** (0 on a first push).
  A deliberate comp and a grandfathered grant must not be confused — if the
  backfill wrote `MANUAL`, this number would jump to ~9,915 and the word would
  stop meaning anything.
- Section 2 (tenants holding nothing) is **empty**.
- Section 3 reads **4 / 9 / 14 / 15** for FREE / BASIC / PRO / ENTERPRISE.
- Sections 4 and 5 are **empty** — the ladder is cumulative, and no plan grants
  a module while granting none of its features. The migration itself raises on
  both of these, so a successful push already implies them; the queries are
  there to confirm on data the migration did not create.

### Abort criteria

If `enabled_grants` falls by even one, stop. A tenant has lost something they
were using, which is a live-data regression, not a pricing change. The
migration is a plain `update` plus a rewrite of `core.plan_features` — restore
by re-running 109000's cross join, which puts every feature back on every plan;
the MANUAL re-sourcing is harmless if left in place.

### What this phase does NOT do

It does not change anyone's bill, and it does not take anything from anyone
alive today. It changes what a **new** sign-up gets, and it gives an operator a
per-feature way to move an existing tenant onto plan terms deliberately, via
`platform_reset_feature_to_plan()`. Actually charging differently per tier is a
separate decision that has not been made — `core.subscription_plans.price_php`
is still null for BASIC, PRO and ENTERPRISE.

---

## Phase 8 — enforcement, and the corrections that followed it

Phase 7 covers the tier split. It is not the end of the batch: **twelve
migrations are pending, and this phase is the other eight.** They are grouped
here because they share one property — this is the first time the platform ever
*refuses* a tenant's write on entitlement grounds, and five of them change what
happens on the money path.

| migration | what it does | what changes for a tenant |
|---|---|---|
| `107000` | pre-login feature flags readable again | nothing; fixes a fresh-environment regression |
| `110000` | contracts: `my_store_features()`, `platform_*` feature RPCs | nothing; read-only surface |
| `111000` | **enforces** features: 13 policies, utang + void triggers | first refusals; all tenants grandfathered, so none should see one |
| `112000` | enforces `inventory.transfers` | as above |
| `114000` | gates suppliers + receiving — module, feature **and grace ladder** | a SUSPENDED tenant can no longer receive stock. It could before. |
| `115000` | `platform_plans()` returns features; **drops and recreates** the function | console only; grants restored explicitly |
| `116000` | un-gates `credit_payments` | a store without utang can collect existing debts again |
| `117000` | un-gates UPDATE/DELETE on purchase orders + stock counts | in-flight work can reach a terminal state |
| `118000` | offline replay of a credit sale made before withdrawal | a queued sale can land after the capability is gone |

### Why none of this should be visible on the day

Every tenant alive is grandfathered by Phase 7 and holds all fifteen
capabilities. `111000`–`114000` refuse only what a tenant does not hold, so on a
correctly grandfathered database **nobody meets a refusal at all**. If support
hears about one in the first days, that is evidence the backfill did not do what
Phase 7's audit claimed — go back and check `enabled_grants`, not the
enforcement.

The one exception is `114000`'s grace-ladder conjunct: suppliers and receiving
had never carried it, so a tenant who is **already SUSPENDED** at push time
loses the ability to add a supplier or receive stock. That is the intended
behaviour and matches every other table; it is called out because it is the only
change here that alters what an existing tenant can do today.

### Verify

```sql
-- 1. Every grandfathered grant is actually taking effect. Expect 0.
--
--    NOT "every tenant holds all fifteen" -- that is true the morning after the
--    push and false the moment somebody signs up, because a new tenant is on
--    BASIC and legitimately holds nine. Measured against a local database, the
--    naive version returns 272 and would send you into a false abort on the
--    most alarming criterion here. This asks the question that stays true: is
--    anything the backfill granted failing to apply?
select count(*)
from core.organization_features f
join core.organizations o on o.id = f.organization_id
where f.source = 'GRANDFATHERED' and f.enabled
  and not core.feature_enabled(o.id, f.feature_code);

-- 2. The un-gatings actually landed — none of these three may carry a feature
--    check. Expect 0 rows.
select c.relname, pol.polname
from pg_policy pol join pg_class c on c.oid = pol.polrelid
where c.relname in ('credit_payments', 'purchase_orders', 'inventory_counts')
  and pol.polcmd in ('w', 'd')
  and coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%has_feature%';

-- 3. The console RPC kept its narrow grant after being dropped and recreated.
--    Expect exactly: postgres and authenticated. Never PUBLIC.
select array_to_string(proacl, ', ') from pg_proc where proname = 'platform_plans';
```

Then run the security surface, which asserts (3) and seven other properties and
exits non-zero on any of them:

```bash
psql "$STAGING_URL" -v ON_ERROR_STOP=1 -f apps/tindahan-pos/supabase/snippets/security-surface.sql
```

### Abort criteria

- Query 1 returns anything but **0** — a grant the backfill made is not taking
  effect, so a tenant is being refused something they hold. Stop; the
  grandfather is wrong and enforcement is merely the messenger. (Verified to
  catch it: disabling a grandfathered tenant's module makes this return 9.)
- Query 3 shows `PUBLIC` — `115000`'s drop-and-recreate lost its grants and the
  plan catalogue is readable by every signed-in shopkeeper.
- Support reports a `FEATURE_NOT_ENABLED` from a paying tenant in the first
  48 hours.

Rolling back one of these individually is not sensible — `116000`, `117000` and
`118000` exist to undo traps that `111000` created, so reverting the corrections
without reverting the enforcement is strictly worse than either state. If this
phase has to come out, take `111000` onward out together.

---

## The security surface, before and after every push

```bash
psql "$STAGING_URL" -f apps/tindahan-pos/supabase/snippets/security-surface.sql
```

Eight questions, each written so the safe answer is **zero rows**. Anything
printed is something to look at.

1. `SECURITY DEFINER` without a pinned `search_path`
2. what `anon` can reach — expect **`feature_flags`, SELECT only**
3. unconditional write policies
4. console RPCs reachable by `PUBLIC`
5. console RPCs missing the `is_platform_admin` gate — `platform_me` and
   `platform_verify_mfa` are excluded by name, because both answer only for the
   caller and gating the second would deadlock the check it exists to satisfy
6. tenant RPCs taking an organization argument — `my_store_*` must take none,
   or the caller picks whose data they read
7. public tables without RLS
8. audit partitions with RLS off or readable directly — the shape of the
   cross-tenant read fixed in `20260815105000`

This is not the same claim the CI guards make. `check-rls-coverage.mjs` and
`check-no-client-secrets.mjs` read the migration *files*; this reads the
*database those files produced*. A hosted project also carries grants applied
outside this repository, which is precisely how the missing-GRANT problem behind
`20260815101000` stayed invisible — the migrations looked complete and the
database was not.

Section 9 is informational, not a gate: several `core.*` functions are
executable by `PUBLIC`. Nothing is reachable through it today — `core` is not
exposed to PostgREST, and the dangerous ones gate themselves on
`is_platform_admin('SUPERUSER')` — but it is defence resting on a configuration
rather than a privilege. Worth revoking as **its own change on a quiet day**,
not bundled with a batch touching 661 live stores, and not before checking that
no trigger owned by `supabase_auth_admin` depends on that grant.

---

## After staging, before production

1. **Leave it running.** A day of real use finds things a checklist cannot.
2. **Watch for `LIMIT_EXCEEDED` and `MODULE_NOT_ENABLED`** in logs. Both now
   have human-readable translations in the apps, so a spike means a real
   tenant met a real ceiling — not a bug, but worth knowing before production.
3. **Re-run every verification query above.** Cheap, and the second run is the
   one that catches drift.
4. Only then repeat the whole procedure against production, in the same order.

---

## What this document cannot promise

I have not run any of this against a hosted project — no credentials, and it
is not my call to make. The SQL here is drawn from the migrations' own
verification notes and has been exercised locally, but **staging is where it
first meets reality**, and the possibility that production's schema has
drifted from this repo in ways `supabase migration list` does not surface is
real. Treat step 2 of "Before anything" as the most important line here.

If a verification query returns something this document does not predict, that
is information, not a formality to click past.
