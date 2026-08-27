export function formatDaysLeft(days: number): string {
  if (days <= 0) return "out now";
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} hrs`;
  return `${Math.round(days)} day${Math.round(days) === 1 ? "" : "s"}`;
}
