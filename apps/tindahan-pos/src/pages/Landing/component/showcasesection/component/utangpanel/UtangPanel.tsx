export function UtangPanel() {
  return (
    <div className="tland-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: "var(--tpl-t2)", fontWeight: 600 }}>Utang outstanding</span>
        <span style={{ fontSize: 20, fontWeight: 600, color: "var(--tpl-t1)" }}>₱4,860</span>
      </div>
      <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", marginBottom: 14 }}>
        <span style={{ width: "31%", background: "#3B82F6" }} />
        <span style={{ width: "29%", background: "#60A5FA" }} />
        <span style={{ width: "40%", background: "#F87171" }} />
      </div>
      <div style={{ display: "grid", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--tpl-t4)" }}>0&ndash;14 days</span>
          <span style={{ fontSize: 13, color: "var(--tpl-t2)" }}>₱1,510</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--tpl-t4)" }}>15&ndash;30 days</span>
          <span style={{ fontSize: 13, color: "var(--tpl-t2)" }}>₱1,430</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "var(--tpl-bad)" }}>Over 30 days</span>
          <span style={{ fontSize: 13, color: "var(--tpl-bad)" }}>₱1,920</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--tpl-t7)", marginTop: 14, paddingTop: 12, borderTop: "0.5px solid var(--tpl-bd)" }}>
        40% of this shop&rsquo;s utang is older than a month — capital sitting on someone else&rsquo;s shelf.
      </p>
    </div>
  );
}
