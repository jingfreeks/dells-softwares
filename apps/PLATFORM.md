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
| `platform_organization_limits(...)` | super-admin | usage against ceiling, per limit |
| `platform_set_limit(...)` | super-admin | raise, lower or remove a ceiling |
| `my_store_limits()` | both apps | the caller's OWN ceilings and usage; takes no argument |
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

| Gated | Not gated, and why |
|---|---|
| warehouses, warehouse_stock, warehouse_transfers, purchase_orders + lines, product_unit_conversions, inventory_beginning_balances, inventory_counts + lines, **suppliers**, **receiving_entries + lines** | `products`/`categories` — POS cannot function without them; `sales`/`sale_items` — the money path, untouched |

`suppliers` and `receiving` were the last exception, left ungated because
tindahan-pos exposes both and gating them on the Inventory module would have
broken a POS-only store. Whether they belonged to the Inventory plan was
recorded here as an unmade pricing decision.

`20260815113000` made it: both are BASIC features of the INVENTORY module.
`20260815114000` enforced it, and `core.feature_enabled()` requires the owning
module, so a tenant without INVENTORY no longer holds the feature either. Only
FREE is affected — it grants POS alone — and no tenant is on FREE.

Those six write policies had checked the store and the caller's role and
**nothing else**: no module, no feature, and no grace ladder, meaning a
SUSPENDED tenant could go on receiving stock indefinitely. All three gates are
now in front of them, tested independently in `260_suppliers_receiving_-
enforcement` — a test that revokes all three at once cannot tell which one is
holding the door.

