import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * A CSS variable that is not defined anywhere and is used without a
 * fallback makes its whole declaration invalid, so the property silently
 * does nothing -- no error, no warning, just a border or a colour that
 * never appears.
 *
 * This has bitten us three times now (--tpl-b, --color-brand-light,
 * --color-brand-soft), each time going unnoticed because the page still
 * renders. A typo in a token name should fail here instead.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".ts", ".tsx", ".css"].includes(extname(entry))) out.push(full);
  }
  return out;
}

describe("theme tokens", () => {
  it("never uses an undefined CSS variable without a fallback", () => {
    const files = walk("src");
    const defined = new Set<string>();
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // Declared in a stylesheet...
      for (const m of text.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]);
      // ...or set at runtime as an inline style, e.g. --tpl-range-fill.
      for (const m of text.matchAll(/\["(--[a-zA-Z0-9-]+)"\s+as\s+string\]/g)) defined.add(m[1]);
    }

    const dangling: string[] = [];
    for (const f of files) {
      if (f.includes("__tests__") || f.endsWith(".test.ts") || f.endsWith(".test.tsx")) continue;
      for (const m of readFileSync(f, "utf8").matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g)) {
        if (!defined.has(m[1])) dangling.push(`${m[1]} in ${f}`);
      }
    }

    expect(dangling).toEqual([]);
  });
});
