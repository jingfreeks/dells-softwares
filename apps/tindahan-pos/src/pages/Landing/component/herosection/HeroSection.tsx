import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="tland-hero">
      <div className="tland-wrap">
        <div className="tland-herogrid">
          <div>
            <span className="tpl-chip tpl-on" style={{ marginBottom: 22 }}>
              <span className="tland-dot" />
              Your tindahan, under control
            </span>
            <h1>
              Know your sales.
              <br />
              Know your stock.
              <br />
              <span className="tland-grad">Know your utang.</span>
            </h1>
            <p className="tland-lede" style={{ margin: "20px 0 30px" }}>
              Dells Software helps small shops manage daily sales, stock, utang, cashiers and reports from one
              simple system — no more guessing, no more notebook.
            </p>
            <p className="tland-nohw">
              <strong>No expensive POS machine required.</strong> Use the laptop or tablet you already have.
            </p>
            <div className="tland-heroctas">
              <Link className="tland-btn tland-btn-p" to="/register">
                Start Free
              </Link>
              <a className="tland-btn tland-btn-s" href="#how">
                See How It Works
              </a>
            </div>
            <p className="tland-microcopy">No card, no commitment. We&rsquo;ll walk through your actual products.</p>
            <div className="tland-trustrow">
              <div className="tland-stack">
                <span>MR</span>
                <span>JT</span>
                <span>AC</span>
                <span>+</span>
              </div>
              <p className="tland-microcopy">Designed with shop owners in Metro Manila and Laguna</p>
            </div>
          </div>

          <div className="tland-frame">
            <div className="tland-framebar">
              <i /> <i /> <i />
              <span className="tland-frameurl">dells-softwares-tindahan-pos.vercel.app</span>
            </div>
            <div className="tland-appbody">
              <div className="tland-side">
                <p className="tland-slbl">MENU</p>
                <p>POS</p>
                <p>Inventory</p>
                <p>Customers</p>
                <p className="tland-on">Admin</p>
                <p>Staff</p>
              </div>
              <div className="tland-appmain">
                <p style={{ color: "var(--tpl-t1)", fontSize: 14, fontWeight: 600 }}>Good morning, Lyndell</p>
                <p style={{ color: "var(--tpl-t7)", fontSize: 10.5, marginBottom: 11 }}>
                  Saturday, 1 August &middot; 37 sales so far
                </p>
                <div className="tland-heromockgrid">
                  <div className="tland-stat">
                    <i>TODAY&rsquo;S SALES</i>
                    <b>&#8369;4,820</b>
                    <u>&#9650; 12% vs yesterday</u>
                  </div>
                  <div className="tland-stat">
                    <i>TRANSACTIONS</i>
                    <b>37</b>
                    <u style={{ color: "var(--tpl-t7)" }}>&#8369;130 average</u>
                  </div>
                  <div
                    className="tland-stat"
                    style={{ background: "rgba(251,191,36,.07)", borderColor: "rgba(251,191,36,.28)" }}
                  >
                    <i style={{ color: "#B08A2E" }}>LOW STOCK</i>
                    <b style={{ color: "var(--tpl-warn)" }}>3</b>
                    <u style={{ color: "#B08A2E" }}>Restock today</u>
                  </div>
                </div>
                <div className="tpl-card" style={{ padding: "11px 12px", borderRadius: 10 }}>
                  <p style={{ color: "var(--tpl-t2)", fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>
                    Recent sales
                  </p>
                  <div className="tland-rowline">
                    <span className="tland-sq" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="tland-rlt">Lucky Me Pancit Canton &times;3</span>
                      <br />
                      <span className="tland-rls">2 min ago &middot; Cash</span>
                    </span>
                    <span className="tland-amt">&#8369;54.00</span>
                  </div>
                  <div className="tland-rowline">
                    <span className="tland-sq" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="tland-rlt">Coke Sakto &times;2, Skyflakes</span>
                      <br />
                      <span className="tland-rls">14 min ago &middot; GCash</span>
                    </span>
                    <span className="tland-amt">&#8369;78.50</span>
                  </div>
                  <div className="tland-rowline">
                    <span className="tland-sq tland-w" />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="tland-rlt">Bear Brand 320g</span>
                      <br />
                      <span className="tland-rls">48 min ago &middot; Utang &middot; Aling Rosa</span>
                    </span>
                    <span className="tland-amt">&#8369;132.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