POS itself is still not gated at all: every plan includes it, so gating would
only ever fire for a suspended tenant while carrying the highest risk in the
system — a wrong row means a shop cannot sell.

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
bash supabase/tests/run.sh # 346 assertions
```

| Suite | Guards |
|---|---|
| `100_entitlement` | `module_enabled()` failing closed; plan changes; MANUAL surviving |
| `110_platform_admin` | the `platform_*` contract — deny tests first; every function executable by `authenticated` alone |
| `120_inventory_enforcement` | writes blocked, **reads not** |
| `130_tenant_isolation` | §30's premise: tenant A cannot read tenant B |
| `140_session_helpers` | `current_user_id()` treats absent claims as absent, not as an error |
| `150_plan_management` | plan changes take effect; a MANUAL override survives one, and can be handed back |
| `160_grace_ladder` | suspension blocks writes and ONLY writes; an unprovisioned tenant keeps working; POS itself is not one of those blocked writes |
| `170_plan_limits` | caps stop the next row, absent means unlimited, and it holds for `service_role` |
| `180_limit_controls` | the console's usage number IS the trigger's, and a ceiling can be changed |
| `190_tenant_limits` | a store sees its own ceilings, cannot aim at another's, fails closed |
| `200_audit_partition_isolation` | a partition of `core.audit_logs` is not a way past the parent's policy |
| `210_permission_unification` | an admin keeps every permission across the change; a demotion actually demotes |
| `220_anon_surface` | the anon key ships in the bundle; it reaches `feature_flags` and nothing else |
| `230_feature_entitlement` | a feature is dark without its module; a new tenant holds exactly its plan |
| `240_feature_enforcement` | server-side refusal on a withheld feature; §08 still holds — reads survive |
| `250_tier_split` | the ladder is cumulative; no plan grants a module with none of its features; grandfathering survives a re-materialize |
| `260_suppliers_receiving_enforcement` | the last two sold-but-ungated capabilities, gated on module, feature and the writes ladder independently |
| `270_finish_in_flight` | entitlement blocks starting, never finishing; a silent RLS no-op is caught by asserting row counts, not the absence of an error |
| `280_offline_replay_entitlement` | a queued sale that predates a withdrawal still lands; one claiming to postdate it does not |
| `290_every_feature_is_decided` | every catalogue feature is withheld, or named with a reason for why not — a stale excuse fails too |

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
- ~~**A tenant could read every other tenant's audit log.**~~ **Fixed** in
  `20260815105000`. `core.audit_logs` is FORCE RLS, but its monthly
  partitions had RLS disabled and were granted directly to `authenticated`
  by `ensure_audit_partition()` — and in Postgres a partition queried
  *directly* is subject to its own RLS, not its parent's. Naming one
  returned every tenant's rows (measured: 6 through the parent, 12 through
  the partition). Not reachable from a browser, since `core` is not exposed
  to PostgREST, but it would have opened silently the moment it was.
  `check-rls-coverage.mjs` had skipped partitions on the explicit belief
  that they inherit the parent's policies; that exemption is gone. Covered
  by `200_audit_partition_isolation`.
- **`anon`'s reach is now the same everywhere.** A database built from these
  migrations gives `anon` one thing: SELECT on `feature_flags`, which
  `FeatureFlagsProvider` reads before sign-in. The hosted projects granted it
  SELECT on every public table — probed against staging with the key that
  ships in the bundle: `staff`, `stores`, `products`, `sales`, `customers`,
  `devices` and `audit_log` all answered 200. **Every one returned zero rows**,
  so RLS was holding and this was never a breach — but it left RLS as the only
  layer, and `20260815105000` is proof that "RLS covers it" can simply be
  false. `20260815108000` narrows hosted to match, and `220_anon_surface`
  asserts the invariant.
- **Applied to STAGING on 2026-08-16** (`DellsSoftware-staging`,
  `qfkdecarbqwbpkzqqdxk`): all 31 pending migrations, 73 applied / 0 pending.
  Reconciliation against 661 real tenants and 666 staff adds up exactly —
  organizations 661 = stores 661, one primary branch each, core.staff 666 =
  staff 666, one live subscription each, and organization_modules 1322 =
  661 x 2, meaning materialization ran for every organization without a gap.
  **Then Phase 8 (12 more migrations — the tier split and its enforcement) on
  2026-08-21.** `preflight.sh` was green before the push; every check in
  ROLLOUT.md's Phase 7/8 verification section was run against staging itself
  afterward, not inferred from local: 9,915 grandfathered feature grants
  (matching the ~9,915 predicted almost exactly), `enabled_grants` unchanged
  at 661 × 15, `manual_grants` still 0, the ladder reads 4/9/14/15, and the
  structural counts above are bit-for-bit identical before and after. The
  staff↔organization tenant-mapping join also came back 0.
  **Production has had nothing applied.** See [ROLLOUT.md](ROLLOUT.md), and
  note it is the *other* project — `DellsSoftware`, `zwjwbfzrfjhslyxpsxby`.
- ~~**Every `platform_*` function is executable by `anon` and `service_role`,
  not just `authenticated`.**~~ **Fixed** in `20260815119000`. Found running
  `security-surface.sql` against staging for real, immediately after the
  Phase 8 push, rather than trusting the local-only "clean" result — the exact
  gap `security-surface.sql`'s own header warns about: a hosted project
  carries grants applied outside this repository, and local dev does not
  reproduce them.

  Not caused by the Phase 8 push, and not a live exposure while it stood. All
  15 platform_* functions carried the same grant, including several no
  migration had ever touched, so this was a pre-existing default-privilege
  characteristic of the hosted project (`ALTER DEFAULT PRIVILEGES`-shaped,
  applied by Supabase's own project bootstrapping, outside this repository).
  Every one of them checks `core.is_platform_admin()` internally and
  `250_tier_split` already pgTAP-verified that a non-administrator sees zero
  rows through it, so nothing was reachable while this stood. No Edge
  Function in this codebase calls a `platform_*` RPC (`grep -rl platform_
  supabase/functions/` finds nothing), so `service_role` had no legitimate
  reason to hold it either; the console signs in through Supabase Auth like
  any other app, so `anon` had none either.

  `security-surface.sql`'s check 4 used to only look for the bare `PUBLIC`
  pseudo-grant, string-matching the raw ACL array — real, but narrow enough to
  miss a NAMED role entirely, which is exactly what let this run "clean" on
  every previous local and CI run. It now uses `aclexplode()` to check every
  grantee explicitly.

  `20260815119000` revokes EXECUTE from `anon` and `service_role` across all
  fifteen functions, data-driven (loops `pg_proc` rather than fifteen
  hand-typed statements) so a sixteenth function inherits the fix rather than
  needing its own copy. `authenticated`'s access — and therefore the
  console's — is untouched. `110_platform_admin` now asserts this
  permanently: no platform_* function executable by anything but
  `authenticated`, and `authenticated` can reach every one of them. Verified
  against a simulated exact replica of the staging over-grant (30 rows) before
  writing the fix, and against the real staging finding's count matching
  precisely.
- ~~**Two permission systems coexist.**~~ **Resolved** in `20260815106000`,
  adopting option A from [PERMISSIONS-DECISION.md](PERMISSIONS-DECISION.md).
  `core.is_org_wide_staff()` is gone; its 11 call sites now ask
  `core.is_org_member(org) and has_permission('core.x.y')` — membership *and*
  authority, rather than one standing in for the other — using the codes each
  site already named in its own comment. `has_permission()` no longer branches
  on `staff.role = 'admin'`, so nothing anywhere branches on a role name (§07).
  - That shortcut was load-bearing: `handle_new_user()` creates an admin staff
    row and nothing ever assigned it OWNER, so removing it first would have
    stripped every permission from every admin created after `0044`.
    `trg_staff_sync_owner_role` keeps `staff.role = 'admin'` and the OWNER
    grant in step **in both directions** — a demotion that left OWNER behind
    would be a demotion in name only.
- ~~**Feature entitlement exists but is not enforced.**~~ **Built**, in three
  steps that were deliberately kept apart. `20260815109000` added
  `core.features` / `plan_features` / `organization_features` and
  `core.feature_enabled()`, mirroring the module layer, with every plan
  granting every feature so that applying it changed nothing for anyone.
  `20260815111000`/`112000` made policies and triggers actually consult it.
  `20260815113000` is the pricing decision: the four plans now differ.

  The ladder is **cumulative by construction** — each feature is stamped with
  the lowest tier that includes it and a plan gets everything at or below its
  rank. Four hand-written per-plan lists would drift, and the failure mode is
  a paying tenant quietly missing something a cheaper tenant has.

  | rank | plan | adds |
  |---|---|---|
  | 0 | FREE | shifts, void, discounts, pack pricing |
  | 1 | BASIC | utang, e-load, held sales, suppliers, receiving |
  | 2 | PRO | multi-register, BIR receipts, purchase orders, stock counts, unit conversions |
  | 3 | ENTERPRISE | stock transfers |

  Suppliers and receiving sit at BASIC rather than PRO because BASIC already
  grants the INVENTORY *module*, and a module whose every feature is off is an
  empty shell — the tenant sees the section and finds nothing in it. The
  feature split has to agree with the module split; `250_tier_split` asserts
  that no plan can ever grant a module while granting none of its features.

  **Existing tenants are grandfathered.** Everyone alive before the split held
  all fifteen features, so the migration re-sources every held grant from
  `SUBSCRIPTION` to `GRANDFATHERED` *before* narrowing the plans. That source
  outranks the plan inside `materialize_subscription_features()` exactly as
  `MANUAL` does, so nobody loses a capability they were already using and the
  split governs new subscriptions only. An operator hands one back
  deliberately, per feature, through `platform_reset_feature_to_plan()`, with
  the reason recorded.

  **Why a fourth source rather than reusing `MANUAL`.** `MANUAL` means a human
  looked at one tenant and decided something — the console says so in as many
  words. Had the backfill written `MANUAL`, every feature of every tenant would
  have read `MANUAL` the morning after the push, 15 × 661 of them, and the word
  would have stopped carrying any information. `GRANDFATHERED` says the other
  thing honestly: nobody chose this, it is what the tenant already had. "Which
  tenants are we carrying on old terms, and which did we genuinely comp?" is a
  question the business will ask, and it is unanswerable if both write the same
  word. The console labels them *comped* and *grandfathered* and offers **Follow
  plan** on both.

  **The grandfather step is not exercised by an ordinary local reset**, because
  a fresh database has no organizations at the moment the migration runs — the
  backfill updates zero rows, while in production it re-sources roughly 9,915
  grants across 661 tenants. Three things cover it:

  - `250_tier_split` pins the *mechanism* the backfill depends on — that a
    grant outranking the plan survives `materialize_subscription_features()`.
  - `supabase/tests/rehearse-tier-split.sh` rebuilds a local database into the
    pre-split state at production scale and runs **the actual migration file**
    against it, then re-materialises every tenant. That last step is the one
    that matters: nothing re-materialises during the migration, so every tenant
    looks fine the moment it finishes even if the grandfather did nothing —
    with it deliberately disabled, the immediate counts are unchanged and then
    1,200 of 3,000 grants vanish on the next materialize.
  - `supabase/snippets/tier-split-audit.sql` proves the real backfill on
    staging, before and after.
- ~~**`suppliers` / `receiving` module ownership**~~ **Decided** in
  `20260815113000` and enforced in `20260815114000` — both are BASIC features
  of INVENTORY. See above.
- **Entitlement decides what a tenant may START, never whether they may finish
  what is already underway.** This has now bitten three times, so it is written
  here once rather than rediscovered a fourth.

  `20260815116000` settled it for utang — a shop that loses the capability keeps
  its debts and must still record them being paid off. `20260815117000` settles
  it for the two state machines with the same trap: a `purchase_orders` stuck at
  `submitted` and an `inventory_counts` stuck at `open`, neither able to reach a
  terminal state, neither even *cancellable* — and both failing **silently**,
  because an `UPDATE` whose policy `USING` does not match matches zero rows and
  reports success. `closeInventoryCount()` throws only on `error`, so the screen
  said the count was closed while nothing had changed.

  Creation stays gated; completion does not. Feature and module checks are on
  INSERT only for those four tables.

  **The grace ladder stays on all of them**, and the distinction is the point.
  Losing a feature is a permanent change in what the tenant bought, so they must
  be able to wind down. A suspension is a temporary billing state — they settle
  up and carry on where they left off, and nothing is trapped by waiting.

  When testing this class of bug, assert on **row count**, not on the absence of
  an error. `lives_ok()` passes against a silent no-op, which is exactly the bug.

  `20260815118000` extends the same rule to the offline queue, which is the most
  literal case of already-underway: a credit sale rung up with no signal, sitting
  in the device queue while `pos.utang` is withdrawn. Refusing the replay undoes
  nothing — the goods are gone, the customer owes the money — it only keeps the
  shop's books from recording it. `checkout_sale()` had already decided this for
  stock in migration 0030, letting a replay drive stock negative and recording a
  discrepancy; the entitlement layer now agrees with the layer beneath it.

  The exemption is narrower than the flag, deliberately. `is_offline_replay` is
  caller-supplied, so trusting it alone would hand every store utang for free.
  The sale must *also* have occurred before the grant last changed, which a
  freshly rung-up sale cannot claim. What remains is a tenant backdating
  `occurred_at`, bounded by `checkout_sale()`'s existing offline-age limits and
  stamped `is_offline_replay = true` on the row for an audit to find.
- **Winding down is not using a feature.** `20260815111000` gated
  `credit_payments` alongside `sales`, reasoning that a store which cannot sell
  on credit cannot collect on it either. `20260815116000` undoes that half.

  A shop with fifty thousand pesos of utang across forty neighbours loses the
  capability. §08 holds — every debt is still there and still readable — and
  nobody can ever pay her back *in the system*. The neighbours hand over cash
  as they always have, she takes it, and the ledger goes on insisting they owe
  her. Every repayment makes her books further from the truth. That is a worse
  outcome than anything the entitlement was protecting.

  §08 withdraws writes so a tenant cannot take on **new commitments**. It was
  never meant to trap them in a state they cannot leave. A credit sale creates
  an obligation; a payment discharges one. The limit layer already had this
  right and is the precedent — enforcement is INSERT-only on *growth*, and a
  tenant already over the ceiling keeps everything and simply cannot add more.

  The trigger on `sales` stays; that is the half that withholds the capability.
- **Two PRO capabilities are sold and not withheld.** Found by walking the
  catalogue against what the database actually enforces. Seven of the fifteen
  features are unenforced; five of those are held by *every* plan, so nothing is
  given away. These two are not:

  | capability | why nothing withholds it |
  |---|---|
  | `pos.multi_register` | Whether a store may run more than one till is already expressed — and genuinely enforced — by the `devices` **limit**, which BASIC sets to **3**. The plan says one thing and the limit says another. |
  | `pos.bir_receipts` | `stores.bir_registered` is a boolean the owner toggles for themselves. Nothing consults the entitlement, so any store can issue official receipts. |

  Both are pricing decisions rather than bugs, and both are deliberately left
  alone here. `multi_register` needs the plan and the device limit reconciled —
  either BASIC drops to one device, or the capability moves to BASIC and the
  limit expresses the tier on its own. `bir_receipts` is compliance-shaped: a
  shop registered with the BIR is legally required to issue receipts, so
  withholding it is not obviously the right thing to sell.

  `290_every_feature_is_decided` holds both on the record. It scans every
  function body and policy expression for each feature code and fails if
  anything is sold without being withheld, unless it is named in that file with
  a reason — so a new capability cannot be added and quietly given away, and a
  stale excuse cannot outlive the enforcement that replaced it.
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
  - The console shows usage against ceiling and can change one
    (`20260815103000`). `core.limit_usage()` is the single definition of
    "how many do they have", called by both the triggers and the console, so
    the number an operator sees is by construction the number that gets
    enforced.
  - The tenant is warned before hitting one: `inventory-app` shows "Using 3
    of 3 included in your plan" and disables the action, and
    `describeWriteError()` turns `LIMIT_EXCEEDED: warehouses (max 3)` — which
    used to reach the screen verbatim — into a sentence naming the number and
    what to do. Unrecognised errors pass through unchanged, deliberately: a
    friendly generic would hide the real fault. `tindahan-pos` carries the
    same translator (`describePlatformError`) and shows "Using 2 of 3
    registers" in Settings → Devices; the register limit is the one a
    customer is most likely to meet, since it surfaced on the screen of a
    brand-new till mid-pairing.
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
  - Both apps warn the tenant: `inventory-app`'s `ModuleBanner` (where the
    gated writes are) and `tindahan-pos`'s `BillingBanner`. The POS one is
    shown to **admins only** and never on a paired device — a cashier cannot
    pay a bill, the till faces the customer, and nothing in the POS is
    blocked by billing state anyway. If POS gating is ever adopted, that
    last reason disappears and the audience should be revisited.
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
