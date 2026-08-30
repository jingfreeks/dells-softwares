export function CheckoutPanel() {
  return (
    <div className="tland-panel">
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="tpl-chip tpl-on">All</span>
        <span className="tpl-chip">Snacks</span>
        <span className="tpl-chip">Drinks</span>
        <span className="tpl-chip">Household</span>
        <span className="tpl-chip">Services</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        <PosTile name="Pancit Canton" price="₱18.00" badge={3} on />
        <PosTile name="Coke Sakto" price="₱20.00" />
        <PosTile name="Skyflakes" price="₱9.00" badge={2} on warn="4 left" />
        <PosTile name="Bear Brand" price="₱33.00" />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingTop: 12,
          borderTop: "0.5px solid var(--tpl-bd)",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--tpl-t4)", fontWeight: 500 }}>Total</span>
        <span style={{ fontSize: 26, fontWeight: 600, color: "var(--tpl-t1)" }}>₱70.00</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          background: "rgba(74,222,128,.07)",
          border: "0.5px solid rgba(74,222,128,.28)",
          borderRadius: 10,
          padding: "9px 12px",
          marginTop: 10,
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--tpl-okd)" }}>Change</span>
        <span style={{ fontSize: 19, fontWeight: 600, color: "var(--tpl-ok)" }}>₱30.00</span>
      </div>
    </div>
  );
}

function PosTile({ name, price, badge, on, warn }: { name: string; price: string; badge?: number; on?: boolean; warn?: string }) {
  return (
    <div
      style={{
        background: on ? "rgba(76,141,255,.10)" : "var(--tpl-gl)",
        border: `0.5px solid ${on ? "rgba(76,141,255,.42)" : "var(--tpl-bd)"}`,
        borderRadius: 10,
        padding: "10px 9px",
        position: "relative",
      }}
    >
      {badge !== undefined && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "var(--tpl-a2)",
            color: "#fff",
            fontSize: 9,
            width: 16,
            height: 16,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
      <b style={{ display: "block", fontSize: 11, color: "var(--tpl-t3)", fontWeight: 500, marginBottom: 2, lineHeight: 1.3 }}>
        {name}
      </b>
      <span style={{ fontSize: 12, color: on ? "var(--tpl-a4)" : "var(--tpl-t2)", fontWeight: 600 }}>{price}</span>
      {warn && <span style={{ display: "block", fontSize: 9.5, color: "var(--tpl-warn)" }}>{warn}</span>}
    </div>
  );
}
