import { Link } from "react-router-dom";

export function ClosingCta() {
  return (
    <section className="tland-section tland-closing" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <h2 style={{ marginBottom: 14 }}>Find out if it fits your shop.</h2>
        <p className="tland-lede" style={{ margin: "0 auto 28px" }}>
          You don&rsquo;t need a complicated system to run a better store. Start with the tools you actually need —
          fifteen minutes with your own products is all it takes to see it.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="tland-btn tland-btn-p" to="/register">
            Start Free
          </Link>
          <a className="tland-btn tland-btn-s" href="#how">
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
