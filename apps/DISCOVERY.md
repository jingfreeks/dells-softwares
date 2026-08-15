# DISCOVERY.md — Core platform integration, Step 1

Produced per `INTEGRATION-PROMPT.md` §2. No code changes made. This is the
gate: nothing in §3 onward should start until this is reviewed.

## How this was produced

- **Codebase inspection**: fresh, exhaustive greps/reads across both apps'
  full `src/` trees (not relying on memory from earlier sessions).
- **Database discovery**: `integration/discovery.sql` (the version supplied
  as `discovery.sql`) run via `docker exec ... psql` against a **local**
  Postgres instance with all 45 of `tindahan-pos/supabase/migrations/*.sql`
  applied fresh — not against the hosted production database.
  - This is schema-equivalent to staging (`DellsSoftware-staging`,
    `qfkdecarbqwbpkzqqdxk`) and production (`DellsSoftware`,
    `zwjwbfzrfjhslyxpsxby`) **as long as no migration was ever applied to
    one of those hosted projects and not committed here**. Given `.temp`
    project-ref linkage shows the Supabase CLI is currently linked to the
    **production** project in this checkout, it should be trivial to
    re-run `discovery.sql` there for a byte-for-byte confirmation before
    Step 2 — recommended, not yet done, to avoid touching production for a
    first pass.
  - Two fields in the JSON are **not representative of anything real** as a
    result: `auth_user_count: 0` (fresh local DB, no signups) and every
    `approx_rows: -1` (no `ANALYZE` has run). Ignore both; re-derive real
    counts from staging/production directly if sizing matters for backfill
    planning.

## Codebase inspection

### TENANCY

- The organization/business table is **`public.stores`** (uuid PK,
  `default gen_random_uuid()`, `tindahan-pos/supabase/migrations/0001_init.sql:29-33`).
- Only one table represents this concept — no duplication. **Not**
  Archetype D.
- PK type: `uuid`.
- Referenced by 27 of the 34 tables in `public`, always via a column named
  **`store_id`** — never `organization_id`/`org_id`/etc. (This is why the
  discovery script's `has_org_column` heuristic reports `false` for every
  table — its keyword list doesn't include `store_id`. The `columns_of_interest`
  section of the same output correctly lists `store_id` on all 27, since
  that section's keyword list does include it. Treat `has_org_column` as a
  false negative across the board.)
