import { HEADING_ACTIVITY_LOG, LINK_FULL_LOG } from "@/lib";
import { MOCK_ACTIVITY_LOG } from "./mockActivityLog";

export function ActivityLogCard() {
  return (
    <div className="tpl-card">
      <div className="tpl-sp" style={{ marginBottom: 11 }}>
        <p className="tpl-h3">{HEADING_ACTIVITY_LOG}</p>
        <span className="tpl-lnk">{LINK_FULL_LOG}</span>
      </div>

      {MOCK_ACTIVITY_LOG.map((entry) => (
        <div key={entry.id} className="tpl-lr" style={{ alignItems: "flex-start" }}>
          <span className={`tpl-ic${entry.iconVariant ? ` tpl-${entry.iconVariant}` : ""}`}>
            <i className={`ti ${entry.icon}`} aria-hidden />
          </span>
          <div className="tpl-flex1">
            <p className="tpl-tp">{entry.title}</p>
            <p className="tpl-ts">{entry.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
