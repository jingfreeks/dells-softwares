import type { AvatarTone } from "../../../../components/avatar";
import { creditUsageVariant, isOverdueDebt, type CreditUsageVariant } from "../../../../lib/customers";
import type { UtangRowProps } from "./types";

function avatarTone(variant: CreditUsageVariant, balance: number): AvatarTone {
  if (balance <= 0) return "success";
  if (variant === "danger" || variant === "warn") return "danger";
  return "info";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** All derived display data for UtangRow -- UtangRow.tsx stays presentational. */
export function useUtangRow({ customer, days }: UtangRowProps) {
  const variant = creditUsageVariant(customer, days);
  const tone = avatarTone(variant, customer.balance);
  const overdue = isOverdueDebt(days);
  const isBad = variant === "danger" || overdue;
  const description =
    variant === "danger" && days !== null
      ? `${days} days · over limit`
      : overdue && days !== null
        ? `${days} days overdue`
        : days !== null
          ? `${days} days`
          : "";

  return { tone, isBad, description };
}
