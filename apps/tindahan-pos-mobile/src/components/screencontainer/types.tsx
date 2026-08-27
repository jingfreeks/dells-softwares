import type { ReactNode } from "react";

export interface ScreenContainerProps {
  children: ReactNode;
  /** Reserves extra bottom space for a fixed BottomTabBar sitting over the content (§8 `.pbody.pad`). */
  reserveTabBarSpace?: boolean;
  scrollable?: boolean;
}
