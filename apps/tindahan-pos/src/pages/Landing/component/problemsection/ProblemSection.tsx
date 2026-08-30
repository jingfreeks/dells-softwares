import { ProblemCard } from "./component/problemcard";
import { PROBLEMS } from "./types";

export function ProblemSection() {
  return (
    <section className="tland-section">
      <div className="tland-wrap">
        <div className="tland-shead">
          <p className="tland-kicker">The problem</p>
          <h2>A notebook can&rsquo;t tell you what you&rsquo;re losing.</h2>
          <p className="tland-lede">
            Most small shops run on memory and a ledger. It works until the day you need to know why the money
            doesn&rsquo;t match the stock.
          </p>
        </div>
        <div className="tland-grid3">
          {PROBLEMS.map((problem) => (
            <ProblemCard key={problem.title} title={problem.title} description={problem.description} />
          ))}
        </div>
      </div>
    </section>
  );
}