- Tables genuinely holding tenant data with **no** direct `store_id`
  column: `sale_items`, `purchase_order_lines`, `receiving_lines`,
  `inventory_count_lines`, `supplier_categories` — all child rows scoped
  indirectly through a parent FK (`sale_id`, `purchase_order_id`, etc.),
  which is normal normalized design, not an oversight (confirmed by
  reading each one's RLS policy — all use an `exists (select 1 from
  <parent> where <parent>.store_id = auth_store_id())` shape). `feature_flags`
  is genuinely global (flag key as PK, no tenant scope, by design).
- `roles`, `permissions`, `role_permissions`, `staff_roles` also have no
  direct `store_id` (see "Pre-existing RBAC" flag below — these are new as
  of this week and matter for planning, not for this step's schema shape).

### BRANCHES

- **No branch/location/store-hierarchy concept exists at all.** Confirmed
  both by the discovery script (no `branches` table in the schema) and by
  reading the codebase — one `stores` row is one physical location, full
  stop. Every "warehouse" (`public.warehouses`) is a stock-location concept
  *within* a store, not a second store/branch — it's inventory-app's
  multi-location stock feature, unrelated to org-hierarchy.

### IDENTITY

- `staff.id` **is** `auth.users.id` — a 1:1 PK/FK relationship, not a
  separate `user_id` column (`staff_id_fkey: staff.id -> auth.users.id`,
  `ON DELETE CASCADE`). `staff` doubles as both the profile row and the
  org-membership row.
- `staff.store_id` is `NOT NULL` — exactly one store per staff row. No
  `staff_stores` join table, no `store_ids[]` array, no code or comment
  anywhere suggesting multi-store staff.
- **A user cannot belong to more than one organization today.** Confirmed
  by schema (single non-null FK) and by explicit codebase search (no
  multi-org UI, no org switcher, no evidence of a shared/pooled login used
  by multiple people).
- Exactly one trigger on `auth.users`: **`on_auth_user_created`**, which
  calls `handle_new_user()` — creates a brand-new `stores` row plus an
  admin `staff` row for every self-registered signup
  (`0001_init.sql:276-302`). This always creates a *new* org; it never
  attaches a new user to an existing one (cashier accounts are provisioned
  separately, out-of-band, via the `create-cashier` Edge Function using the
  service-role key).
- **PIN quick-switch is not a second identity, it's a session overlay.** An
  admin (or a paired device) authenticates normally via Supabase Auth, then
  `start_cashier_session(staffId, pin, openingFloat)` (RPC,
  `tindahan-pos/src/lib/cashierSession/cashierSession.tsx:74`) returns a
  short-lived token stored in `sessionStorage` — not a second
  `auth.users`/`staff` row, and it's implicitly torn down whenever the
  underlying authenticated user changes. Relevant to §10 item 7 of the
  integration prompt, but it is **not** the "shared login" failure mode
  described there — it doesn't change who `auth.uid()` resolves to.

### AUTHORIZATION

- RLS is **enabled on every one of the 34 tables in `public`**
  (`unprotected_tables: []` in the discovery output). Not `FORCE`d on any
  of them (`rls_forced: false` everywhere), but immaterial in practice —
  the app only ever connects via PostgREST as `anon`/`authenticated`, never
  as the table owner, so `FORCE` has no observable effect here.
- Filtering is done by RLS, not by the repository/hook/component layer —
  confirmed no client-supplied `store_id` anywhere (see below). This
  matches Rule 0.6's expectation already.
- **Hard-coded role checks** (`role ===`, `isAdmin`, `auth_role()`, etc.),
  fresh audit — this list has changed materially since any earlier
  discovery, because a real permission system (`0044_rbac_foundation.sql`,
  `0045_rbac_enforce_checkpoints.sql`) shipped this week. See "Pre-existing
  RBAC" below before assuming Phase 3 starts from zero.
  - `tindahan-pos/src/components/ProtectedRoute/ProtectedRoute.tsx:52` —
    `user.role === "admin"` gates the onboarding redirect.
  - `tindahan-pos/src/components/HomeRedirect/HomeRedirect.tsx:21` — admin
    → `/admin`, else → `/pos`.
  - `tindahan-pos/src/components/OnboardingRoute/OnboardingRoute.tsx:35` —
    blocks non-admins from onboarding.
  - `tindahan-pos/src/lib/nav.ts:16,53` and
    `inventory-app/src/lib/nav.ts:67` — `role === "admin"` short-circuits
    nav filtering (admin always sees everything); every other item is
    gated by a `permission` string, not a role string.
  - `tindahan-pos/src/pages/Staff/hooks.tsx:140`,
    `tindahan-pos/src/pages/Staff/lib.ts:66-67,214,216`,
    `.../StaffRow.tsx:54,71,73,86,87` — display/labeling and default
    permission-set lookups keyed off `staff.role`, not access gates per se.
  - **`Suppliers.tsx` (both apps) and the previously-inconsistent 8
    inventory-app page guards no longer contain role checks** — they were
    converted to permission checks this week (`useCan("inventory.*")`
    etc.). Confirmed by reading all of `inventory-app/src/pages/*.tsx`;
    every remaining `role=` match there is a JSX ARIA attribute
    (`role="alert"`), not RBAC.
  - Migration files: `auth_role()` still appears in 18 migration files
    (105 occurrences) as the base admin/cashier check that permission
    checks are additively OR'd against (`... and (auth_role() = 'admin' or
    has_permission('...'))`) — see the "Pre-existing RBAC" note.
- **Service-role key**: zero occurrences anywhere in either app's `src/`.
  The only matches across the whole repo are the four Edge Functions
  (`unpair-device`, `delete-account`, `create-cashier`, `pair-device`,
  under `tindahan-pos/supabase/functions/`, expected/correct), warning
  comments in both `.env.example` files, and a comment in
  `playwright.config.ts` restricting it to CI secrets. **Clean — this is
  not a §10.4 stop condition.**
- **Client-supplied tenant id**: none found. Zero `useParams()`/
  `useSearchParams()` usage in either app's `src/`. Every
  `.eq("store_id", storeId)` call traces back to a `storeId` parameter
  ultimately sourced from the authenticated session (`useAuth().user.storeId`,
  itself loaded from the `staff` row keyed to `auth.uid()` — e.g.
  `inventory-app/src/lib/auth.tsx:44,51,55`). No route, prop, or
  `localStorage` value is ever used to construct a tenant-scoped query.

### DATA ACCESS

- **inventory-app**: fully repository-abstracted. 17 domain modules under
  `src/lib/*`; **zero** page or component files call `supabase.from()`/
  `.rpc()` directly.
- **tindahan-pos**: mostly abstracted (33 modules under `src/lib/*`), with
  two known exceptions, both hook/page-logic files rather than raw JSX:
  `src/pages/Staff/hooks.tsx` (calls `.from("staff")`, `.from("staff_roles")`,
  `.rpc("admin_set_staff_pin")`, `.rpc("assign_staff_role")`,
  `.functions.invoke("create-cashier")` inline) and
  `src/pages/Settings/useReceiptsSettingsPage.ts` (one inline
  `document_series` query). No `.tsx` component under `src/components`
  calls Supabase directly in either app.

### AUDIT

- One real activity table: `public.audit_log`
  (`0038_void_sale.sql:37`), currently written only by `void_sale()`, read
  by `tindahan-pos/src/lib/auditLog.ts` and rendered by
  `Staff/component/activitylogcard/ActivityLogCard.tsx`.
- **Found real mock/fabricated activity data**:
  `tindahan-pos/src/pages/Customers/component/recentpaymentscard/mockRecentPayments.ts`
  exports `MOCK_RECENT_PAYMENTS` — four fake names/amounts, rendered as-is
  by `RecentPaymentsCard.tsx`. This is UI showing fabricated data, not a
  query returning an empty state. Worth fixing independent of this
  integration, and worth knowing about now since the new core's
  `write_audit`/`audit_trigger` may be a natural place to source a real
  version of this card later.
- Separately, `tindahan-pos/src/pages/Settings/*Mock.ts` (profile, receipts,
  backup, fees/limits, alerts) are intentionally `localStorage`-backed
  settings placeholders — a different category (draft UI state, not
  fabricated business records), but a gap if core's model expects these
  settings to live server-side eventually.

## Database discovery (raw output)

Ran via:
```
docker exec -i supabase_db_tindahan-pos psql -U postgres -d postgres -t -A -f - < discovery.sql
```
against a local instance with `tindahan-pos/supabase/migrations/0001` through
`0045` applied.

```json
{
    "enums": {
        "staff_role": ["admin", "cashier"],
        "sale_item_type": ["product", "service"],
        "purchase_order_status": ["draft", "submitted", "partially_received", "received", "cancelled"],
        "inventory_count_status": ["open", "closed"]
    },
    "schemas": [
        "_realtime", "auth", "extensions", "graphql", "graphql_public", "net",
        "pgbouncer", "public", "realtime", "storage", "supabase_functions",
        "supabase_migrations", "vault"
    ],
    "auth_user_count": 0,
    "postgres_version": "17.6",
    "unprotected_tables": [],
    "triggers_on_auth_users": ["on_auth_user_created"]
}
```

> The full `tables`, `policies`, `functions`, `foreign_keys`, and
> `columns_of_interest` arrays (34 tables, 60 RLS policies, 22 functions, 76
> foreign keys) were captured in this session's transcript in full and are
> summarized above rather than re-pasted here in full length — every table
> in `public` has RLS enabled and zero are unprotected; no `core`, `pos`,
> `inventory`, or `accounting` schema exists yet (clear on integration
> prompt §3.1's first conflict check).

## Flags before proceeding

None of these are hard blockers under §10, but all should be read before
Step 2.

1. **Column naming**: the tenant concept is `stores`/`store_id`, not
   `organizations`/`organization_id`. Every template query in
   `INTEGRATION-PROMPT.md` §5.2 needs `stores`→`store_id` substituted
   throughout — mechanical, but easy to get wrong by copy-paste.
2. **No branches table**: use the "synthesize one primary branch per
   organization" fallback from §5.1, not the "copy existing branch ids"
   path from §5.2 — there's nothing to copy. Every staff member should
   land `branch_scope = 'ALL'` for the same reason §5.1 flags it: there is
   no existing branch restriction to preserve, so this is real (not
   placeholder) debt to tag for Phase 3, per the prompt's own guidance.
3. **`staff` mapping needs a shape adjustment**: §5.2's staff backfill
   template assumes the legacy table already has separate `id` and
   `user_id` columns (`select s.id, s.organization_id, s.user_id, ...`).
   Here, `staff.id` **is** `auth.users.id` — there is no separate
   `user_id` column to copy. The backfill must generate a new
   `core.staff.id` and set `core.staff.user_id = staff.id` (the legacy PK
   becomes the new `user_id`, not the new `id`). Get this backfill query
   reviewed carefully — it's the one place the template's assumed shape
   doesn't match reality.
4. **Pre-existing bespoke RBAC system, not a blank slate for Phase 3.**
   `INTEGRATION-PROMPT.md` §1.2 says "do not invent roles and permissions
   tables (phase 3)". This codebase already has one, shipped this same
   week: `public.roles`, `public.permissions`, `public.role_permissions`,
   `public.staff_roles`, a `has_permission()`/`list_my_permissions()`/
   `assign_staff_role()` RPC set, and 11 seeded permission codes
   (`0044_rbac_foundation.sql`, `0045_rbac_enforce_checkpoints.sql`),
   already wired into ~25 RLS policies and both apps' frontends. This
   doesn't block *this* integration (Steps 2-4 here only touch `core`
   identity/tenancy, which this RBAC system doesn't overlap with — it
   layers permissions on top of `public.staff`, not on tenancy). But
   whoever scopes the platform's actual Phase 3 needs this discovery
   document, not a blank-slate assumption, or the result will be two
   competing roles/permissions systems. Flagging now, not proposing a
   resolution — that's a decision for whoever owns Phase 3 sequencing.
5. **Database discovery ran locally, not against the hosted project** —
   see "How this was produced" above. Low risk (same migration history)
   but worth a quick confirmation run against the actual linked production
   project (`zwjwbfzrfjhslyxpsxby`, currently linked in this checkout) or
   staging (`qfkdecarbqwbpkzqqdxk`, what the app's own `.env` points at)
   before treating this as final.

## Archetype classification

**Archetype B — UUID tenancy (the designed path).**

`public.stores` has a `uuid` primary key (`default gen_random_uuid()`),
referenced by 27 tables via a consistently-named column. The column is
called `store_id` rather than `organization_id`, and there's no branches
table and one identity-mapping wrinkle (flags 1-3 above), but none of that
changes the archetype — it's still a straightforward ID-preserving backfill
per §5.2, not the mapping-table detour of Archetype C, and not the
human-decision blocker of Archetype D (only one table represents "the
business," never two).

**Gate**: per Rule 0.1, do not proceed to Step 2 (installing the `core`
schema) until this document has been reviewed. Step 2 also can't start
mechanically yet regardless — the actual `dells-platform` package
(14 migrations + `packages/{types,utilities,database,auth}`) referenced
throughout `INTEGRATION-PROMPT.md` §1 hasn't been provided, only the
discovery script and the integration prompt itself.
