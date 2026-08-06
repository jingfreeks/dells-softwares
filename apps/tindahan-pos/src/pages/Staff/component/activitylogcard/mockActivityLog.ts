export interface ActivityLogEntry {
  id: string;
  icon: string;
  iconVariant: "" | "w" | "r" | "g";
  title: string;
  description: string;
}

/**
 * TODO: replace with a real audit-trail query once the backend tracks
 * these events (drawer counts, voids, utang overrides, shift open/close).
 * None of it exists in the schema today — see lib/drawerFloat for the
 * same gap noted against shift tracking.
 */
export const MOCK_ACTIVITY_LOG: ActivityLogEntry[] = [
  {
    id: "mock-1",
    icon: "ti-cash",
    iconVariant: "w",
    title: "Drawer short ₱40 at close",
    description: "Maricel · Tue shift · counted ₱3,175 vs ₱3,215",
  },
  {
    id: "mock-2",
    icon: "ti-trash",
    iconVariant: "r",
    title: "Sale voided after payment · ₱132",
    description: "Jerome · yesterday 4:12 PM · approved by you",
  },
  {
    id: "mock-3",
    icon: "ti-notebook",
    iconVariant: "",
    title: "Utang past limit · Aling Rosa ₱1,132",
    description: "Maricel · 3 days ago · you approved by PIN",
  },
  {
    id: "mock-4",
    icon: "ti-login",
    iconVariant: "",
    title: "Shift opened · float ₱2,000 counted",
    description: "Maricel · today 7:02 AM",
  },
];
