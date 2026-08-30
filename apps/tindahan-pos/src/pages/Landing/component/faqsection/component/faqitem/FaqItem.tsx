import type { FaqItemProps } from "./types";

export function FaqItem({ question, answer, defaultOpen }: FaqItemProps) {
  return (
    <details open={defaultOpen}>
      <summary>{question}</summary>
      <p>{answer}</p>
    </details>
  );
}
