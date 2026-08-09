import type { Customer } from "@/lib";

/** Two-letter initials for the row avatar, e.g. "Aling Rosa" -> "AR". */
export function customerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Finds an existing customer that's likely the same person as `name` —
 * an exact match, or a shared first name (e.g. "Rosa Mendoza" vs.
 * "Rosa M."). A heuristic for the add-customer duplicate warning, not
 * a strict identity check.
 */
export function findDuplicateCustomer(customers: Customer[], name: string): Customer | null {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return null;
  const firstWord = trimmed.split(/\s+/)[0];

  return (
    customers.find((customer) => {
      const existing = customer.name.trim().toLowerCase();
      if (existing === trimmed) return true;
      const existingFirstWord = existing.split(/\s+/)[0];
      return firstWord.length > 1 && existingFirstWord === firstWord;
    }) ?? null
  );
}
