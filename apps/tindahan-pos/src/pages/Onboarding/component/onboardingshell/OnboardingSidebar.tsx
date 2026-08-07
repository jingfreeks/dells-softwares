import {
  STORE_NAME,
  TEXT_SETTING_UP,
  LABEL_STEP_STORE_PROFILE,
  TEXT_STEP_STORE_PROFILE_DESC,
  LABEL_STEP_ADD_PRODUCTS,
  TEXT_STEP_ADD_PRODUCTS_DESC,
  LABEL_STEP_STOCK_ALERTS,
  TEXT_STEP_STOCK_ALERTS_DESC,
  LABEL_STEP_OPEN_REGISTER,
  TEXT_STEP_OPEN_REGISTER_DESC,
  TEXT_ABOUT_PREFIX,
  TEXT_MINUTES_LEFT_SUFFIX,
} from "@/lib";
import type { OnboardingStep } from "../../hooks";
import { onboardingMinutesLeft, onboardingProgressPercent, storeProfileStatus, addProductsStatus, type SidebarStepStatus } from "../../lib";

interface SidebarItem {
  label: string;
  desc: string;
  status: SidebarStepStatus;
}

function StepIcon({ status, number }: { status: SidebarStepStatus; number: number }) {
  const variant = status === "done" ? "tpl-g" : status === "current" ? "tpl-b" : "tpl-n";
  return (
    <span
      className={`tpl-av ${variant}`}
      style={{
        width: 22,
        height: 22,
        fontSize: 11,
        border: status === "current" ? "1px solid rgba(76,141,255,.55)" : undefined,
        boxShadow: status === "current" ? "0 0 14px rgba(76,141,255,.30)" : undefined,
      }}
    >
      {status === "done" ? <i className="ti ti-check" aria-hidden /> : number}
    </span>
  );
}

interface OnboardingSidebarProps {
  step: OnboardingStep;
}

export function OnboardingSidebar({ step }: OnboardingSidebarProps) {
  const items: SidebarItem[] = [
    { label: LABEL_STEP_STORE_PROFILE, desc: TEXT_STEP_STORE_PROFILE_DESC, status: storeProfileStatus(step) },
    { label: LABEL_STEP_ADD_PRODUCTS, desc: TEXT_STEP_ADD_PRODUCTS_DESC, status: addProductsStatus(step) },
    { label: LABEL_STEP_STOCK_ALERTS, desc: TEXT_STEP_STOCK_ALERTS_DESC, status: "upcoming" },
    { label: LABEL_STEP_OPEN_REGISTER, desc: TEXT_STEP_OPEN_REGISTER_DESC, status: "upcoming" },
  ];
  const percent = onboardingProgressPercent(step);
  const minutesLeft = onboardingMinutesLeft(step);

  return (
    <aside className="tpl-root tpl-side hidden h-full shrink-0 lg:flex">
      <div className="tpl-brand">
        <span className="tpl-mark" style={{ width: 34, height: 34 }}>
          {STORE_NAME.charAt(0)}
        </span>
        <div>
          <p className="tpl-bn">{STORE_NAME}</p>
          <p className="tpl-bs">{TEXT_SETTING_UP}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {items.map((item, i) => (
          <div key={item.label} style={{ display: "flex", gap: 11, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <StepIcon status={item.status} number={i + 1} />
              {i < items.length - 1 && (
                <span
                  style={{
                    width: 1,
                    flex: 1,
                    background: item.status === "done" ? "rgba(74,222,128,.30)" : "rgba(255,255,255,.10)",
                    marginTop: 4,
                    minHeight: 16,
                  }}
                />
              )}
            </div>
            <div>
              <p style={{ color: item.status === "current" ? "var(--tpl-t2)" : "var(--tpl-t5)", fontSize: 13, fontWeight: item.status === "current" ? 500 : 400 }}>
                {item.label}
              </p>
              <p className="tpl-ts" style={{ color: item.status === "current" ? "var(--tpl-a4)" : "var(--tpl-t7)" }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="tpl-grow" />

      <div className="tpl-bar" style={{ marginBottom: 8 }}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <p className="tpl-ts">
        {TEXT_ABOUT_PREFIX} {minutesLeft} {TEXT_MINUTES_LEFT_SUFFIX}
      </p>
    </aside>
  );
}
