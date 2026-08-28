import type { PricingCardProps } from "./types";

export function PricingCard({ name, tag, amount, description, features, featured, cta }: PricingCardProps) {
  return (
    <div className={`tland-price ${featured ? "tland-featured" : ""}`}>
      {tag && <span className="tland-ptag">{tag}</span>}
      <p className="tland-pname">{name}</p>
      <p className="tland-pamt">{amount}</p>
      <p className="tland-pdesc">{description}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}>
            <span className="tland-tick">&#10003;</span>
            {feature}
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
