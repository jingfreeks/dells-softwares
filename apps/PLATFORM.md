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
bash supabase/tests/run.sh # 100 assertions
```

| Suite | Guards |
|---|---|
| `100_entitlement` | `module_enabled()` failing closed; plan changes; MANUAL surviving |
| `110_platform_admin` | the `platform_*` contract — deny tests first |
| `120_inventory_enforcement` | writes blocked, **reads not** |
| `130_tenant_isolation` | §30's premise: tenant A cannot read tenant B |
| `140_session_helpers` | `current_user_id()` treats absent claims as absent, not as an error |
| `150_plan_management` | plan changes take effect; a MANUAL override survives one, and can be handed back |

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

- **Nothing has been applied to staging or production.** Twenty migrations
  exist locally and in `dev`; the reconciliation queries from the tenancy
  backfill have only ever run against a handful of local rows.
- **Two permission systems coexist.** `public.roles`/`permissions`/
  `staff_roles` with `has_permission()` was built before the core
  integration; the platform's own Phase 3 is designed to add its own, and
  `core.is_org_wide_staff()` is its interim marker. They have not been
  reconciled — whoever scopes Phase 3 needs to decide which one wins rather
  than discovering the overlap.
- **`suppliers` / `receiving` module ownership** — a pricing decision, above.
- **POS gating** — deliberately not built, above.
- **Limit enforcement.** `organization_modules.limits` is seeded and readable
  (branches, devices, products) but nothing enforces it. Architecture v1 §08
  specifies constraint triggers; adding them could instantly break a tenant
  already over a limit, so it needs an "is anyone already over?" audit first.
- **Grace/downgrade ladder.** The subscription statuses exist so
  `PAST_DUE → SUSPENDED → CANCELLED` is representable; the read-only-on-
  suspend behaviour belongs with enforcement.
- ~~A latent sharp edge in `core.current_user_id()`.~~ **Fixed** in
  `20260815098000`. It cast `request.jwt.claims` to `jsonb` before guarding
  the empty string, and a transaction-local `set_config` reverts to `''`
  rather than NULL — which is the resting state of every pooled PostgREST
  connection between requests. Because it is the session primitive behind
  every RLS helper, it raised rather than failing closed. Regression covered
  by `140_session_helpers`.
