import type { ReactNode } from "react";

interface StateScreenProps {
  icon: string;
  heading: string;
  /** One or more paragraphs. Say what happened and what to do about it. */
  children: ReactNode;
  tone?: "neutral" | "bad";
  action?: ReactNode;
}

/**
 * Loading, empty, error, denied and no-access are the same layout with
 * different words, so they are one component -- five near-identical files
 * would drift, and the design's own rule is that these states are part of
 * every screen rather than a special case bolted on.
 *
 * `tone` never carries the meaning by itself (§47): an error says so in
 * words, and the colour only agrees with them.
 */
export function StateScreen({ icon, heading, children, tone = "neutral", action }: StateScreenProps) {
  return (
    <div className="empty" role="status">
      <div className={tone === "bad" ? "eic bad" : "eic"}>
        <i className={`ic ${icon} ic-s24`} aria-hidden />
      </div>
      <div className="t-sec">{heading}</div>
      <div className="t-cap" style={{ maxWidth: 460 }}>
        {children}
      </div>
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

/**
 * The loading state is a skeleton of the real layout rather than a spinner --
 * the design is explicit that a skeleton should be the shape of what is
 * coming, so the page does not jump when it arrives.
 */
export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="pad" aria-busy="true" aria-label={label}>
      <div className="sk t w25" />
      <div className="sk l w50" />
      <div className="row g12" style={{ marginTop: 18 }}>
        <div className="sk xl w25" />
        <div className="sk xl w25" />
        <div className="sk xl w25" />
      </div>
    </div>
  );
}
