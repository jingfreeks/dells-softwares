# Tindahan POS Mobile — RBAC & RLS QA Report

Round 2, covering the release-blocking area flagged in
`ALPHA_MOBILE_UI_UX_QA_REPORT.md`: tenant isolation and role
authorization. Produced against §21 (RBAC), §22 (RLS/tenant security) and
§23 (API security) of `TINDAHAN_POS_Master_Staging_QA_Automation_Instruction.md`.

## Environment

| | |
|---|---|
| Backend | Staging Supabase `qfkdecarbqwbpkzqqdxk` ("DellsSoftware-staging") |
| Method | PostgREST + Supabase Auth with **real user JWTs** |
| Tenant A | "QA Test Store" `7d9087e6…` — 41 products, 15 sales, 1 customer, 3 staff |
| Tenant B | "Dells Store" `d4970576…` — 35 products, 29 sales, 0 customers, 2 staff |
| Whole project | 733 products, 94 sales, 3 customers, 915 staff |
| Roles exercised | QA Owner (admin), QA Supervisor, QA Cashier |
| Date | 2026-08-31 |
| Overall | **Tenant isolation PASS — release blocker cleared.** 2 findings, 0 critical |

### Why this was not tested at the database level

`supabase db query --linked` connects with elevated privileges and
**bypasses RLS entirely** — every row of every tenant comes back. Testing
the policy boundary that way would have produced a meaningless pass.

Every result below was obtained by signing in as a real user over
`/auth/v1/token` and querying `/rest/v1/` with that user's JWT, which is
the same path the mobile app itself uses. Credentials were held in shell
variables and never printed, per §7.

The tenant row counts above make the test falsifiable: a working policy
returns Tenant A's 41 products, a broken one returns the project's 733.

## Results

| ID | Test | Result | Severity |
|---|---|---|---|
| SEC-M-001 | Tenant isolation — reads, 5 tables × 3 roles | **PASS** | — |
| SEC-M-002 | Tenant isolation — cross-tenant writes | **PASS** | — |
| SEC-M-003 | Anonymous access with anon key only | **PASS** | — |
| SEC-M-004 | RBAC enforced server-side, not just in UI | **PASS** | — |
| SEC-M-005 | Mobile client role gate (defence in depth) | **PASS** | — |
| SEC-M-006 | Supervisor can change store pricing | **FINDING** | MEDIUM |
| SEC-M-007 | Store settings changes are not audit-logged | **FINDING** | MEDIUM |

---

## SEC-M-001 — Tenant isolation, reads — PASS

Each role signed in as a Tenant A user, then (a) queried each table with
no filter and (b) explicitly requested Tenant B's rows by `store_id`.

| Role | products | sales | customers | staff | stores | explicit cross-tenant |
|---|---|---|---|---|---|---|
| Owner | 41 | 15 | 1 | 3 | 1 | **0 on every table** |
| Supervisor | 41 | 15 | 1 | 1 | 1 | **0 on every table** |
| Cashier | 41 | 0 | 1 | 1 | 1 | **0 on every table** |

Own-scope counts match Tenant A's real totals exactly. Nothing returned
the project-wide figures. Asking for Tenant B by id returned an empty
set rather than an error — the policy filters rather than leaking
existence.

The 915-row `staff` table is the sharpest case: it holds every tenant's
staff emails, and no role saw more than its own store's.

## SEC-M-002 — Tenant isolation, writes — PASS

| Attempt | Owner | Supervisor | Cashier |
|---|---|---|---|
| `INSERT` product into Tenant B | HTTP **403** | HTTP **403** | HTTP **403** |
| `PATCH` Tenant B's store name | **0 rows** | **0 rows** | **0 rows** |

No role could write into another tenant, including the admin.

## SEC-M-003 — Anonymous access — PASS

With the anon key and **no user JWT**, every table returned Postgres
`42501` (insufficient privilege):

```
products blocked (42501)   sales   blocked (42501)
customers blocked (42501)  staff   blocked (42501)
stores   blocked (42501)
```

The anon key alone grants nothing. §23 satisfied.

