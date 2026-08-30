import type { DemoStepProps } from "./types";

export function DemoStep({ number, title, description }: DemoStepProps) {
  return (
    <div>
      <span className="tland-num">{number}</span>
      <div>
        <b>{title}</b>
        <p>{description}</p>
      </div>
    </div>
  );
}
