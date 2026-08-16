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

Checked on 2026-08-16: **both projects report zero remote-only migrations**,
and both sit at `0043`. The repo and the hosted schemas agree about history,
which is the good case — though it says nothing about objects changed in the
dashboard without a migration, which is what bit us with the table grants.

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

-- Re-run the limit audit. Same expectation as before Phase 4.
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
