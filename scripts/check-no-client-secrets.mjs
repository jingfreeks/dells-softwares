#!/usr/bin/env node
/**
 * CI guard: a service-role key, or anything that smells like one, must never
 * be reachable from a browser bundle.
 *
 * Vite inlines every VITE_-prefixed variable into the build output, so the
 * variable NAME alone is enough to fail — we never need to see a value.
 *
 * Fails on:
 *   1. a VITE_ variable whose name matches SERVICE / SECRET / PRIVATE / ROLE_KEY
 *   2. a literal JWT committed anywhere
 *   3. SUPABASE_SERVICE_ROLE_KEY referenced from code that ships to a browser
 *
 * Scans only git-TRACKED files, deliberately. That is exactly the set that
 * ships, and it means the guard needs no hand-maintained ignore list: local
 * database dumps (gitignored precisely because they hold real customer data),
 * build output, node_modules and scratch worktrees are all out of scope for
 * free, and cannot drift back in.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const CODE = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.sql', '.env', '.example', '.html', '.yml', '.yaml', '',
]);

const RULES = [
  { name: 'VITE_ secret variable', re: /\bVITE_[A-Z0-9_]*(SERVICE|SECRET|PRIVATE|ROLE_KEY)[A-Z0-9_]*\b/ },
  { name: 'JWT literal', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'service-role key in browser-reachable code', re: /SUPABASE_SERVICE_ROLE_KEY/ },
];

/**
 * Paths allowed to name the service-role key, each because it never reaches a
 * browser bundle:
 *   supabase/functions/  Edge Functions — server-side, where the key belongs
 *   e2e/, playwright.*   Playwright specs run in Node and are not imported by
 *                        any Vite entry, so they are never bundled
 *   .env.example         documents the variable precisely so nobody re-adds it
 *                        behind a VITE_ prefix by accident
 *   .github/workflows/   hands the secret to server-side steps
 */
const ALLOWED = [
  /\/supabase\/functions\//,
  /\/e2e\//,
  /playwright\.config\.[cm]?ts$/,
  /\.env\.example$/,
  /^\.github\/workflows\//,
  /check-no-client-secrets\.mjs$/, // this file names the patterns it bans
];

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const failures = [];

for (const path of tracked) {
  if (!CODE.has(extname(path))) continue;
  if (ALLOWED.some((re) => re.test(path))) continue;

  let lines;
  try {
    lines = readFileSync(path, 'utf8').split('\n');
  } catch {
    continue; // binary or unreadable — nothing a bundler would inline
  }

  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        failures.push(`${path}:${index + 1}  ${rule.name}\n    ${line.trim().slice(0, 120)}`);
      }
    }
  });
}

if (failures.length > 0) {
  console.error('\n✖ Secret-exposure check failed:\n');
  failures.forEach((f) => console.error('  ' + f + '\n'));
  console.error('A service-role key belongs only in Edge Functions and server runtimes.\n');
  process.exit(1);
}
console.log(`✓ no client-reachable secrets found (${tracked.length} tracked files scanned)`);
