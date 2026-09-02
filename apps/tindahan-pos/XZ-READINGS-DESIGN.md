# X/Z readings and accumulating totals — design

Status: **decisions taken 2026-09-02; step 1 building.** The five questions in
§10 have been answered — see §10 for what was decided and what it changed.

---

## 1. What this is for

§21 of the BIR technical documentation records:

> **X-Reading** — NOT IMPLEMENTED, verified absent
>
> **FOR BIR VALIDATION:** whether this Z-Reading satisfies the required
> accumulating totals (grand total, reset counter, Z-counter) has **not** been
> determined. Those specific fields were not identified in the implementation.

They were not identified because there is nowhere to put them. That is the
actual gap, and it is worth stating precisely before proposing anything.

**The Z-Reading today is a view, not a record.** `useZReadingReport` fetches
the sales for one business date and recomputes the figures client-side each
time it is opened, cross-checked against a server-side `report_reconciliation`
RPC. Nothing is persisted. Re-opening yesterday's Z recomputes it from
whatever `sales` says now.

That is a perfectly good *report*. It is not a Z-Reading in the sense an
examiner means, because:

- there is no **Z-counter** — nothing counts how many closes have occurred;
- there is no **grand total** — no figure accumulates across the register's
  life;
- there is no **reset counter** — nothing records that an accumulation ever
  restarted;
- it is **not immutable** — a void recorded tomorrow silently changes what
  yesterday's Z displays.

The last one is the sharpest. A closing artefact that changes after the fact is
not a closing artefact.

---

## 2. What already exists and should be reused

Verified against the live database on 2026-09-02, not assumed:

| Piece | State |
|---|---|
| Shift open, declared float | **built** — `cashier_sessions.opening_float`, 75 of 93 sessions |
| Blind close and variance | **built** — `end_cashier_session()`, no expected figure shown to the cashier |
| Variance counts every cash movement | **built** — `20260902170000` (float + cash sales + utang − refunds) |
| Receipt numbering | **built** — `document_series`, monotonic per `(store_id, series_key)`, never resets |
| Per-sale VAT breakdown | **built** — `vatable_sales`, `vat_amount`, `vat_exempt_sales`, `zero_rated_sales` on each sale |
| Void handling | **built** — status flips, row retained, never deleted |
| Refunds | **built** — separate append-only table |
| Reconciliation cross-check | **built** — `report_reconciliation` RPC |

**The shift lifecycle is not the gap.** I previously said it was, based on §11,
and that was wrong — §11 has since been corrected. What is missing is narrower:
a persisted reading.

---

## 3. The scope question, and a finding that decides it

A Z-counter and a grand total have to accumulate *against something*. The
obvious candidate is the terminal, because BIR accredits machines.

**`devices` exists, `sales.device_id` exists, and `checkout_sale()` does
populate it — but 0 of 94 sales on staging carry one.** Every test sale came
from a browser session rather than a paired device, and that is the normal way
the web POS is used: a shopkeeper signs in, there is no pairing step.

So a per-terminal counter cannot be built on `device_id` as things stand. It
would be null for most sales, and a grand total that silently omits them is
worse than none.

**Proposal: accumulate per store, and record the device on each reading where
one is known.**

- The store is the unit the shop and the BIR registration actually correspond
  to for a single-register sari-sari store, which is the product's target.
- `device_id` is captured on the reading row when the closing session has one,
  so a future move to per-terminal counters has the data to migrate on.
- If BIR requires strictly per-machine accumulation for a multi-terminal shop,
  this becomes a per-`(store, device)` counter later. The schema below does not
  prevent that; it just does not pretend to have solved it today.

**This is the first thing to validate with BIR**, because it changes the shape
of the counter rather than a detail of it.

---

## 4. Proposed schema

