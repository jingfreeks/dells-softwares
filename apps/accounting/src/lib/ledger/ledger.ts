import type { Account, LedgerLine } from "@/lib/accounts";

export interface RunningLine extends LedgerLine {
  /** The account's balance after this line, in its own normal direction. */
  balance: number;
}

export interface AccountLedger {
  code: string;
  name: string;
  normalBalance: Account["normalBalance"];
  lines: RunningLine[];
  closing: number;
}

/**
 * A running balance in the account's OWN direction.
 *
 * A debit-normal account (cash, expenses) goes up on a debit; a credit-normal
 * account (revenue, payables) goes up on a credit. Subtracting one from the
 * other in a fixed order would show revenue as a growing negative number --
 * arithmetically defensible and useless to read.
 *
 * Lines are assumed to arrive in date order, which my_general_ledger()
 * guarantees: it orders by account, then date, then entry number.
 */
export function withRunningBalance(
  lines: LedgerLine[],
  normalBalance: Account["normalBalance"]
): RunningLine[] {
  let balance = 0;
  return lines.map((line) => {
    balance += normalBalance === "DEBIT" ? line.debit - line.credit : line.credit - line.debit;
    return { ...line, balance };
  });
}

export function closingBalance(lines: RunningLine[]): number {
  return lines.length === 0 ? 0 : lines[lines.length - 1].balance;
}

/**
 * The General Ledger's shape: one block per account that has activity, each
 * with its own running balance and closing total.
 *
 * Accounts with no lines in the range are dropped rather than rendered empty
 * -- a ledger of sixty blank headings is harder to read than a short one.
 */
export function groupLedgerByAccount(
  lines: LedgerLine[],
  accounts: Account[]
): AccountLedger[] {
  const byCode = new Map<string, LedgerLine[]>();
  for (const line of lines) {
    const existing = byCode.get(line.accountCode);
    if (existing) existing.push(line);
    else byCode.set(line.accountCode, [line]);
  }

  return [...byCode.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, accountLines]) => {
      // An account can be missing from the chart only if it was deleted after
      // being posted to, which the database refuses. Defaulting to DEBIT keeps
      // the page rendering rather than crashing if it ever happens.
      const account = accounts.find((a) => a.code === code);
      const running = withRunningBalance(accountLines, account?.normalBalance ?? "DEBIT");
      return {
        code,
        name: account?.name ?? accountLines[0].accountName,
        normalBalance: account?.normalBalance ?? "DEBIT",
        lines: running,
        closing: closingBalance(running),
      };
    });
}
