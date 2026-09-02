import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * useCan("...") checks a permission code against the set list_my_permissions()
 * returns. A code that does not exist in the database is not an error -- it is
 * simply never granted, so the guarded feature becomes invisible to everyone,
 * permanently and silently. A typo here is indistinguishable from a
 * deliberate restriction.
 *
 * The codes are seeded by migration (0044_rbac_foundation.sql). Parsing them
 * from there keeps this honest without needing a live database: verified
 * against staging when this was written, the parse recovers exactly the 20
 * codes the database holds.
 */
function walk(dir: string, exts: string[], out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.includes(extname(entry))) out.push(full);
  }
  return out;
}

function seededPermissionCodes(): Set<string> {
  const codes = new Set<string>();
  for (const file of walk("supabase/migrations", [".sql"])) {
    const sql = readFileSync(file, "utf8");
    const inserts = sql.matchAll(
      /insert\s+into\s+(?:public\.)?permissions\s*\([^)]*\)\s*values(.*?);/gis
    );
    for (const insert of inserts) {
      for (const row of insert[1].matchAll(/\(\s*'([a-z0-9_.]+)'/g)) codes.add(row[1]);
    }
  }
  return codes;
}

describe("permission codes", () => {
  it("seeds a non-empty set, so the check below cannot pass vacuously", () => {
    expect(seededPermissionCodes().size).toBeGreaterThan(0);
  });

  it("never checks a permission code that no migration grants", () => {
    const seeded = seededPermissionCodes();
    const unknown: string[] = [];

    for (const file of walk("src", [".ts", ".tsx"])) {
      if (file.includes("__tests__") || file.includes(".test.")) continue;
      for (const m of readFileSync(file, "utf8").matchAll(/useCan\(\s*"([^"]+)"/g)) {
        if (!seeded.has(m[1])) unknown.push(`${m[1]} in ${file}`);
      }
    }

    expect(unknown).toEqual([]);
  });
});
