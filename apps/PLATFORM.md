# Dell's Software Platform — how the pieces fit

What exists today, why it is shaped this way, and what is deliberately not
finished. `DISCOVERY.md` is the point-in-time survey taken *before* any of
this was built and should be read as history; this file is the current state.

---

## The shape of it

Two tenant applications and one platform console share a single Supabase
project. Business data still lives in `public`; identity, tenancy,
entitlement and platform administration live in `core`.

```
  tindahan-pos          inventory-app            super-admin
  (POS module)          (INVENTORY module)       (platform console)
        \                     |                       /
         \                    |                      /
          ------------  public.* RPCs  --------------
                              |
                    core.*  (not exposed to PostgREST)
```

**`core` is unreachable from any browser.** PostgREST runs with
`PGRST_DB_SCHEMAS=public,graphql_public`, so a request against `core` is
refused with `PGRST106`. Every client call therefore goes through a narrow,
deliberate `public` contract:

| Function | Used by | Answers |
|---|---|---|
| `my_store_modules()` | both tenant apps | which modules may my store use |
| `platform_me()` | super-admin | am I an admin, is my second factor fresh |
| `platform_verify_mfa()` | super-admin | stamp MFA after a challenge |
| `platform_organizations()` | super-admin | every tenant, with plan and counts |
| `platform_organization_modules(org)` | super-admin | one tenant's module matrix |
| `platform_set_module(...)` | super-admin | turn a module on or off (a MANUAL override) |
| `platform_plans()` | super-admin | the plan catalogue and what each includes |
| `platform_set_plan(...)` | super-admin | move a tenant to a plan, re-materializing |
| `platform_reset_module_to_plan(...)` | super-admin | drop an override so the plan governs |
| `platform_set_subscription_status(...)` | super-admin | move a tenant along the §08 ladder |
| `my_store_billing_state()` | tenant apps | what to warn this store about, if anything |
| `platform_audit(limit)` | super-admin | platform-level activity |

Adding a capability means adding a function here on purpose — not a client
discovering it can query a table.

---

## Tenancy

`public.stores` is still the operational tenant record. `core.organizations`
mirrors it **with ids preserved**, which is load-bearing: a `store_id`
anywhere in `public` *is* an organization id, so `core.module_enabled(store_id, …)`
needs no join. `public.current_store_has_module()` is the one place that
assumption is written down.

The mirror is maintained by triggers, not a one-off script — a store or staff
member created tomorrow lands in `core` automatically:

```
auth.users ──trigger──> core.users
public.stores ──trigger──> core.organizations + a synthesised "Main Branch"
public.staff  ──trigger──> core.staff
```

**Deletes become status changes.** `core.audit_logs` references
`core.organizations` `ON DELETE RESTRICT` and its rows are immutable, so an
organization can never be removed once anything is audited against it — which
happens on the very insert that creates it. Deleted stores become `CANCELLED`
and deleted staff `TERMINATED`; both fail closed, since `core.auth_org_ids()`
only returns `ACTIVE`/`SUSPENDED` orgs and `ACTIVE` staff.

That path is load-bearing, not theoretical: `handle_new_user()` creates a
store for *every* new auth user, so `create-cashier` provisions a throwaway
store and deletes it. Without the delete trigger, every cashier ever created
would leave an orphaned organization behind.

---

## Entitlement

*Plans are marketing; `organization_modules` is truth.* Nothing reads a plan
name at runtime.

```
subscription_plans ──> plan_modules ──> organization_subscriptions
                                                 │ materialize
                                                 ▼
                                      organization_modules  ← the answer
                                                 │
                                   core.module_enabled(org, module)
```

- A **manual grant** (`source = 'MANUAL'`) is never overwritten by
  materialization, so a comp survives the tenant's next plan change instead
  of quietly expiring at renewal. The console therefore treats **changing the
  plan** as the primary action — toggling a module by hand opts it out of
  plan control until `platform_reset_module_to_plan()` hands it back.
- `module_enabled()` **fails closed** — unknown module, missing row, expired
  or not-yet-started grant all answer false. `CORE` is the sole always-on
  exception.
- Every existing org was backfilled onto **BASIC** (POS + Inventory), because
  that is exactly what they could already do. New orgs get the same by
  trigger — without it, the first customer to sign up after enforcement would
  reach an empty application. **Which plan a new customer should get is a
  commercial decision**, and it is one line in
  `20260815093000_core_module_entitlement.sql`.

