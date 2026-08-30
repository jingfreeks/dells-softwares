import { FaqItem } from "./component/faqitem";
import { FAQS } from "./types";

export function FaqSection() {
  return (
    <section className="tland-section" id="faq" style={{ borderTop: "0.5px solid var(--tpl-bd3)" }}>
      <div className="tland-wrap">
        <div className="tland-shead">
          <p className="tland-kicker">Questions</p>
          <h2>The things owners ask us first.</h2>
        </div>
        <div className="tland-faq">
          {FAQS.map((faq, i) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
