# Tindahan POS — Codebase Audit, Consolidated

**One file combining three documents produced over this audit's lifecycle:**
`CODEBASE_AUDIT_REPORT.md` (original static review, 2026-09-02), `AUDIT-RETEST.md`
(the dev team's point-by-point re-verification against staging, 2026-09-03), and
the resolution of the one finding the retest left open (#470, closed same day on
branch `feat/void-pin-and-cash-out-cap`, commit `dd66178`).

Read the **Outcome** column first — it tells you whether a row still needs your
attention. Everything else is the evidence trail underneath it.

> No BIR compliance or accreditation claim is made or implied by this document.
> Where a conclusion required a live database session or a BIR-rules
> interpretation, it is marked **REQUIRES LIVE VERIFICATION** or **REQUIRES BIR
> VALIDATION** below, consistent with the original report.

---

## How to read this

1. **Timeline** — what happened, in order, so you don't have to reconstruct it from three files.
2. **Master findings table** — every finding, one row each, with its final outcome.
3. **Detail by finding** — the original claim, the retest's verification (command + expected output, so you can re-run it yourself), and the fix.
4. **#470 close-out** — the one finding that was still open when the retest was written, resolved separately.
5. **What was deliberately not done, and why** — so silence isn't mistaken for an oversight.
6. **Architecture Scorecard** — carried over from the original report; not re-scored in the retest.

---

## 1. Timeline

| Date | Event |
|---|---|
| 2026-09-02 | Original static audit (`CODEBASE_AUDIT_REPORT.md`) — no `.git` history, no installed dependencies, no live DB access. 22 findings (SEC-001–011, R1–R6), plus type/testing/performance sections. |
| 2026-09-02 | Same day — `AUDIT-REMEDIATION-PLAN.md` written by the dev team: verifies the report's live-dependent claims against real git history and staging, re-prioritizes by actual risk, and plans one PR per finding. |
| #459–#469 | Fixes shipped, each its own PR, per the plan above. |
| 2026-09-03 | `AUDIT-RETEST.md` — every finding re-verified against staging (`dev` at `c058ade`, 141 migrations, 33 pgTAP suites, 1,073 web tests) with a literal command + expected output for each. One finding (#470) left open by design — it needed a product decision, not code. |
| 2026-09-03 | #470 decided ("build real enforcement") and shipped: `void_requires_pin` and `cashier_cash_out_cap` became real, server-enforced store settings. Committed as `dd66178`, branch `feat/void-pin-and-cash-out-cap`, one commit ahead of `main`, not yet merged. |

---

## 2. Master findings table

| ID | Severity (orig.) | Finding | Outcome | Detail |
|---|---|---|---|---|
| SEC-001 | P0* | PII in committed backup dumps | **Closed — never happened.** No commit ever touched the backup path or the cited email; the dumps are correctly gitignored. No key rotation, no DPA notification triggered. | §3.1 |
| SEC-002 | P1 | `adjust_product_stock()` RPC overgrant (`anon`/`service_role`) | **Fixed — and was worse than reported.** Live ACL showed a PUBLIC grant too, reintroduced by a later migration that dropped/recreated the function. Fixed in #459; an ACL-sweep script now exists to catch a repeat. | §3.2 |
| SEC-003 | P1 | Receiving page had no client-side role gate | **Fixed, severity corrected.** Gated on `useCan("inventory.stock.receive")` in #461. The underlying write was already refused server-side by RLS — the real gap was a cashier seeing a raw DB error, not a privilege escalation. | §3.3 |
| SEC-004 | P1 | `customers.balance`/`credit_limit` directly writable, bypassing the ledger | **Fixed — four maintainers, not two.** `BEFORE UPDATE` trigger (`trg_customers_ledger_read_only`) added in #460; direct PATCH now refused with `CUSTOMER_BALANCE_READ_ONLY`/`CUSTOMER_CREDIT_LIMIT_READ_ONLY`. | §3.4 |
| SEC-005 | P1 | Offline-replay credit-override PIN had no lockout | **Fixed — worse than reported.** `p_is_offline_replay` was an ordinary client-supplied boolean with no server-side proof, making it an unlimited PIN oracle reachable while fully online, not just an offline edge case. Both paths now require a token from `check_credit_override_pin()`; raw-PIN checking is gone entirely (#463). | §3.5 |
| SEC-006 | P2 | Inconsistent route-level vs. component-level role gating | **Closed — deliberate, and the "fix" would have broken Supervisors.** Route gate is for *role*-restricted pages, `useCan` for *permission*-restricted ones (Receiving is permission-based, and Supervisor holds that permission — `RequireRole roles={["admin"]}` would lock them out). | §3.6 |
| SEC-007 | P2 | RPC-grant overgrant claimed systemic (6-migration pattern) | **One function, not systemic.** Of 19 `SECURITY DEFINER` functions carrying `anon`/`service_role`, 13 are unreachable trigger functions and 5 are intentional service-role-only Edge Function targets. Only `adjust_product_stock` (SEC-002) was real. | §3.7 |
| SEC-008 | P2 | Two parallel tenant schemas (`public.*` live, `core.*` unconsumed) | **Documented** (`supabase/SCHEMA.md`, #469). One flagged trap: `public`/`core` staff/store row counts differ by design (disjoint keyspaces, not a drifted dual-write) — the doc exists specifically to prevent that misreading. | §3.8 |
| SEC-009 | P3 | Settings toggles (void-PIN, cash-out cap, utang-block) stored in localStorage only | **Filed as #470, not fixed at retest time — since resolved.** `blockUtangPastLimit`'s real protection was already server-enforced by the credit-limit check. `voidNeedsPin`/cash-out cap were genuinely UI-only at retest time; closed separately (§4). | §3.9, §4 |
| SEC-010 | P3 (informational) | Client secret-exposure check | **Confirmed clean** in the original report; not separately retested. | — |
| SEC-011 | P3 (informational) | Core financial-RPC soundness check | **Confirmed clean** in the original report; not separately retested. | — |
| §D | P2 | Offline error classification treated any unrecognized rejection as connectivity (phantom-sale risk) | **Fixed structurally, #464.** Now keyed on SQLSTATE (`P0001` = server considered and refused) rather than a hand-maintained message allow-list; only genuinely transient Postgres error classes still queue. | §3.10 |
| P1 (testing) | P1 | No explicit double-submit/double-click test on Complete Sale | **Test added, #465 — and the stated rationale for low risk was wrong.** `client_request_id` is minted client-side per `checkout()` call, so two clicks mint two different ids — the database's unique index does *not* catch this. The disabled-while-in-flight button is the only real guard; it's now tested. | §3.11 |
| — | — | "4 failing tests," "no lockfile," "no CI workflow" | **All three false — same root cause.** The audit ran `npm install` *inside* `apps/tindahan-pos` (an npm-workspace member), which nested a shadow `node_modules` with a newer jsdom than the root's locked version. The lockfile and 3 CI workflows were there all along, at the workspace root. `npm ci` at the root → 1051/1051 passing. | §3.12 |
| R1 | P1 | 39 catch blocks bypass `describePlatformError()`, showing raw backend strings to shop owners | Not separately retested in `AUDIT-RETEST.md` (outside its scope, which tracked SEC-* and §D/testing items) — **status unconfirmed**, flagged here so it isn't lost. | §3.13 |
| R2–R6 | P2–P3 | Modal-shell duplication, currency-formatter duplication, date-format duplication, one inline stock-status reimplementation, inline spinner duplication | R3 (PESO) fixed and generalized (**#466**, added `PESO_WHOLE` rather than collapsing all three uses, since one is genuinely different — whole-peso till display). R2/R4/R5/R6 **not separately retested** — status unconfirmed. | §3.13 |
| — | P2 | Coverage thresholds (90% configured) vs. measured (89.96/81.59/74.98%) | **Fixed, #467 — and CI never evaluated them.** CI ran `vitest run`, not `vitest run --coverage`, so the threshold config was silently inert regardless of the numbers. Thresholds reset from measured values as a ratchet; `--coverage` wired into CI. | §3.13 |
| E-1, E-2 | P2 | 2 `: any` occurrences erasing money/permission-relevant types | **Fixed, #468.** `typescript/no-explicit-any` set to error; a third occurrence a plain grep missed (`(props: any)`) was caught by the rule itself. | §3.13 |

\* SEC-001's P0 rating was conditional on live verification in the original report — see §3.1 for why it closed.

---

## 3. Detail by finding

### 3.1 · SEC-001 — PII in committed backups → Closed, never happened

**Original claim:** production customer PII sits in plaintext under `supabase/backups/`; `.gitignore` excludes it *today*, but the audit had no `.git` history to confirm it was never committed *before* that rule existed. Filed P0 with key rotation and a Data Privacy Act notification attached.

**Retest, re-runnable:**
```bash
git log --all --oneline -- 'apps/tindahan-pos/supabase/backups'
git log --all --oneline -S'<the address the leaked dump cited>'   # redacted here deliberately — see note below
git log --all --name-only --oneline -- '*backup*.sql' | sort -u
```
*(An earlier revision of this document quoted the actual address inline in this
command. That published a third party's real email address to this repository's
public history — a separate problem from the one this section is about, and one
this document itself caused. Redacting it here does **not** undo that: the
earlier blob remains reachable from history, so this is disclosure, not
remediation. Scope, so it is neither dismissed nor inflated: one address, in
one commit. No backup dump was ever committed — the conclusion below is
unaffected. Tracked separately for a decision on repository visibility.)*
**Expected:** the first two print nothing; the third shows exactly one file, `20260815135000_backups_bucket.sql` — a migration creating a storage *bucket*, not a data dump.

**Conclusion:** the 16 dump files on disk are correctly gitignored and were never committed. No key rotation, no DPA notification required.

### 3.2 · SEC-002 — `adjust_product_stock` overgrant → Fixed (#459), and worse than reported

**Original claim:** the function's revoke statement only stripped `public`, not `anon`/`service_role` explicitly — the same pattern six earlier migrations had to fix elsewhere.

**Retest finding:** live ACL was actually `=X/postgres | postgres=X | anon=X | authenticated=X | service_role=X` — the leading `=X/` is the PUBLIC grant. A *later* migration had dropped and recreated the function to add an audit trail, which discards the ACL entirely and re-granted only `authenticated` — silently restoring the very PUBLIC grant the original migration had removed.

**Retest command:** `./scripts/check-function-grants.sh` → **Expected:** `"rows": []`, run against both staging and production (a clean `db push` is not itself evidence — see mechanism above).

**Fix:** explicit `revoke all ... from public, anon, service_role` reapplied; the sweep script above now exists to catch a repeat.

### 3.3 · SEC-003 — Receiving page ungated → Fixed (#461), severity corrected

**Original claim:** `Receiving.tsx` had zero role/permission checks, unlike every comparable admin page; route only wrapped in `<ProtectedRoute>`.

**Retest correction:** confirmed the gap, but the *severity* was overstated — the write itself was already refused server-side by RLS on `receiving_entries`/`receiving_lines` (`auth_role() = 'admin' or has_permission('inventory.stock.receive')`) and by `adjust_product_stock()`'s own `inventory.product.manage` requirement. The actual exposure was a cashier reaching a form they could not submit and seeing a raw database error — not a privilege escalation.

**Fix:** gated on `useCan("inventory.stock.receive")`. **Retest:** sign in as cashier, open `/inventory/receiving` directly → expect redirect to `/pos`; `npx vitest run src/pages/Receiving`.

### 3.4 · SEC-004 — Direct `customers.balance`/`credit_limit` writes → Fixed (#460), four maintainers not two

**Original claim:** no trigger restricts direct writes to these two columns; the general admin RLS policy allows a PATCH that bypasses `checkout_sale()`/`record_credit_payment()` with no audit trail. (The report also stated no trigger existed on `customers` at all — the retest notes one did, `trg_customers_log_delete`, but it only logs deletes, so the underlying conclusion held.)

**Retest correction:** the report named 2 functions that legitimately write these columns; the catalogue shows 4 — `checkout_sale`, `record_credit_payment`, `refund_sale_items`, `void_sale`.

**Fix:** `trg_customers_ledger_read_only` trigger added. **Retest — reproduce the original attack:**
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/customers?id=eq.<id>" \
  -H "apikey: $ANON" -H "Authorization: Bearer <admin jwt>" \
  -H "Content-Type: application/json" -d '{"balance": 0}'
```
**Expected:** refused, `CUSTOMER_BALANCE_READ_ONLY` (same for `credit_limit`, and for an INSERT carrying a negative opening balance). The pgTAP suite also confirms the RPCs above still work normally — a guard that broke them too would have just moved the outage.

### 3.5 · SEC-005 — Offline-replay override-PIN lockout → Fixed (#463), materially worse than filed

**Original claim:** the offline-replay path of `checkout_sale()`'s credit-override check had no attempt lockout, unlike the online path's 5-attempt lockout.

**Retest finding:** `p_is_offline_replay` was an ordinary client-supplied parameter with nothing server-side establishing that a call claiming to be a replay actually was one — meaning **any authenticated session could set that flag to `true` while fully online** and get unlimited, unrate-limited guesses at an admin's PIN. This wasn't an offline-only edge case; it was a bypass of the online lockout, reachable online.

**Fix:** both paths now require a validated, single-use token from `check_credit_override_pin()`; `checkout_sale()` no longer accepts or checks a raw PIN at all.

**Retest:**
```sql
select case when pg_get_functiondef(oid) ~ 'crypt\(p_override_pin' then 'PRESENT' else 'gone' end
  from pg_proc where proname = 'checkout_sale';
```
**Expected:** `gone`. Behaviorally covered by `supabase/tests/390_override_pin_requires_token.sql`: correct PIN refused without a token on replay, a token-carrying replay succeeds, and a wrong guess still persists to `override_pin_failed_attempts` (the part that actually matters — a guard that blocked the raw PIN but still couldn't count would have just relocated the oracle).

### 3.6 · SEC-006 — Inconsistent route gating → Closed, deliberate

**Original claim:** `/admin`, `/staff`, `/reports` self-check in-component while `/settings/*` gates at the route level via `<RequireRole>` — inconsistent, and the same failure pattern `RequireRole`'s own doc comment says already caused a real bug once (every `RequireRole`-wrapped route previously rendering fully for any signed-in staff member who typed its URL).

**Retest correction:** this is documented intent, not drift — route-level gating is for *role*-restricted pages, `useCan` for *permission*-restricted ones. And the report's own suggested fix would actively break something: `RequireRole` takes role literals, but Receiving is gated on the permission `inventory.stock.receive`, which Supervisor holds even though Supervisor isn't `role: admin`. Wrapping it in `RequireRole roles={["admin"]}` would lock out Supervisors who are entitled to the page.

**Verified:**
```sql
select r.name, bool_or(rp.permission_code = 'inventory.stock.receive')
  from roles r left join role_permissions rp on rp.role_id = r.id group by r.name;
```
**Expected:** Owner `true`, Supervisor `true`, Cashier `null`.

Standardizing further is still defensible, but needs a permission-aware route wrapper that also waits for permissions to load (otherwise it reintroduces a documented bug already seen in `Suppliers.tsx`, where an authorized owner was bounced to `/pos` on direct navigation) — a real design change, not a P2 tidy-up, and correctly not folded in here.

### 3.7 · SEC-007 — "Systemic" RPC overgrant → One function, not a sweep

**Original claim:** the overgrant pattern required 6 separate migrations to close historically, implying an ongoing systemic risk.

**Retest breakdown of the 19 `SECURITY DEFINER` functions carrying `anon`/`service_role`:**
- 13 are trigger functions — Postgres refuses a direct call to one, so the grant is unreachable from any client.
- 5 are intentionally `service_role`-only (`_consume_pairing_code`, `_validate_pairing_code`, `file_account_deletion_request`, `finalize_account_deletion`, `get_deletion_request_for_approval`) — exactly the functions Edge Functions call with the service-role key.
- 1 was real: `adjust_product_stock` (SEC-002).

**Retest:** `./scripts/check-function-grants.sh` (excludes trigger functions and the by-design service-role set) → **Expected:** `"rows": []`.

Note on tooling: this has to be a script reading `pg_proc.proacl` on a hosted project, not a pgTAP test — the overgrant originates in Supabase's project-level default ACL, which CI's throwaway local stack doesn't have, so the condition can't exist there to test against. A static lint over migration files was tried and rejected (fired on 76 of 90 migrations — too noisy to be useful).

### 3.8 · SEC-008 — Dual schema authority → Documented (#469)

**Original claim:** the codebase runs two parallel tenant models simultaneously — the live `public.*` schema and a fully-built but unconsumed `core.*` multi-branch schema — risking a reviewer evaluating the wrong one as the real security boundary.

**Fix:** documented in `apps/tindahan-pos/supabase/SCHEMA.md`.

**One trap flagged in the retest, worth knowing:** the row counts between the two schemas disagree (915 vs 919 staff, 909 vs 913 organizations), which reads like a drifted dual-write. It isn't:
```sql
select count(*) from core.staff c
 where not exists (select 1 from public.staff p where p.id = c.id);
```
**Expected: 919** — i.e., they share **zero** ids. `public.staff.id` *is* the `auth.users` id (which is why every RLS policy reads `staff where id = auth.uid()`); `core.staff` has its own surrogate id plus a `user_id` FK (917 of 919 linked, the other 2 being unaccepted invitations). Same people, two separate keyspaces, neither a copy of the other — comparing raw counts and concluding drift is the wrong read.

### 3.9 · SEC-009 — Settings toggles in localStorage only → Filed as #470

**Original claim:** `voidNeedsPin`, `blockUtangPastLimit`, `cashierCashOutCap`, and general store-profile settings persist to `localStorage` only, per-device — and `voidNeedsPin`/cash-out cap weren't confirmed to be independently enforced server-side.

**Retest finding:** the implementation gap was deliberate and documented (`feesLimitsMock.ts`'s own `TODO`), so not a defect by itself — no code changed at retest time. `blockUtangPastLimit`'s real protection was already server-enforced separately (the credit-limit check in `checkout_sale()`), which mitigated that specific control. But the **UI-facing half was flagged as a genuine problem**, filed separately as #470: Settings → Fees & limits renders "Void needs PIN" and the cash-out cap as ordinary working controls that toggle and persist, with nothing indicating they don't actually do anything yet. An owner switching either on has every reason to believe it's now enforced. Deciding whether/how to enforce them was called a product decision, not made unilaterally in the retest pass.

**Resolution:** see §4 — closed same day as the retest, "build real enforcement" chosen and shipped.

### 3.10 · Offline error classification (§D in the original report) → Fixed structurally (#464)

**Original claim:** `classifyCheckoutError.ts` treated any `checkout_sale()` rejection message *not* on an explicit allow-list as a connectivity failure — queue-and-retry — rather than a business-rule rejection, risking a "phantom sale" (receipt printed, stock/balance already optimistically patched) if a future migration added a new rejection message without updating the allow-list in lockstep.

**Retest addition:** the allow-list's own history showed this had *already happened* — six of its entries were each added after the trap sprang in production, their comments describing the same incident (`ORG_WRITES_SUSPENDED`) four times over. The defect wasn't six missing entries; it was that correctness depended on a list kept perfectly in sync with every migration, indefinitely.

**Fix:** classification now keys on SQLSTATE — every `raise exception` in this codebase arrives as `P0001`, which is proof the server considered and refused the request regardless of the message text. Only genuinely transient Postgres error classes (connection/resource-unavailable classes 08/53/57 including statement timeout, plus serialization failures 40001/40P01) still queue for replay, since those roll back and `checkout_sale` is idempotent on `client_request_id` anyway.

**Retest:** `npx vitest run src/lib/offlineQueue` — the load-bearing test asserts an *invented* rejection (`{code: "P0001", message: "SOME_RULE_INVENTED_NEXT_QUARTER"}`) is refused rather than queued, with nothing having listed it explicitly. The one deliberately-kept default: a response with no code and no known message still leans toward "connectivity" — wrongly blocking a real offline sale was judged worse than queuing one twice.

### 3.11 · Double-submit / double-click guard on Complete Sale → Test added (#465), reasoning corrected

**Original claim:** flagged as a testing gap (P1) — no explicit test asserts a duplicate-submission guard exists — but reasoned the underlying idempotency-key mechanism would "likely still prevent an actual double-charge even without a UI-level guard."

**Retest correction: that reasoning was wrong, not just untested.** `client_request_id` is minted *inside each `checkout()` call* in `storeData.tsx` — so two clicks call `checkout()` twice, mint two different ids, and produce two distinct sales. The database's unique index protects against a *replay of one already-queued sale*, a different problem entirely. It does **not** protect against two live clicks. The disabled-while-in-flight Complete Sale button is therefore not a UX convenience layered on top of a database guarantee — it is the **only** thing preventing an actual double charge.

**Fix:** test added, confirmed to fail if `checkingOut` is removed from `disableComplete`. **Retest:** `npx vitest run src/pages/Pos/Pos.test.tsx`.

### 3.12 · "4 failing tests," "no lockfile," "no CI" → All three false, one root cause

All three environment-level claims in the original report trace back to a single mistake: the audit ran `npm install` **inside** `apps/tindahan-pos`, which is a member of an npm workspace, rather than `npm ci` at the **workspace root**.

- **"No CI workflow"** — `ls .github/workflows/` → `backup-production.yml`, `platform-ci.yml`, `tindahan-pos-ci.yml`. `platform-ci` runs the pgTAP suites; `tindahan-pos-ci` runs lint, typecheck, build, and unit tests.
- **"No lockfile"** — the workspace lockfile lives at the root and is tracked: `git ls-files --error-unmatch package-lock.json` succeeds.
- **"4 failing tests"** — `npm install` inside `apps/tindahan-pos` (no lockfile *in that directory*) resolved a nested `node_modules` with `jsdom 27.4.0`, shadowing the root's locked `27.0.1`. That version mismatch is what produced the 4 failures — an environment artifact of how the audit itself was run, not an application bug. CI was green on the same commit throughout.

**Retest (reproduces both the break and the fix):**
```bash
rm -rf apps/tindahan-pos/node_modules apps/tindahan-pos/package-lock.json
npm ci
cd apps/tindahan-pos && npx vitest run
```
**Expected:** all suites pass. Worth knowing how badly the shadowed install skewed the picture: through the app's own `npx`, 4 tests failed; through the pre-push hook (which uses the root binaries), **523** failed. Neither number described the actual code.

### 3.13 · The remaining items (R1–R6, coverage, `: any`)

The retest's explicit scope was the SEC-* findings, §D, and the testing gap — it did not re-verify every R-series (redundancy/reusability) finding from the original report's Section B2. What it *did* cover, plus what's still open:

| Item | Status | Detail |
|---|---|---|
| R3 — PESO duplicated across 3 files | **Fixed, #466** | Two copies were identical and consolidated; the third (Landing page) genuinely differs (no centavos) and was named explicitly as `PESO_WHOLE` rather than silently collapsed — collapsing it would have made till totals render without centavos. |
| Coverage thresholds (90% configured vs. 89.96/81.59/74.98% measured) | **Fixed, #467** | The deeper bug: CI ran `vitest run`, not `vitest run --coverage` — the threshold config was never actually evaluated by CI regardless of the numbers. Thresholds reset from measured values as a ratchet, and `--coverage` wired into CI so it can't go silent again. |
| E-1, E-2 — 2 `: any` occurrences (money/permission-relevant) | **Fixed, #468** | `typescript/no-explicit-any` set to `error`. A plain grep for `: any` catches 2 of the 3 real occurrences; the lint rule caught the third (`(props: any)`, missed by a word-boundary-based search). |
| R1 — 39 catch blocks bypass `describePlatformError()` | **Not retested — status unconfirmed** | Flagged here so it doesn't fall out of view; not covered in `AUDIT-RETEST.md`. |
| R2 — 20+ modals duplicate the overlay/focus-trap scaffold | **Not retested — status unconfirmed** | Same. |
| R4 — date/time formatting duplicated in 3+ places | **Not retested — status unconfirmed** | Same. |
| R5 — one inline stock-status reimplementation | **Not retested — status unconfirmed** | Same. |
| R6 — inline loading-spinner duplication | **Not retested — status unconfirmed** | Same, and always P3/low-risk. |

---

## 4. #470 close-out — void-needs-PIN and cash-out cap, now real

This is the one line item the retest (§9 above) left open by design: two Settings → Fees & limits controls — "Void needs PIN" and the cashier cash-out cap — rendered as working toggles that saved and persisted, with no server-side enforcement behind either one. The retest called deciding how to close it "a product call," not something to do unilaterally, and listed three options.

**Decision made:** build real, server-side enforcement — matching the pattern already proven for the credit-limit override (SEC-005/§3.5 above): a real store column, checked inside the actual RPC that performs the sensitive write, gated behind the same short-lived single-use admin-PIN token mechanism (`check_credit_override_pin()` / `credit_override_tokens`), reused as-is rather than duplicated.

**Shipped** on branch `feat/void-pin-and-cash-out-cap`, commit `dd66178`, one commit ahead of `main` at the time of writing — **not yet merged**.

**`void_requires_pin`** (`stores.void_requires_pin`, boolean, default `false`) — enforced inside `void_sale()`. When on, a Supervisor voiding a sale needs a validated owner-PIN token; an Owner voiding their own store's sale is exempt (the toggle guards against a Supervisor acting unaccompanied, not against an Owner approving their own action). `void_sale()`'s signature grew from `(uuid, text)` to `(uuid, text, text default null)` via `CREATE OR REPLACE` — the same in-place signature-growth mechanism `checkout_sale()` has used across 20+ migrations — so an old client calling the original 2-argument shape keeps working unchanged for any store that leaves the toggle off.

**`cashier_cash_out_cap`** (`stores.cashier_cash_out_cap`, numeric, nullable — `null` = unlimited) — enforced inside `checkout_sale()`, against the actual cash physically handed over on cash-out service lines, summed across every cash-out line in the sale, whatever the payment type. This required extending the wire protocol: a cash-out service line previously reported only its fee revenue to the server (`{label, amount, fee}`); the server had no visibility into the cash actually handed over at all, which lived solely in the browser's drawer arithmetic. The client now also sends `service_type`/`cash_handed_over`, threaded through the offline queue's replay payload too, with `ServiceType` as a proper 4-value union rather than `string`. A negative `cash_handed_over` on one line can't be used to net out a large one on another and slip under the cap (`greatest(coalesce(cash_handed_over, 0), 0)` before summing) — a hardening gap caught in review, not observed in production. An Owner processing their own store's cash-out is exempt, same rationale as the void toggle.

**Both enforcement points reuse the same token mechanism** (`check_credit_override_pin()`), not new machinery — the function's job ("an admin of this store typed their PIN just now, here is a 5-minute single-use receipt of that") was never actually specific to credit; the name is a historical accident of what needed it first.

**Client wiring:** `Store` type, Settings page (the toggle and the cap field now read/write real store columns instead of `localStorage`), the POS checkout flow (a new `AdminPinModal`, reused for both the cash-out-cap-exceeded retry and the void-PIN-required retry, modeled on the existing credit-limit override-approval modal), the Reports page's void flow, and the Staff page's cashier-permission display (previously hardcoded "needs-pin" for cash-out regardless of the actual setting; now reflects whether a cap is actually configured).

**Validation actually run, honestly reported:**
- `tsc -p tsconfig.app.json --noEmit` and `tsc -p tsconfig.node.json --noEmit`, run against the full working tree from the correct workspace root — **passed, 0 errors.**
- The commit message on `dd66178` additionally states 1,075 web tests pass and lint is clean — that run happened in an environment with working `oxlint`/`vitest` native bindings (this session's own sandboxed device shell hit `Cannot find native binding` errors for both, an environment problem specific to that sandbox, not re-run independently here).
- Two new pgTAP suites ship with the migrations (`430_void_requires_pin.sql`, `440_cashier_cash_out_cap.sql`) — the commit message states these "run on this PR" (i.e., in CI once opened); not independently executed in this pass.

**Still outstanding:** the branch is not yet merged into `main`, and no pull request had been opened as of this writing.

---

## 5. Deliberately not done — and why

Carried forward from `AUDIT-RETEST.md` §16, so silence on these isn't mistaken for an oversight:

- **`storeData.tsx` refactor** (~1,100 lines, the original report's own B-section flagged this as a "god provider"). The original report itself advised against doing this preemptively. Agreed — uncomfortable, not broken.
- **`uuid`/`exceljs` dependency advisories** (2 moderate-severity, `npm audit`). The available fix is a breaking downgrade (`exceljs` to 3.4.0); worth revisiting now that the dependency tree is back to its locked state, but wants its own decision rather than being folded into this audit.
- **Completing the `core.*` schema migration.** Changes what a "store" means to the client — needs its own design pass, not incremental changes from whoever next touches a migration. Recorded in `SCHEMA.md`'s "the unfinished part" section.
- **Raising branch coverage from 75%.** Making the coverage gate actually run (§3.13) was a different, narrower change and wasn't allowed to smuggle in the larger effort of raising the number itself.

---

## 6. Architecture Scorecard

Carried over verbatim from the original report — **not re-scored** as part of the retest, since the retest's scope was verifying individual findings rather than re-running the full five-pass review. Several inputs to these scores have since changed (SEC-002/003/004/005 fixed, coverage gate now real, `: any` eliminated) — read these as the starting point the fixes above were measured against, not the current state.

| Category | Score | Notes |
|---|---:|---|
| Architecture | 7/10 | Clear feature boundaries, centralized types, sound DB-transaction design; docked for the `storeData.tsx` god-provider and the dual-schema (public/core) transition state. |
| Security | 6/10 | Core financial RPCs and RLS tenant-isolation genuinely strong; docked for the direct-customer-write gap, the recurring RPC-grant overgrant pattern, and the missing Receiving-page gate — all since fixed (§3.2–3.4), none were structural. |
| Type Safety | 9/10 | Near-`any`-free under full `strict` mode, generated DB types wired in, no real type duplication found. |
| Reusability | 6/10 | Centralized types and services layer, single canonical discount/VAT/credit-limit math; docked for the `describePlatformError()` bypass (R1) and the modal/currency/date duplication (R2–R4) — PESO duplication since fixed (§3.13), the rest unconfirmed. |
| Maintainability | 7/10 | Strong "explain the why" comment culture, no dead code found; docked for a handful of oversized files. |
| Testability | 8/10 | Unusually thorough, behavior-focused test suite; docked for the coverage/threshold mismatch and the missing double-submit test — both since fixed (§3.11, §3.13). The "4 failing tests" behind this score were an audit-environment artifact, not real failures (§3.12). |
| Performance | Not fully scored | No dedicated pass performed in the original review; spot checks found nothing alarming. |
| Database Design | 8/10 | Consistent constraints, atomic `SECURITY DEFINER` functions for every financial mutation, real RLS tenant-isolation tests; docked for the RPC-grant sweep gap (since fixed) and the dual-schema transition (since documented). |
| API Design | 8/10 | RPC-first design for anything financial; consistent client-side error-code handling. |
| Code Readability | 8/10 | Clean naming, explicit types, genuinely explanatory comments across every file sampled. |
| Error Handling | 7/10 | Consistent server error-code handling; docked for the offline-error allow-list fragility — since fixed structurally (§3.10). |
| Production Readiness | 6/10 | Held back by the unresolved live-verification items, the (environment-artifact) failing tests, and the CI-workflow question the original report couldn't confirm — all resolved or closed as false alarms in the retest (§3.12). |

---

*Consolidated from `CODEBASE_AUDIT_REPORT.md`, `AUDIT-RETEST.md`, and the #470 close-out on `dd66178`. No BIR compliance or accreditation claim is made or implied by this document.*
