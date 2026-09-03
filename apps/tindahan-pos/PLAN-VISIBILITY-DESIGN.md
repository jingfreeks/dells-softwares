# Showing a store its own plan, live — design

Status: **proposal, not built.** Written 2026-09-02 for review before any code.

Asked for: *"if the admin sets the subscription type it should be displayed in
the web app in every store."*

---

## 1. What is missing today

Two separate gaps, and only the second is the obvious one.

**The plan is never returned to the store at all.** `my_store_billing_state()`
returns:

```
organization_status, subscription_status, writes_allowed,
grace_ends_at, trial_ends_at
```

No plan code, no plan name. `BillingState` on the client mirrors that exactly.
So when a platform admin sets a store to Growth, **the store's app has no way
to know which plan it is on** — it can show which features it holds and which
are locked behind an upgrade, but it can never say "you are on Growth".

This is not a UI omission. There is nothing to display.

**The billing state is fetched once and never refreshed.** `BillingProvider`
runs a single `useEffect` keyed on `userId`. A plan changed mid-shift does not
reach the till until the shopkeeper signs out and back in — the same staleness
class as the feature flags before `20260902…`/#451.

---

## 2. Facts this design rests on

Read from the live database on 2026-09-02.

| | |
|---|---|
| Stores on `BASIC` (Starter) | **907** |
| Stores on `BUSINESS` (Growth) | **6** |
| Stores with no subscription row | **0** |
| Statuses in use | `ACTIVE` (907), `TRIALING` (6) |
| `core.organization_subscriptions` in the realtime publication | **no** |
| Tables in the `supabase_realtime` publication | **1** (`feature_flags`) |
| RLS on that table | enabled, 2 policies |

The SELECT policy is:

```sql
core.is_org_member(organization_id) OR core.is_platform_admin()
```

and writes require `is_platform_admin('BILLING')`. So a store's own members may
already read their subscription row; only a billing admin may change it. That
makes tenant-safe delivery possible — but see §3, which changes the mechanism.

---

## 3. The constraint that shapes the whole design

The obvious implementation is `postgres_changes` on
`core.organization_subscriptions`. **It should not be used**, for a reason that
is easy to miss:

`postgres_changes` delivers **the whole row**. There is no column projection.
That row includes `notes` — a free-text operator field, populated on **all 913
rows**, up to 132 characters.

Today's contents are benign system strings ("Backfilled at core integration…",
"Default plan granted on organization creation"). That is not the point. `notes`
is the field a platform admin writes billing context into, and the plausible
future contents are exactly what a tenant must not see: *disputes invoice*,
*suspected fraud*, *owner threatened chargeback*.

Streaming the subscription row to the shop's browser would make an internal
channel a customer-visible one, and it would do so silently — the leak would
only become real the first time someone wrote a candid note.

**So the realtime event carries no data.** It is a signal meaning "your billing
state changed, go and ask". The client then re-calls
`my_store_billing_state()`, which returns exactly the fields the store is meant
to have. `realtime.send` and `realtime.broadcast_changes` are both available on
this instance, so this needs no new infrastructure.

This also keeps `core` unexposed, which the architecture is deliberate about.

---

## 4. Design

### 4.1 Return the plan

Extend `my_store_billing_state()` with two columns:

```
plan_code text   -- BASIC, BUSINESS, ...
plan_name text   -- Starter, Growth, ...
```

joined from `core.subscription_plans` via `organization_subscriptions.plan_id`.
Both null when there is no live subscription — a state that does not occur
today (0 of 913) but that the function already handles and should keep
handling.

Adding columns to a `RETURNS TABLE` requires a drop and recreate, which
discards the ACL. `20260902110000` and `20260902120000` are the cautionary
tale: **`revoke … from public` is not enough**, because Supabase grants
`anon` and `service_role` as named grantees. The migration must name all
three and re-grant `authenticated`, and the ACL must be checked on the real
database after deploying, not inferred from a clean push.

### 4.2 Signal the change

