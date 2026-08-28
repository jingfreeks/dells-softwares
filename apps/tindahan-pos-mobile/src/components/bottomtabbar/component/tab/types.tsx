import type { TabItem } from "../../types";

export interface TabProps {
  tab: TabItem;
  active: boolean;
  onPress: () => void;
}
