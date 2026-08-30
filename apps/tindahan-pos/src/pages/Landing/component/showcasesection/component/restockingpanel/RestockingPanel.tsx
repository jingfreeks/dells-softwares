const ITEMS = [
  { name: "Sardinas 155g", order: "Order 24", pct: 3, tone: "r" as const, detail: "0 left · sells ~4/day · out now" },
  { name: "Skyflakes crackers", order: "Order 30", pct: 13, tone: "w" as const, detail: "4 left · sells ~9/day · out in ~12 hrs" },
  { name: "Bear Brand 320g", order: "Order 20", pct: 20, tone: "w" as const, detail: "6 left · sells ~5/day · out in ~1 day" },
];

const BAR_COLOR = { r: "var(--tpl-bad)", w: "var(--tpl-warn)" };

export function RestockingPanel() {
  return (
    <div className="tland-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 14, color: "var(--tpl-t2)", fontWeight: 600 }}>Needs restocking</span>
        <span className="tpl-chip tpl-w">3 items</span>
      </div>
      <div style={{ display: "grid", gap: 13 }}>
        {ITEMS.map((item) => (
          <div key={item.name}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: "var(--tpl-t3)" }}>{item.name}</span>
              <span className="tpl-chip tpl-on">{item.order}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${item.pct}%`, background: BAR_COLOR[item.tone] }} />
            </div>
            <p style={{ fontSize: 11, color: "var(--tpl-t7)", marginTop: 4 }}>{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
