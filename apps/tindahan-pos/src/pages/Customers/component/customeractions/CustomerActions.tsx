import { BUTTON_COLLECT, BUTTON_VIEW } from "@/lib";

interface CustomerActionsProps {
  hasBalance: boolean;
  onClick: () => void;
}

/** "Collect" when the customer owes money, "View" otherwise — same click handler either way. */
export function CustomerActions({ hasBalance, onClick }: CustomerActionsProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`tpl-chip${hasBalance ? " tpl-on" : ""}`}
      style={{ cursor: "pointer", justifyContent: "center", fontSize: 12, width: "100%" }}
    >
      {hasBalance ? BUTTON_COLLECT : BUTTON_VIEW}
    </button>
  );
}
