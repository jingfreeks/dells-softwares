import type { AvatarTone } from "../../../../components/avatar";
import { creditUsageVariant, isOverdueDebt, type CreditUsageVariant } from "../../../../lib/customers";
import type { UtangRowProps } from "./types";

function avatarTone(variant: CreditUsageVariant, balance: number): AvatarTone {
  if (balance <= 0) return "success";
  if (variant === "danger" || variant === "warn") return "danger";
  return "info";
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