### What is actually enforced

Only **writes**, and only for `INVENTORY`. Architecture v1 §08 keeps reading
and exporting available in *every* subscription state — Suspended and
Cancelled included — so no `SELECT` policy anywhere consults entitlement. A
tenant whose module lapses keeps full visibility of their records and can
still export them; they simply cannot change them.

| Gated (inventory-app only) | Not gated, and why |
|---|---|
| warehouses, warehouse_stock, warehouse_transfers, purchase_orders + lines, product_unit_conversions, inventory_beginning_balances, inventory_counts + lines | `products`/`categories` — POS cannot function without them; `suppliers` and `receiving` — tindahan-pos exposes both; `sales`/`sale_items` — the money path, untouched |

Whether `suppliers` and `receiving` belong to the Inventory plan is a
**pricing decision that has not been made**. POS is not gated at all: every
plan includes it, so gating would only ever fire for a suspended tenant while
carrying the highest risk in the system — a wrong row means a shop cannot
sell.

---

## Platform administration

`core.platform_admins` plus a second factor. Three properties matter:

1. **Break-glass is `service_role` only.** `core.bootstrap_platform_admin()`
   is revoked from `authenticated` entirely; a bootstrap a signed-in user
   could reach would be a privilege-escalation hole. It grants no new power —
   `service_role` can already write any table — it makes the correct thing
   convenient and audited.
2. **MFA cannot be self-certified.** `record_platform_admin_mfa()` stamps
   `mfa_verified_at` only when the session JWT carries `aal2`. That claim is
   minted by the auth server; a password-only session (`aal1`) is refused and
   the refusal is logged.
3. **Every `platform_*` function re-checks `core.is_platform_admin()`
   itself.** They are `SECURITY DEFINER` and executable by `authenticated`,
   so any signed-in cashier can call them. `platform_organizations()` in
   particular would be a full tenant dump if its guard were dropped.

Platform-level actions are audited in `core.platform_audit_logs`, separate
from `core.audit_logs` because the latter's `organization_id` is `NOT NULL`
by design — a platform admin grant belongs to no tenant and structurally
cannot be recorded there.

---

## Testing

```bash
cd apps/tindahan-pos
supabase db reset          # applies all migrations from empty
bash supabase/tests/run.sh # 158 assertions
```

| Suite | Guards |
|---|---|
| `100_entitlement` | `module_enabled()` failing closed; plan changes; MANUAL surviving |
| `110_platform_admin` | the `platform_*` contract — deny tests first |
| `120_inventory_enforcement` | writes blocked, **reads not** |
| `130_tenant_isolation` | §30's premise: tenant A cannot read tenant B |
| `140_session_helpers` | `current_user_id()` treats absent claims as absent, not as an error |
| `150_plan_management` | plan changes take effect; a MANUAL override survives one, and can be handed back |
| `160_grace_ladder` | suspension blocks writes and ONLY writes; an unprovisioned tenant keeps working |
| `170_plan_limits` | caps stop the next row, absent means unlimited, and it holds for `service_role` |

Plus two static guards (`scripts/check-*.mjs`): no client-reachable secrets,
and no table without RLS. All of it runs in `Platform CI`
(`.github/workflows/platform-ci.yml`), whose Supabase CLI version is pinned
deliberately — `version: latest` resolves the release through GitHub's API
unauthenticated and fails on rate limits, which is how the first run died.

Every guard has been **mutation-tested** — a guard that has never gone red is
just a script that exits 0.

---

## Operational runbook

### Create the first platform administrator

Only `service_role` can, by design. In the Supabase SQL editor:

```sql
select core.bootstrap_platform_admin('you@yourdomain.com', 'SUPERUSER');
```

The person must have **signed up first** (so a `core.users` row exists) and
must have **MFA enrolled on that Supabase Auth account**. Without MFA,
`platform_me()` reports `mfa_fresh: false` forever and the console correctly
shows nothing.

### Grant a module to one tenant

Through the console, or directly:

```sql
select public.platform_set_module('<org-uuid>', 'ACCOUNTING', true, 'pilot customer');
```

### Sample data for local development

`supabase/snippets/sample-catalog.sql` — deliberately *not* `seed.sql`,
because the CLI runs that automatically and this file needs a `store_id` only
a human can supply.

---