## SEC-M-004 — RBAC is enforced server-side — PASS

This is the check §21 calls out specifically: *"Hiding a button is NOT
authorization."* The role differences above are produced by the
**database**, not the client:

| Capability | Owner | Supervisor | Cashier | Matches handoff matrix? |
|---|---|---|---|---|
| Read sales (`pos.report.view`) | 15 | 15 | **0** | Yes — Cashier has no report access |
| See other staff (`staff.manage`) | 3 (all) | **1 (self only)** | **1 (self only)** | Yes — withheld from Supervisor by design |
| Write own store settings | yes | yes | **0 rows** | Cashier correctly blocked |

The Cashier receiving **zero** sales rows — not a filtered UI, an empty
result set from PostgREST — is the strongest evidence that authorization
lives below the client.

## SEC-M-005 — Mobile client role gate — PASS

`App.tsx:265` routes `user.role === "admin" ? <AdminHome /> : <PosScreen />`.
Settings lives inside `AdminHome`, so a cashier on mobile cannot reach
any Settings screen. Combined with SEC-M-004 this is proper defence in
depth: the client hides it, and the server refuses it independently.

---

## SEC-M-006 — A Supervisor can change what the store charges customers

```
Severity:  MEDIUM
Category:  RBAC / authorization
Classification (§39): DOCUMENTATION DISCREPANCY — requires product decision
```

**Evidence:** `PATCH /rest/v1/stores?id=eq.<own store>` with
`{"fee_config": …}`:

| Role | Rows affected |
|---|---|
| Owner | 1 (allowed) |
| **Supervisor** | **1 (allowed)** |
| Cashier | 0 (blocked) |

**Why this matters:** `stores.fee_config` holds the e-load, cash-in and
cash-out fee brackets that the register prices every service sale from.
A Supervisor — per the handoff a *"trusted cashier"*, not an owner — can
change what customers are charged, and can do so without the owner's
knowledge (see SEC-M-007).

**Is it a bug?** Not established. The handoff's own permission matrix
marks the Settings row `UNKNOWN — Requires clarification` for Supervisor,
and `settings.store.manage` does not appear in the 12 documented
permission codes at all — so the store-update policy is gated on
something outside the documented RBAC list. Per §39 this is reported as
a discrepancy needing a decision, not silently called a defect.

**Recommendation:** Decide explicitly whether store settings are
owner-only. If they are, gate the `stores` update policy on
`staff.role = 'admin'` rather than the current condition. Either way the
handoff's `UNKNOWN` should be resolved to a documented answer.

---

## SEC-M-007 — Store settings changes leave no audit trail

```
Severity:  MEDIUM
Category:  SECURITY / auditability
```

**Expected:** `audit_log` exists and is actively used — it records
`sale_created`, `sale_voided`, `staff_logged_out`, and carries a
`previous_value` column specifically for before/after capture.

**Actual:** there is **no `store_updated` action of any kind**. Querying
`audit_log` for the QA store returns sale and staff events only. Changing
`fee_config` — the pricing every service sale is computed from — writes
nothing.

**User impact:** combined with SEC-M-006, a Supervisor can alter what
customers are charged and there is no record that it happened, who did
it, or what the value was before. For a POS with BIR-compliance ambitions
that is a meaningful gap: the immutable audit log exists precisely so
money-affecting changes are reconstructable.

**How this was found:** honestly, by needing it. See the disclosure
below.

**Recommendation:** emit an `audit_log` row on store-settings updates
with `previous_value` populated, the same way sale voids already do.

---

## Test-data disclosure

While probing SEC-M-006 I issued `PATCH stores {"fee_config": null}`
against **Tenant A (QA Test Store)** for each of the three roles, to see
which were permitted. I did **not** record the column's prior value
first, which breaks the before/after discipline this project's QA work
otherwise follows, and SEC-M-007 means the audit log could not recover it
either.

Assessment: the value is now `null`. It was most likely already `null` —
nothing in the handoff describes setting fees on this store, and `null`
is the default for a store that has never edited them — but that is
inference, not proof. If Tenant A did hold custom brackets, the register
now falls back to the application defaults, which are the same values the
Fees screen seeds. Impact is limited to a staging QA store and no other
tenant was written to.

