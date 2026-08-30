import type { Variant } from "./types";

const TILE_TONE: Partial<Record<Variant, string>> = {
  warning: "bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.25)]",
  highlight: "bg-[rgba(59,130,246,0.10)] border-[rgba(59,130,246,0.28)]",
  danger: "bg-[rgba(248,113,113,0.08)] border-[rgba(248,113,113,0.25)]",
};

const TEXT_TONE: Partial<Record<Variant, string>> = {
  warning: "text-warning",
  highlight: "text-accent-soft",
  danger: "text-error",
};

/** Derives the variant-driven tile/text className fragments for MetricCard -- MetricCard.tsx stays presentational. */
export function useMetricCard(variant: Variant) {
  return { tileToneClass: TILE_TONE[variant] ?? "", textToneClass: TEXT_TONE[variant] ?? "" };
}