```sql
create table register_readings (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores (id) on delete cascade,

  kind            text not null check (kind in ('X', 'Z')),

  -- Z only: increments per (store, register), never reused, never reset
  -- by a close. The register is device_id, where null is the store's own.
  z_counter       integer,
  -- Increments when the grand total is deliberately restarted (see §7).
  reset_counter   integer not null default 0,

  business_date   date not null,
  opened_at       timestamptz not null,
  closed_at       timestamptz not null default now(),

  -- The register's life-to-date total AFTER this reading. Never decreases.
  grand_total     numeric(14,2) not null,

  -- The period's own figures, frozen at close.
  gross_sales     numeric(14,2) not null,
  net_sales       numeric(14,2) not null,
  total_discounts numeric(14,2) not null,
  vatable_sales   numeric(14,2) not null,
  vat_amount      numeric(14,2) not null,
  vat_exempt      numeric(14,2) not null,
  zero_rated      numeric(14,2) not null,
  transaction_count integer not null,
  voided_count    integer not null,
  voided_total    numeric(14,2) not null,
  refund_count    integer not null,
  refund_total    numeric(14,2) not null,
  beginning_receipt text,
  ending_receipt    text,
  payment_breakdown jsonb not null,

  device_id       uuid references devices (id),
  taken_by        uuid not null references staff (id),
  created_at      timestamptz not null default now()
);
```

Constraints that carry the meaning:

```sql
-- A Z-counter is unique per (store, register) and only Z readings have one.
-- device_id is coalesced so the store's own register -- the null case -- takes
-- part in uniqueness like any paired device, rather than every browser sale
-- colliding on a single null.
create unique index register_readings_z_counter_uq
  on register_readings (store_id, coalesce(device_id, '00000000-0000-0000-0000-000000000000'::uuid), z_counter)
  where kind = 'Z';

alter table register_readings add constraint z_has_counter
  check ((kind = 'Z') = (z_counter is not null));
```

**The table is append-only**, enforced the same way `platform_audit_logs`
already is — a trigger refusing `UPDATE` and `DELETE`. Immutability is the
property that makes it a closing artefact rather than a report, so it belongs
in the database, not in a convention.

---

## 5. X versus Z

| | X-Reading | Z-Reading |
|---|---|---|
| When | any time during the day | at close |
| Z-counter | none | increments |
| Grand total | recorded, unchanged | recorded, advanced |
| Ends the period | no | yes |
| Repeatable | yes, freely | once per period |

An X-Reading is the same computation with `kind = 'X'` and no counter
increment. Persisting X readings as well is deliberate: it costs one row and it
answers "who read the register mid-shift, and what did it say then?", which is
exactly the question an X-Reading exists to make answerable.

---

## 6. The hard part: what a period actually contains

This is where the design earns or loses its keep.

**Offline sales that sync after a Z.** A sale made at 17:00 offline and synced
at 09:00 the next morning, after the 18:00 Z, belongs to yesterday's business
date but was not in yesterday's Z. Today this cannot happen unnoticed only
because it has not happened yet — 2 offline replays exist on staging and none
crossed a day boundary.

Three options, and I recommend the third:

1. *Include it retrospectively* — recompute the Z. *Rejected:* destroys
   immutability, which is the point of the exercise.
2. *Refuse the sale* — reject a replay whose business date is already closed.
   *Rejected:* the sale really happened, and the shop is owed the record. A POS
   that discards real transactions to keep its paperwork tidy has the priority
   backwards.
3. **Accept it into the next open period, and record that it is late.**
   The sale keeps its true `occurred_at`; the reading that includes it carries
   a `late_entries` count and total. The Z for the day it belongs to stays
   exactly as it was taken, and the discrepancy is visible rather than
   silently absorbed.

Option 3 needs one more column pair on the table (`late_entry_count`,
`late_entry_total`) and is the only one that keeps both the money and the
immutability honest. **It also needs BIR validation** — whether a late entry
must appear in the original period is a rule I should not guess at.

**Voids and refunds after a Z.** Same shape, same answer: they land in the open
period and are counted as adjustments there, not backdated into a closed one.

**A second Z on the same business date.** Allowed — a shop may close, reopen
and close again. The counter increments; the business date repeats. The unique
index is on `(store_id, z_counter)`, deliberately not on the date.

**A day with no sales.** A Z with zeroes is still a Z and still advances the
counter. An examiner reading a gap in the sequence should not have to guess
whether the shop was shut or the record is missing.

---

## 7. Grand total and reset counter

The grand total is the running sum of net sales across the register's life. It
is stored **per reading** rather than computed, so that reading N always shows
what it showed at the time, regardless of anything that happened afterwards.

```
grand_total(N) = grand_total(N-1) + net_sales(N)
```

