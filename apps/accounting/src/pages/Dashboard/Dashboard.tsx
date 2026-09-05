import { AppShell, StateScreen } from "@/components";
import { APP_NAME, HEADING_EMPTY } from "@/lib";

/**
 * A placeholder, and deliberately an honest one.
 *
 * The Dashboard is the LAST chunk in the plan, not the first, because it is
 * the aggregate of every other screen -- and planning §18 is explicit that it
 * must show only metrics real accounting data supports. Rendering the design's
 * revenue, COGS and net-income strip now would mean inventing all three.
 *
 * So the route exists, the shell is real, and the page says there is nothing
 * to total yet.
 */
export function Dashboard() {
  return (
    <AppShell title={APP_NAME}>
      <StateScreen icon="ic-chartbar" heading={HEADING_EMPTY}>
        Your chart of accounts is ready to set up, but nothing has been posted yet, so there is
        nothing to total. Journal entries, expenses and the reports that draw on them are still
        being built.
      </StateScreen>
    </AppShell>
  );
}
