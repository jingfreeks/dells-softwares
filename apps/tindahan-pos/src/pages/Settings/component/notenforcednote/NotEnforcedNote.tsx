import { LABEL_NOT_ENFORCED_YET, TEXT_NOT_ENFORCED_YET_TITLE } from "@/lib";

interface NotEnforcedNoteProps {
  /** What is not enforced, and what that means for the shopkeeper. */
  children: string;
  /**
   * Overrides the default heading. Alerts needs its own: "Saved, but not
   * applied yet" implies the mechanism exists and is switched off, and for
   * push/SMS/email there is no mechanism at all.
   */
  title?: string;
}

/**
 * A card-level note for controls that save but are not acted on anywhere.
 *
 * See issue #470: these controls persist to localStorage and read as ordinary
 * working settings, which is a promise the backend has not made. Until each
 * one has a real store column and an enforcement path, say so on the screen.
 */
export function NotEnforcedNote({ children, title }: NotEnforcedNoteProps) {
  return (
    <div className="tpl-note tpl-w" style={{ marginTop: 13 }}>
      <i className="ti ti-alert-triangle" aria-hidden style={{ color: "#d9a93b" }} />
      <div className="tpl-flex1">
        <p className="tpl-nt" style={{ color: "#d9a93b" }}>
          {title ?? TEXT_NOT_ENFORCED_YET_TITLE}
        </p>
        <p className="tpl-ns" style={{ color: "#d9a93b" }}>
          {children}
        </p>
      </div>
    </div>
  );
}

/**
 * The inline counterpart, for a card where only some controls are unenforced —
 * Cash and credit limits holds two real, server-enforced settings alongside
 * four that are not, so marking the card as a whole would be wrong either way.
 */
export function NotEnforcedChip() {
  return (
    <span className="tpl-chip tpl-w" style={{ fontSize: 10.5, padding: "2px 8px", marginLeft: 8 }}>
      {LABEL_NOT_ENFORCED_YET}
    </span>
  );
}
