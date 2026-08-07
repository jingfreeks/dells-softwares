import type { ReactNode } from "react";
import "@/pages/authTheme.css";
import { SettingsSidebar } from "../settingssidebar";

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="tpl-root flex min-h-full flex-1 flex-col lg:flex-row">
      <SettingsSidebar />
      <div className="min-w-0 flex-1 p-6">{children}</div>
    </div>
  );
}
