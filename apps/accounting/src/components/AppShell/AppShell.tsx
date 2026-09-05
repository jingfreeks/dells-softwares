import type { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { APP_NAME, BRAND_NAME, BUTTON_SIGN_OUT, useSession } from "@/lib";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Sidebar, header, content. The header carries the one control that exists
 * today -- sign out -- and states plainly that it ends the Tindahan POS
 * session too, because it is one session and finding that out afterwards is
 * the kind of surprise the app switcher was designed to prevent.
 *
 * The period and branch pills from the design are not here yet: neither has
 * anything behind it until accounting periods land in B1. A pill that cannot
 * change anything is a control that lies.
 */
export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { session, signOut } = useSession();
  const email = session?.user.email ?? "";

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header className="hdr">
          <div>
            <div className="hdr-t">{title}</div>
            <div className="hdr-sub">
              {BRAND_NAME} &middot; {APP_NAME}
              {subtitle ? ` · ${subtitle}` : ""}
            </div>
          </div>
          <div className="sp" />
          <div className="row g8">
            {email ? <span className="t-cap">{email}</span> : null}
            <button type="button" className="btn" onClick={() => void signOut()}>
              {BUTTON_SIGN_OUT}
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
