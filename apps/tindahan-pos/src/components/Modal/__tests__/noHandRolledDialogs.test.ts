import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A source guard, not a behaviour test.
 *
 * Modal's own comment describes the problem it was written to end: twenty-three
 * components each writing out the same overlay, the same panel, the same three
 * ARIA attributes and the same stopPropagation, and each calling
 * useEscapeToClose and useFocusTrap for itself -- which means each of them
 * could have forgotten to, and nothing checked.
 *
 * Writing the shell did not end it. The shell shipped and sat at two callers
 * while the other twenty-one carried on by hand, and three of them drifted in
 * the meantime. What ends it is that a new hand-rolled dialog now fails the
 * suite by name.
 */

const SRC = join(__dirname, "..", "..", "..");

/**
 * The shell itself, and lib/dom.ts where the two hooks are declared -- a
 * declaration matches the same pattern as a call, and there is nowhere else
 * for them to live.
 */
const ALLOWED = ["components/Modal/Modal.tsx", "lib/dom.ts"];

const HAND_ROLLED = [
  { pattern: /className="tpl-modal-(overlay|panel)/, what: "the dialog's own overlay/panel markup" },
  { pattern: /\buseEscapeToClose\(/, what: "useEscapeToClose, which Modal already calls" },
  { pattern: /\buseFocusTrap\(/, what: "useFocusTrap, which Modal already calls" },
];

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

describe("no hand-rolled dialogs", () => {
  it("routes every dialog through Modal, which owns the ARIA contract and both hooks", () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !ALLOWED.some((allow) => file.replace(/\\/g, "/").endsWith(allow)))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return HAND_ROLLED.filter(({ pattern }) => pattern.test(source)).map(
          ({ what }) => `${file.slice(SRC.length + 1)}: ${what}`,
        );
      });

    // If this fails, render <Modal open onClose labelledBy> instead of adding
    // the file to ALLOWED. A dialog that opts out of the shell is a dialog
    // that can silently lose its focus trap, which is how the last twelve
    // stayed hand-rolled for as long as they did.
    expect(offenders).toEqual([]);
  });
});
