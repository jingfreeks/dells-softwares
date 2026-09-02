# Which schema is authoritative

There are two schemas holding what look like the same things, and the overlap
is the part that misleads people reading the database for the first time. This
records what each one owns and which to reach for.

Measured against staging on 2026-09-03; the counts are illustrative, the
relationships are the point.

## The split

| | `public` (41 tables) | `core` (22 tables) |
|---|---|---|
| Whose | one shop's own records | the platform's |
| Holds | products, sales, customers, receiving, shifts, drawer | organizations, subscriptions, plans, features, modules, platform admins, platform audit |
| Reached by | the POS client, through PostgREST and the tenant RPCs | the super-admin console and the billing/entitlement functions |
| Exposed to the client | yes | **no** — deliberately |

`core` is not exposed through PostgREST. A tenant reads its own billing state
through `my_store_billing_state()`, never by selecting from `core`. Anything
new that needs platform data from the shop side goes through a function that
returns the specific fields, not by exposing the schema.

## The two overlaps, explained

These are the ones that cause the "which is real?" question.

### Stores and organizations

`core.organizations` is a strict superset of `public.stores`: every store has a
matching organization by the same id, and there are a few organizations with no
store (913 vs 909 at time of writing).

**The id is shared.** `stores.id = organizations.id`. So they are one entity in
two schemas — the shop as the POS sees it, and the tenant as billing sees it.
An organization with no store is one that has not been provisioned a shop.

### Staff — the one that looks like drift and is not

`public.staff` and `core.staff` share **zero ids**. That looks alarming and is
not, because they are keyed differently:

- **`public.staff.id` *is* the `auth.users` id.** This is why every RLS policy
  and every tenant RPC reads `staff where id = auth.uid()`. 915 of 915 match an
  auth user.
- **`core.staff` has its own surrogate id and a `user_id` FK** to the auth user.
  917 of 919 are linked; the 2 that are not are invitations that have not been
  accepted, which is what its `invited_email` column is for.

Same people, two keyspaces. `core.staff` carries what the platform needs and
the till does not — employee numbers, branch scope, invitation state,
multi-organization membership.

**So neither is a stale copy of the other.** Comparing their row counts and
concluding they have drifted apart is the wrong reading; they do not share a
key, so the counts were never meant to match.

## Which to use

- Anything the POS does at the till: **`public`**. `auth.uid()` resolves there.
- Anything about who is entitled to what, who is billed, or who administers the
  platform: **`core`**, through a function.
- A new tenant-facing feature: **`public`**, with RLS, and a
  `SECURITY DEFINER` function only where a policy cannot express the rule.

## The unfinished part

`core` was introduced to carry multi-branch and multi-organization structure
that `public` cannot express, and the migration of concepts into it is not
complete — `core.branches` exists and is populated per organization, while the
POS still works against a single implicit store. That is deliberate and
in progress rather than abandoned, but it does mean a reader will find
structure in `core` that nothing in the till uses yet.

Finishing it is not a cleanup task. It changes what a "store" means to the
client, so it wants its own design rather than being done incrementally by
whoever next touches a migration.