A trigger on `core.organization_subscriptions` after insert or update, calling
`realtime.send` on a per-store topic — `store:{organization_id}` — with a
payload naming only the event, never the row.

### 4.3 Refresh on the client

`BillingProvider` gains what `FeatureFlagsProvider` now has:

- subscribe to the store's topic; on any message, re-read
- re-read when a backgrounded tab becomes visible
- re-read when connectivity returns

The last two matter as much as the first. A broadcast delivered while the tab
was asleep is not replayed, exactly as `postgres_changes` is not — that was the
whole finding behind #451. The subscription says *when* to re-read; the RPC
stays the truth.

A failed re-read must keep the previous state rather than clearing it. Reading
`null` means "nothing to warn about" to every consumer, so a network blip would
silently dismiss a real suspension banner.

### 4.4 Display

- **Settings → Your Plan** — name the current plan. The page already shows held
  versus locked features and the next tier up; it just never says where you are.
- **Dashboard** — a compact badge, so the plan is visible without navigating.

Both read the same `BillingState`. Neither computes anything.

---

## 5. States the display has to be honest about

| State | What to show |
|---|---|
| `ACTIVE` on BASIC | "Starter" |
| `TRIALING` on BUSINESS | "Growth — trial ends 15 Sep" — 6 stores are here today |
| `PAST_DUE` | plan name plus the existing grace warning; still writable |
| `SUSPENDED` / `CANCELLED` | plan name plus "writes paused". §08: nothing is hidden, only new records are withheld |
| No subscription row | "No plan" — not "Free", which is a real plan and would be a lie |

**A store may hold features its plan does not include.** Comped and
grandfathered grants outrank the plan and survive a plan change — that is
deliberate and `250_tier_split` tests it. So the plan name must be presented as
*what you are subscribed to*, not as *what you can do*. The Plan page already
gets this right by listing held features separately; the badge must not undo it
by implying the tier defines the capability.

---

## 6. Interaction with #457

#457 records that the pricing page and the plan catalogue describe different
products — Starter is granted `pos.utang`, `pos.eload` and `pos.shifts`, which
the page sells as Growth features.

**This design makes that visible to customers.** Today a Starter store simply
uses utang; once the app says "Starter" on the dashboard, a shopkeeper can
compare that against the pricing page and see they are getting Growth features,
or ask why they are paying for Growth when Starter would do.

That is an argument for settling #457 first, or at least knowingly. It is not
an argument against building this — the app displaying the truth is not the
problem. But shipping plan visibility before deciding the catalogue means
choosing to show customers a boundary that does not currently hold.

---

## 7. Order

1. RPC returns `plan_code` / `plan_name`, with the drop-recreate ACL discipline
   above. No UI change; verifiable on its own.
2. Trigger and broadcast.
3. `BillingProvider` re-reads on signal, wake and reconnect.
4. Plan page and dashboard badge.
5. pgTAP: the RPC returns the right plan per subscription state; the trigger
   fires; the ACL excludes `anon` and `service_role`. Vitest: the provider
   re-reads on each of the three triggers, and a failed re-read keeps the prior
   state rather than clearing it.

Steps 1 and 3 are the substance. Step 4 is small once the data exists.

---

## 8. Open questions

1. **#457 first?** See §6. My recommendation is yes, or at least accept
   knowingly that the app will start displaying a boundary the catalogue does
   not enforce.
2. **Should the badge show status as well as plan** — "Growth · past due" — or
   only the plan, leaving status to the existing banner? Showing both risks
   saying the same thing twice; showing only the plan risks a store reading
   "Growth" while suspended.
3. **Trial countdown in the badge**, or only on the Plan page? 6 stores are
   trialing today, so this is not hypothetical.

---

## 9. What this deliberately does not do

**No self-serve plan change.** The app displays the plan; it does not sell one.
`request_addon()` already exists for asking, and there is no checkout in this
product. Adding a "change plan" button because a plan is now on screen would be
a different feature with billing consequences.

**No new realtime channel per feature.** One store topic, carrying billing
signals. If other per-store live updates are wanted later they belong on the
same topic rather than accumulating channels.
