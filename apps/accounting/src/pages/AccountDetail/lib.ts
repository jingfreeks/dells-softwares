import type { Account, LedgerLine } from "@/lib";

export interface RunningLine extends LedgerLine {
  /** The account's balance after this line, in its own normal direction. */
  balance: number;
}

/**
 * A running balance in the account's OWN direction.
 *
 * A debit-normal account (cash, expenses) goes up on a debit; a credit-normal
 * account (revenue, payables) goes up on a credit. Subtracting one from the
 * other in a fixed order would show revenue as a growing negative number,
 * which is arithmetically defensible and useless to read.
 *
 * Lines are assumed to arrive in date order, which my_general_ledger()
 * guarantees -- it orders by account, then date, then entry number.
 */
export function withRunningBalance(
  lines: LedgerLine[],
  normalBalance: Account["normalBalance"]
): RunningLine[] {
  let balance = 0;
  return lines.map((line) => {
    balance +=
      normalBalance === "DEBIT" ? line.debit - line.credit : line.credit - line.debit;
    return { ...line, balance };
  });
}

export function closingBalance(lines: RunningLine[]): number {
  return lines.length === 0 ? 0 : lines[lines.length - 1].balance;
}
