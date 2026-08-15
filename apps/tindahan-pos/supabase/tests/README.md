# Database tests

pgTAP suites covering the security boundaries added by the core platform
integration. They are **deny tests first**: most of what matters here is what
a caller *cannot* do.

| Suite | Guards |
|---|---|
| `100_entitlement.sql` | `core.module_enabled()` fails closed — unknown module, missing row, expired or not-yet-started grant; plan upgrade/downgrade; a `MANUAL` grant surviving re-materialization |
| `110_platform_admin.sql` | the `public.platform_*` contract. A tenant with a valid session, and a real administrator with a stale second factor, must both learn nothing |
| `120_inventory_enforcement.sql` | module gating blocks **writes only** — reads and exports stay available per Architecture v1 §08 |

## Running them

Needs a database with every migration applied, and the `pgtap` extension:

```bash
supabase db reset
docker exec supabase_db_tindahan-pos psql -U postgres -d postgres \
  -c "create extension if not exists pgtap with schema extensions;"
bash supabase/tests/run.sh
```

Each suite creates its own fixtures and runs inside a transaction that is
rolled back, so they leave no residue and can be run repeatedly in any order.

## Why these, and not everything

These cover the code where a mistake is worst: a dropped guard on
`platform_organizations()` is a full tenant dump, and a wrong predicate on an
Inventory policy stops a paying customer working. `INTEGRATION-PROMPT.md` §12
asks for an allow test and a deny test per table; this is the security-critical
subset, not yet the whole `public` schema.
