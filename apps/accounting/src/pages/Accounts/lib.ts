import { ACCOUNT_TYPES, type Account, type AccountType } from "@/lib";

export interface AccountGroup {
  type: AccountType;
  label: string;
  accounts: Account[];
}

/**
 * Groups the chart the way the design does -- Assets, Liabilities, Equity,
 * Revenue, Cost of Sales, Expenses -- and drops a group with nothing in it
 * rather than rendering an empty heading.
 *
 * Sorting is by code, which is what makes 1010 sit under 1000 without this
 * needing to understand the parent tree. The chart is numbered for exactly
 * that reason.
 */
export function groupAccounts(accounts: Account[]): AccountGroup[] {
  return ACCOUNT_TYPES.map(({ type, label }) => ({
    type,
    label,
    accounts: accounts.filter((a) => a.type === type).sort((a, b) => a.code.localeCompare(b.code)),
  })).filter((g) => g.accounts.length > 0);
}

/** Case-insensitive match on code or name, which is what the search box says. */
export function matchesSearch(account: Account, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (q === "") return true;
  return account.code.toLowerCase().includes(q) || account.name.toLowerCase().includes(q);
}

export function filterAccounts(
  accounts: Account[],
  { search, type, activeOnly }: { search: string; type: AccountType | "ALL"; activeOnly: boolean }
): Account[] {
  return accounts.filter(
    (a) =>
      matchesSearch(a, search) &&
      (type === "ALL" || a.type === type) &&
      (!activeOnly || a.active)
  );
}
