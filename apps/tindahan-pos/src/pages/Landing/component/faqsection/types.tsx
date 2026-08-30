export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "Do I need to buy a POS machine?",
    answer:
      "No. Tindahan POS runs on a laptop or tablet you already own — any reasonably recent Android tablet, laptop, or desktop browser works. If you later want a barcode scanner or a thermal receipt printer, both are supported, but neither is required to get started.",
  },
  {
    question: "Can I use this for a sari-sari store?",
    answer:
      "Yes — it's built for exactly that: sari-sari stores, mini-stores, and small family-run retailers. Tap a product tile or scan a barcode, since most small-shop items don't have one. You can start from a ready-made list of common items instead of typing everything in.",
  },
  {
    question: "Can I track customer utang?",
    answer:
      "Yes. Each customer gets a balance with a credit limit you set, and the app shows how long they've owed you — not just how much — so you always know who to follow up with first.",
  },
  {
    question: "Can I manage multiple cashiers?",
    answer:
      "Yes. Each cashier signs in with their own PIN, sees only their own shift, and every sale is attributed to whoever rang it up.",
  },
  {
    question: "Can I see my daily sales?",
    answer:
      "Yes. The dashboard shows today's sales, transactions, low stock, outstanding utang, recent sales and best sellers at a glance — no manual tallying at the end of the day.",
  },
  {
    question: "Can I export my records?",
    answer:
      "Yes. Sales, products and customer records can be exported as a spreadsheet at any time. Your data is yours — you are never locked in to keep using the app to see your own numbers.",
  },
  {
    question: "Is my business data secure?",
    answer:
      "Your account is protected by sign-in credentials and role-based access, so cashiers only see what their role needs. Sales history is backed up and every transaction is recorded, which is what makes reporting reliable. We don't make blanket security claims beyond what's actually implemented — ask us for specifics if you need them for compliance.",
  },
];