## Known gaps and pending decisions

- ~~**The migration set could not stand up a working environment.**~~
  **Fixed** in `20260815101000`. Applying every migration to a new project
  produced a database where both apps were dead on arrival: sign-in
  succeeded, then the first query — the app reading its own `staff` row —
  returned 403. Not RLS; a missing GRANT one level below it. Migrations run
  as `postgres`, whose default ACL for `public` is `Dxtm` (truncate,
  references, trigger) — no DML — while `supabase_admin`'s is `arwdDxtm`. So
  every table this repo creates was unreachable by `authenticated` and
  `service_role`, the latter breaking the `create-cashier` Edge Function too.
  The live project already has these grants, applied outside this repository
  when the defaults were more permissive, which is why production works and
  the schema only *appears* complete. The migration grants them explicitly
  and sets default privileges so the next new table cannot reintroduce the
  gap. `anon` is deliberately granted nothing. The three RLS suites no longer
  carry their compensating `grant`, so they now fail if this regresses.
- **Nothing has been applied to staging or production.** Twenty-five migrations
  exist locally and in `dev`; the reconciliation queries from the tenancy
  backfill have only ever run against a handful of local rows.
- **Two permission systems coexist.** `public.roles`/`permissions`/
  `staff_roles` with `has_permission()` was built before the core
  integration; the platform's own Phase 3 is designed to add its own, and
  `core.is_org_wide_staff()` is its interim marker. **Analyzed in
  [PERMISSIONS-DECISION.md](PERMISSIONS-DECISION.md)** — 78 live checkpoints
  on the built system against 11 interim ones, so the recommendation is to
  keep `public` and retire the interim into it. Still a decision to make, not
  a decision made.
- **`suppliers` / `receiving` module ownership** — a pricing decision, above.
- **POS gating** — deliberately not built, above.
- ~~**Limit enforcement.**~~ **Built** in `20260815102000`. Triggers rather
  than policies, because devices are inserted by the pair-device Edge
  Function on a `service_role` client that bypasses RLS entirely — a policy
  would have enforced the device cap against nobody. Enforcement is
  INSERT-only: a tenant already over keeps everything and simply cannot add
  more. Absent limits mean unlimited, never zero.
  - Counting excludes retired rows (`devices.unpaired_at`, `branches` that
    are CLOSED), so a store is never penalised for having replaced a
    terminal.
  - **Run `supabase/snippets/limit-audit.sql` before applying this to real
    data.** It is read-only and lists anyone at or over a cap. The migration
    cannot corrupt anything, but it can surprise someone.
  - Note that on BASIC every existing tenant is already **at** the branch
    ceiling (1 of 1), since the backfill synthesized one branch per store.
    Harmless while nothing creates branches, and correct commercially —
    multi-branch is a PRO feature — but it means the day a multi-branch
    feature ships, BASIC tenants are capped at one by construction.
- ~~**Grace/downgrade ladder.**~~ **Built** in `20260815100000`.
  `core.org_writes_allowed()` implements §08: TRIALING, ACTIVE and PAST_DUE
  all still write (grace gets a banner, not a lock); SUSPENDED, CANCELLED
  and a suspended *organization* withdraw writes only — reads and exports
  survive every state, and entitlement is untouched, so reinstating is one
  click. It fails **open** for an organization with no subscription row,
  because `grant_default_subscription()` swallows its own failures by design
  and a provisioning gap must never read as a suspension.
  `platform_set_subscription_status()` is the operator control (BILLING
  scope, and a reason is required to suspend or cancel).
  - **POS is not gated by it.** A suspended tenant can still sell. Blocking
    sales is the sharpest possible change to a live money-handling system
    and depends on the open POS-gating decision below; `160_grace_ladder`
    asserts the current boundary so it cannot move silently.
  - Nothing escalates PAST_DUE to SUSPENDED automatically. The 14-day window
    is reported to the tenant, but the transition is a person's decision.
- ~~A latent sharp edge in `core.current_user_id()`.~~ **Fixed** in
  `20260815098000`. It cast `request.jwt.claims` to `jsonb` before guarding
  the empty string, and a transaction-local `set_config` reverts to `''`
  rather than NULL — which is the resting state of every pooled PostgREST
  connection between requests. Because it is the session primitive behind
  every RLS helper, it raised rather than failing closed. Regression covered
  by `140_session_helpers`.
