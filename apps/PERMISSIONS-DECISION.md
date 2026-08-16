# Two permission systems: which one wins

This is a decision document, not a design. It exists because the platform
integration left two authorization systems in the database and never chose
between them, and picking one is now cheaper than continuing to maintain the
ambiguity. Everything below is measured from the code as it stands on `dev`,
not from intent.

**The recommendation is in the last section.** The rest is the evidence.

---

## The question

`core.is_org_wide_staff()` carries this comment, written during Phase 2:

> PHASE 2 INTERIM. A coarse admin proxy used by write policies until the RBAC
> tables land in phase 3. Search for this name when implementing phase 3 —
> every call site must become a `has_permission()` check.

That instruction assumes Phase 3 will build RBAC tables in `core`. But
`has_permission()` **already exists**, in `public`, built before the
integration and enforcing 78 checkpoints today. So Phase 3 as written would
build a second implementation of a function this codebase already has.

The question is not "which design is better in the abstract". It is: **do we
migrate 78 working checkpoints to a new system, or retire 11 interim ones
into the existing one?**

---

## System A — `public` RBAC (built, live)

Migrations `0044_rbac_foundation.sql` and `0045_rbac_enforce_checkpoints.sql`.

| | |
|---|---|
| Tables | `permissions`, `roles`, `role_permissions`, `staff_roles` |
| Entry point | `has_permission(code, staff_id default auth.uid())` |
| Keyed on | `public.staff.id`, which **is** `auth.users.id` |
| Permission codes | 11 |
| System roles | `OWNER`, `SUPERVISOR`, `CASHIER` |
| Enforced at | **78 call sites** across RLS policies and RPCs |
| Used by the apps | 23 call sites (`useCan`, `<Can>`, `list_my_permissions`) |
| Custom per-store roles | schema supports it (`roles.store_id`), no UI |

Codes are `module.resource.action`, matching the architecture doc's
convention: `pos.sale.void`, `inventory.transfer.manage`, `staff.manage`, and
eight more.

