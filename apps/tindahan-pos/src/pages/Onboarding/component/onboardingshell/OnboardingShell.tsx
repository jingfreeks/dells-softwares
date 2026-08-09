import type { ReactNode } from "react";
import { APP_NAME, STORE_NAME, TEXT_SETTING_UP } from "@/lib";
import "@/pages/authTheme.css";
import type { OnboardingStep } from "../../hooks";
import { OnboardingSidebar } from "./OnboardingSidebar";

interface OnboardingShellProps {
  step: OnboardingStep;
  children: ReactNode;
}

export function OnboardingShell({ step, children }: OnboardingShellProps) {
  return (
    <div className="tpl-root tpl-shell-bg flex h-screen flex-col lg:flex-row">
      <OnboardingSidebar step={step} />

      <header className="tpl-root tpl-mobile-header flex lg:hidden">
        <div className="tpl-brand">
          <span className="tpl-mark" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 13 }}>
            {STORE_NAME.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="tpl-bn truncate">{STORE_NAME}</p>
            <p className="tpl-bs">{TEXT_SETTING_UP} · {APP_NAME}</p>
          </div>
        </div>
      </header>

      <main className="tpl-main flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