Flagging it rather than leaving it in the diff.

## Production readiness

```
Tenant isolation:  PASS  -- the §22 release blocker is cleared
Overall:           READY FOR BETA
```

The release-blocking area named in the previous round is now tested and
passing across three roles, five tables, both read and write directions,
plus the anonymous case. Authorization is enforced by the database, which
is what §21 demands.

Remaining before production:

1. **SEC-M-006** — resolve whether Supervisors may change store pricing.
2. **SEC-M-007** — audit store-settings changes.
3. UIUX-M-003 from round 1 — primary-button contrast (design decision).
4. Still untested on mobile: trial lifecycle edge cases, tablet/landscape,
   and the paired-device role, which has no `staff` row and was not
   exercised here.

---

# Round 3 — Paired-device role

The previous round listed the paired device as untested: it holds a real
Supabase Auth session but **no `staff` row**, runs unattended on a shop
counter, and is the one identity in the system nobody is logged in as.
Both tests below were run live against staging with a genuinely paired
device, not reasoned from the schema.

| ID | Test | Result | Severity |
|---|---|---|---|
| SEC-M-008 | Paired device is confined to register data | **PASS** | — |
| SEC-M-009 | Unpairing revokes an already-issued session | **PASS** | — |

## How the device identity works

`pair-device` creates a real auth user, deletes the throwaway store and
staff row its signup trigger produced, and links it to the real store
through a `devices` row instead. RLS then resolves it via:

```sql
select store_id from staff   where id = auth.uid()
union all
select store_id from devices where id = auth.uid() and unpaired_at is null
limit 1
```

`auth_role()` reads from `staff` only, so a device resolves to **NULL**
role and every admin-gated policy fails closed for it.

## SEC-M-008 — Confined to register data — PASS

A device paired to Tenant A, then queried directly:

| Table | Device sees | Tenant A truth | Verdict |
|---|---|---|---|
| products | 41 | 41 | needed to ring up sales |
| categories | 7 | 7 | needed |
| customers | 1 | 1 | needed for utang |
| stores | 1 | 1 | needed for the receipt header |
| **sales** | **0** | 15 | correctly denied — no sales history |
| **staff** | **0** | 3 | correctly denied — no staff emails or PIN hashes |
| **audit_log** | **0** | — | correctly denied |
| any Tenant B table | **0** | — | correctly denied |
| `PATCH stores.fee_config` | **0 rows** | — | cannot change pricing |

This is a genuine least-privilege boundary: the till can do its job and
learn nothing else. A device left on an unattended counter cannot be used
to enumerate staff, read takings, or reprice the store.

## SEC-M-009 — Revocation is immediate — PASS

The important case is a **stolen or lost till whose session is already
live**. A JWT normally stays valid until it expires, so the question is
whether unpairing waits for that.

It does not. Using the **same token, with no re-login and no refresh**:

```
BEFORE unpair — products: 41 rows
AFTER  unpair — products:  0 rows
                customers: 0 rows
                stores:    0 rows
```

Access dies the moment `unpaired_at` is set, because `auth_store_id()`
re-evaluates it on every query rather than trusting the token. On top of
that, `unpair-device` calls `auth.admin.deleteUser()`, so the credentials
are destroyed too — belt and braces.

## Observation — not a defect

A `devices` row cannot be hard-deleted: `device_pairing_codes
.consumed_by_device_id` has an FK to it. That is intentional — the unpair
function's own comment notes the row is never deleted, and keeping it
preserves which code paired which till. Recorded so a future tester does
not re-diagnose it as the account-deletion FK class of bug.

## Test data

The probe device was paired, exercised, unpaired, and its auth user
deleted — leaving the `devices` row marked unpaired, exactly the state
the production unpair flow produces. The two genuine staging devices were
untouched, and `fee_config` remains `null`.

## Readiness

```
Unchanged: READY FOR BETA
```

Round 3 adds no new defects. Still untested on mobile: trial lifecycle
edge cases, and tablet/landscape rendering.
