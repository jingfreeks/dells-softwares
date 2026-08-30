export interface Problem {
  title: string;
  description: string;
}

export const PROBLEMS: Problem[] = [
  {
    title: "Stock runs out quietly",
    description:
      "Your best seller is gone by noon and nobody notices until a customer asks. Every empty shelf is a sale that walked next door.",
  },
  {
    title: "Utang gets forgotten",
    description:
      "Credit is written on a page and settled from memory. Balances drift, old debts go unchased, and working capital sits in someone else's kitchen.",
  },
  {
    title: "The drawer doesn't add up",
    description:
      "Cash is short at closing and there's no way to tell whether it was a mistake, a missed charge, or something worse.",
  },
];
