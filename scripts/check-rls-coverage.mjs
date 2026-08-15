#!/usr/bin/env node
/**
 * CI guard: no table may merge without RLS.
 *
 * Scans the migration set for every `create table` and asserts that the same
 * set also enables row level security on it and gives it at least one policy,
 * and that no policy is a blanket `using (true)`.
 *
 * Adapted to this codebase rather than copied:
 *
 *   - `public` tables are created unqualified (`create table products`), while
 *     `core` tables are schema-qualified. Both forms are matched.
 *   - Policy names here are quoted strings ("admin can insert products"), not
 *     bare identifiers.
 *   - FORCE is required only for `core`. Forcing RLS on `public` would apply
 *     it to the table owner as well, and this codebase deliberately routes
 *     every multi-row business operation through SECURITY DEFINER functions
 *     (checkout_sale, void_sale, transfer_stock, start_cashier_session) that
 *     run as the owner precisely so they can write tables the caller cannot.
 *     Demanding FORCE there would break the POS, not harden it.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'apps/tindahan-pos/supabase/migrations';

/**
 * Exempt only with a written justification.
 *   feature_flags — platform reference data, not tenant-scoped. Its
 *     `using (true)` read policy is deliberate: every client needs to read
 *     flags before it knows who the user is. It has no client write policy.
 */
const BLANKET_READ_OK = new Set(['feature_flags']);

/**
 * Tables that intentionally ship with RLS enabled and NO policy at all.
 * That is deny-all -- the safest possible state -- and is correct when a
 * table is only ever touched by SECURITY DEFINER functions.
 *   device_pairing_codes — 0026 states it plainly: nothing but the pairing
 *     functions may read or write it, so exposing any client policy would
 *     widen the surface for no reason.
 */
const DENY_ALL_OK = new Set(['device_pairing_codes']);

const sql = readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(DIR, f), 'utf8'))
  .join('\n')
  .toLowerCase();

// Migrations align their DDL for readability; compare on collapsed whitespace.
const flat = sql.replace(/\s+/g, ' ');

const created = [
  // The trailing lookahead matters twice over: it stops a schema name being
  // read as a table (dynamic SQL such as 'create table core.%I ...' inside a
  // function body), and stops the engine backtracking to a shorter prefix.
  ...sql.matchAll(/create table (?:if not exists )?(?:([a-z_]+)\.)?([a-z_]+)(?![a-z_.])/g),
].map((m) => ({ schema: m[1] ?? 'public', name: m[2], qualified: m[1] ? `${m[1]}.${m[2]}` : m[2] }));

const problems = [];
const seen = new Set();

for (const table of created) {
  if (seen.has(table.qualified)) continue;
  seen.add(table.qualified);

  // A partition inherits its parent's policies.
  const after = flat.split(`create table ${table.qualified}`)[1]?.slice(0, 200) ?? '';
  if (/partition of/.test(after)) continue;

  const q = table.qualified.replace('.', '\\.');

  if (!flat.includes(`alter table ${table.qualified} enable row level security`)) {
    problems.push(`${table.qualified}: RLS is not enabled`);
  }

  if (table.schema === 'core' &&
      !flat.includes(`alter table ${table.qualified} force row level security`)) {
    problems.push(`${table.qualified}: core tables must FORCE RLS`);
  }

  if (!DENY_ALL_OK.has(table.name) &&
      !new RegExp(`create policy (?:"[^"]+"|[a-z_]+) on ${q}\\b`).test(flat)) {
    problems.push(`${table.qualified}: has no policy`);
  }

  if (!BLANKET_READ_OK.has(table.name) &&
      new RegExp(`create policy (?:"[^"]+"|[a-z_]+) on ${q}\\b[\\s\\S]{0,400}?using \\( *true *\\)`).test(flat)) {
    problems.push(`${table.qualified}: has a blanket USING (true) policy`);
  }
}

if (problems.length > 0) {
  console.error('\n✖ RLS coverage check failed:\n');
  problems.forEach((p) => console.error('  - ' + p));
  console.error('\nEvery table ships with RLS enabled and at least one policy.\n');
  process.exit(1);
}
console.log(`✓ RLS coverage verified for ${seen.size} tables`);