The **reset counter** increments only when the accumulation is deliberately
restarted — hardware replacement, re-registration, or a BIR-directed reset. It
should be a privileged, audited operation with a reason, not a settings toggle.
It is the field an examiner uses to detect a register that quietly started
counting again from zero, so making it easy to reach would defeat it.

**Nothing in this design lets the grand total decrease.** Voids and refunds are
recorded as their own totals; they do not subtract from the accumulation.
Whether BIR expects net-of-void accumulation is another validation question —
and it is the kind where guessing wrong is expensive, because it changes every
figure that follows.

---

## 8. What I would build, in order

1. **The table, the append-only trigger, and the constraints.** No behaviour
   change. Reviewable on its own.
2. **`take_reading(p_kind, p_business_date)`** — a `SECURITY DEFINER` RPC that
   computes the period figures server-side, advances the counter and grand
   total under a row lock, and inserts. Server-side because a client-computed
   closing artefact is not an artefact. The row lock because two tills closing
   at once must not take the same Z-counter.
3. **pgTAP**: the counter never repeats or skips; grand total accumulates and
   never decreases; the trigger refuses updates and deletes; a late entry lands
   in the open period; two concurrent closes do not collide.
4. **UI**: X-Reading alongside the existing Z card; the Z card reads the
   persisted record rather than recomputing.
5. **Backfill** — or deliberately not. Discussed below.

Steps 1–3 are the substance. Step 4 is small once the data is real.

---

## 9. What I would not do

**Not backfill historical Z readings.** There are 94 sales and no prior
readings. Manufacturing a Z-counter sequence for days that were never formally
closed would put invented artefacts into the record an examiner is meant to
trust. Better: the sequence starts at 1 on the day this ships, and §21 states
plainly that readings before that date do not exist.

**Not touch receipt numbering.** `document_series` is monotonic per store and
never resets. It already satisfies "beginning and ending receipt number", and
BIR generally wants receipt numbers *not* to reset — changing it would be
inventing a problem.

**Not build per-terminal counters yet.** See §3. The data does not support it,
and building on `device_id` while it is null on every sale would produce a
grand total that is quietly wrong.

---

## 10. Questions — answered 2026-09-02

1. **Accumulation scope — per `(store, device)`.** Not per store alone.
2. **Late entries — next open period, flagged.** As proposed in §6.
3. **Grand total — gross.** Voids and refunds are recorded as their own
   totals on each reading and never subtract from the accumulation.
4. **X readings are recorded**, not merely displayed (§5 already assumed this).
5. **Reset authority** — still open; it gates nothing in steps 1–3 and can be
   settled before the reset path is built.

### What answer 1 changed, and a constraint found while implementing it

The first instinct was to require `device_id` on every sale. Tracing
`checkout_sale()` showed what that actually means: a device is resolved as
`devices where id = auth.uid()`, so a paired device authenticates **as itself**
and is a bare register — restricted to `/pos`, no Settings, Staff or Inventory.
Requiring it would have stopped a shopkeeper selling from the browser they also
administer the shop in. That is a workflow change, not a counting change, and
it was rejected once stated plainly.

The chosen model is **per `(store, device)` with a default register**: a sale
from a paired device attributes to that device; a sale from a browser
attributes to the store's own register.

Implementing the default register as a real `devices` row was then rejected
too, on a constraint found in the schema rather than assumed: `trg_devices_limit`
enforces the device cap on insert, so a default-register row would **consume a
paid device slot** and would fail outright for any store already at its cap.
Exempting it would mean special-casing the cap, which is worse than not
creating the row.

**So the store's own register is the `NULL` case.** `register_readings.device_id`
is nullable; null means "this shop's own machine". The uniqueness constraint
coalesces it, so the counter is genuinely per `(store, register)` with the
default register participating like any other. No schema change to `devices`,
no slot consumed, no cap exemption, and a later move to an explicit register
row remains possible.

## 11. Effort

Rough, and offered as a shape rather than a promise:

| Step | Size |
|---|---|
| Table, trigger, constraints | small |
| `take_reading()` RPC | medium — the locking and period boundaries are the work |
| pgTAP | medium — concurrency and late entries need real setup |
| UI | small |

The risk is not in the code. It is in questions 1–3: getting the scope or the
accumulation rule wrong means reissuing every reading taken before the
correction, and readings are meant to be the thing you cannot reissue.
