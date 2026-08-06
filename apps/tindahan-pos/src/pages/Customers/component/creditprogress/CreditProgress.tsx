import { PESO, TEXT_OF_INFIX, TEXT_OVER_LIMIT_SUFFIX, LABEL_NO_CREDIT_LIMIT_SET } from "@/lib";
import type { CreditUsageVariant } from "../../lib";

interface CreditProgressProps {
  used: number;
  limit: number | null;
  variant: CreditUsageVariant;
}

const FILL_CLASS: Record<CreditUsageVariant, string> = {
  default: "",
  warn: "tpl-w",
  danger: "tpl-r",
};

export function CreditProgress({ used, limit, variant }: CreditProgressProps) {
  const percent = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const overLimit = limit !== null && used > limit;

  return (
    <div>
      <div className="tpl-bar" style={{ marginBottom: 4 }}>
        <i className={FILL_CLASS[variant]} style={{ width: `${percent}%` }} />
      </div>
      <p className="tpl-ts">
        {limit === null ? (
          LABEL_NO_CREDIT_LIMIT_SET
        ) : (
          <>
            {PESO.format(used)} {TEXT_OF_INFIX} {PESO.format(limit)}
            {overLimit && ` · ${TEXT_OVER_LIMIT_SUFFIX}`}
          </>
        )}
      </p>
    </div>
  );
}