One wrinkle worth naming: `has_permission()` grants everything to a staff row
with `role = 'admin'`. That is a role-name branch, which §07 of the
architecture doc explicitly rules out ("Nothing in the codebase branches on a
role name"). It is contained inside the single function rather than scattered
through policies, so it is a small, fixable deviation rather than a structural
one — but it is a real deviation.

## System B — `core` RBAC (designed, not built)

From Architecture v1 §07 and the §03 schema diagram, which place
`roles / permissions / role_permissions / staff_roles` in `core`.

| | |
|---|---|
| Tables | the same four, in `core`, plus `staff_permission_overrides` |
| Keyed on | `core.staff.id` |
| Permission codes | ~30, including a `core.*` namespace and `accounting.*` |
| Role assignment | **optionally branch-scoped** |
| Overrides | **time-boxed grant or revoke** on top of a role |
| Built today | nothing. `core.staff` has no role column at all |
| Interim stand-in | `core.is_org_wide_staff()` — true when `branch_scope = 'ALL'` |

The 11 interim call sites are already annotated with their intended targets
(`-- PHASE 3: core.staff.create`, `core.branch.manage`, and so on), so the
mapping work is specified rather than guesswork.

---

## What actually overlaps

They are not competing designs so much as **one design at two stages of
completion**. Both are `staff → staff_roles → role_permissions → permissions`
resolved per query through a `stable security definer` function. The naming
convention is the same. The seeded role bundles are the same idea.

The genuine differences are three, and only three:

1. **Location.** `public` vs `core`.
2. **Branch scoping.** The doc scopes a role assignment to a branch. System A
   cannot express "supervisor, but only at the Cubao branch".
3. **Time-boxed overrides.** The doc can grant or revoke one permission for
   one person until a deadline. System A cannot.

Everything else — the resolution path, the code format, the bundling — is
already shared.

## What each direction costs

**Migrate to `core` (Phase 3 as originally written):**

- Create four tables and re-seed permissions and roles in `core`
- Rewrite **78** enforcement sites, each one a live authorization check on a
  system handling money
- Rewrite both apps' `src/lib/permissions/` and 23 call sites
- Run both systems in parallel during the transition, keeping them in sync —
  the window in which a permission means one thing to a policy and another to
  the UI is exactly where authorization bugs live
- Migrate `staff_roles` rows keyed on `public.staff.id` to `core.staff.id`

**Retire the interim into `public` (the inversion):**

- Rewrite **11** call sites, each already annotated with its target code
- Add ~6 `core.*` permission codes (`core.organization.manage`,
  `core.branch.manage`, `core.staff.view/create/assign_role`, `core.audit.view`)
- Resolve `core.staff.user_id` → `public.staff.id`; these are the same uuid,
  so the join is trivial
- Drop `core.is_org_wide_staff()` once nothing calls it

The ratio is 78-and-two-frontends against 11.

There is also a mitigating fact about those 11: **`core` is not exposed to
PostgREST.** A browser cannot reach `core.organizations` or `core.staff`
directly — it gets `PGRST106` — so those policies are defence in depth behind
SECURITY DEFINER functions rather than the front line. Weakening the argument
for urgency, not for correctness: they should still become real permission
checks, but nothing is currently exposed by their being coarse.

---

## The precedent that already exists

The architecture doc's §03 specifies four schemas — `core`, `pos`,
`inventory`, `accounting` — with grants between them enforcing module
boundaries. **That was not adopted.** This system is one `public` schema plus
`core`, because rewriting a live POS onto a four-schema layout was judged too
risky for the benefit, and the integration proceeded additively instead.

That decision is already made and already shipped. Moving RBAC into `core`
would be re-adopting one piece of a structure the rest of the system
deliberately declined — the tables would sit in `core` while every object they
guard sits in `public`.

---

## Recommendation

**Keep System A. Retire `core.is_org_wide_staff()` into it.**

Concretely:

1. Add the missing `core.*` permission codes to `public.permissions`, and
   grant them to `OWNER`.
2. Rewrite the 11 policies in `20260815091400_phase2_rls_baseline.sql` to call
   `has_permission()` with the codes already written in their comments,
   resolving `core.staff.user_id` to the staff id.
3. Drop `core.is_org_wide_staff()`, so there is one answer to "may this person
   do this" and no second one to drift.
4. Remove the `role = 'admin'` shortcut inside `has_permission()`, replacing it
   with an explicit `OWNER` role holding every permission — which the seed
   already creates. This closes the §07 deviation and costs one migration.
5. Add branch scoping and time-boxed overrides **when a feature needs them**,
   as columns on the existing `staff_roles` and a new
   `staff_permission_overrides` table. Both are additive to System A; neither
   requires it to move.

The reasoning in one line: the doc describes a greenfield platform, this is a
live one, and 78 working checkpoints are worth more than schema tidiness.

### What this gives up

Being honest about the cost of the recommendation:

- Authorization tables live in `public` alongside tenant data, not in `core`
  with the other platform concerns. That is a real inconsistency, and someone
  reading `core` will reasonably expect to find roles there. Mitigation is a
  comment in `core` pointing at `public` — cheap, but it is a signpost for a
  wrong turn rather than the absence of one.
- If a future module (Accounting) is built in its own schema after all, its
  permissions would still resolve through `public`. Workable, and worth
  revisiting *then*, with that module's requirements in hand rather than
  speculatively now.

### The alternative worth stating fairly

If the four-schema architecture is going to be adopted eventually — if this is
genuinely deferred rather than declined — then moving RBAC to `core` is
cheapest **before** more checkpoints accumulate, and doing it later only makes
this same decision harder. The recommendation above assumes the four-schema
design stays declined. **If that assumption is wrong, the recommendation
flips**, and that is the actual question to answer.

---

## The decision needed

One of:

- **A — adopt the recommendation.** One migration retires the interim, one
  closes the `admin` shortcut. I can prepare both.
- **B — commit to `core`.** Then Phase 3 proceeds as originally written, and
  it should be scheduled deliberately, with the parallel-run window planned
  rather than discovered.
- **C — leave it.** Defensible in the short term, since nothing is broken.
  The cost is that `is_org_wide_staff()` keeps being copied into new `core`
  policies as they are written, and the 11 becomes 20.

Nothing here is urgent. It is only getting more expensive.
