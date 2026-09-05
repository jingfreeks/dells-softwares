import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A source guard, not a behaviour test.
 *
 * This defect has now been fixed three times: #505 pinned the web formatters,
 * #532 pinned mobile's, and this file exists because #505 consolidated 23 call
 * sites and left 13 behind — including the X and Z reading cards, where a
 * timestamp is part of a BIR artefact rather than a nicety.
 *
 * A bare toLocaleString() renders in whatever locale AND time zone the device
 * has, so the same receipt reads differently on a shop's tablet and the
 * owner's laptop. src/lib/datetime pins both. The only way to stop this
 * regrowing quietly is to make the grep a test.
 */

const SRC = join(__dirname, "..", "..", "..");
const BARE = /\.toLocale(Date|Time)?String\(\s*\)/;

/** datetime.ts is where the pinned formatters legitimately live. */
const ALLOWED = ["lib/datetime/datetime.ts"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === "node_modules" ? [] : sourceFiles(full);
    }
    if (!/\.tsx?$/.test(entry)) return [];
    if (/\.test\.tsx?$/.test(entry)) return [];
    return [full];
  });
}

describe("no bare locale formatting", () => {
  it("routes every date through src/lib/datetime, which pins the zone", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !ALLOWED.some((allow) => file.replace(/\\/g, "/").endsWith(allow)))
      .filter((file) => BARE.test(readFileSync(file, "utf8")))
      .map((file) => file.slice(SRC.length + 1));

    // If this fails, use formatDate/formatTime/formatDateTime from @/lib
    // rather than adding the file to ALLOWED — the point is the pinning, and
    // an exception list is how the last thirteen survived.
    expect(offenders).toEqual([]);
  });
});
