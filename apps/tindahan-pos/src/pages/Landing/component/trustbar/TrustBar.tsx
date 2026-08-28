import type { TrustBarProps } from "./types";

/** A 3-item proof strip -- reused post-hero (offline/hardware/setup) and pre-demo (access/audit/backup). */
export function TrustBar({ items }: TrustBarProps) {
  return (
    <div className="tland-strip">
      <div className="tland-wrap">
        <div className="tland-striprow">
          {items.map((item, i) => (
            <p key={i}>{item}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
