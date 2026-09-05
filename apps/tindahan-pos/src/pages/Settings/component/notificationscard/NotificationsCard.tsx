import {
  LABEL_TELL_ME_ABOUT,
  TEXT_NOTIFY_LOW_STOCK,
  TEXT_NOTIFY_DRAWER_VARIANCE,
  TEXT_NOTIFY_UTANG_AGING,
  TEXT_NOTIFY_EVERY_SALE,
  TEXT_ALERTS_NO_DELIVERY,
  TEXT_ALERTS_NO_DELIVERY_TITLE,
} from "@/lib";
import { NotEnforcedNote } from "../notenforcednote";
import type { NotificationPreferences } from "../../settingsProfileMock";

const NOTIFICATION_ROWS: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "lowStockDaily", label: TEXT_NOTIFY_LOW_STOCK },
  { key: "drawerVarianceAtClose", label: TEXT_NOTIFY_DRAWER_VARIANCE },
  { key: "utangAging", label: TEXT_NOTIFY_UTANG_AGING },
  { key: "everyCompletedSale", label: TEXT_NOTIFY_EVERY_SALE },
];

interface NotificationsCardProps {
  notifications: NotificationPreferences;
  onToggle: (key: keyof NotificationPreferences) => void;
}

export function NotificationsCard({ notifications, onToggle }: NotificationsCardProps) {
  return (
    <div className="tpl-card" style={{ marginBottom: 11 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_TELL_ME_ABOUT}
      </p>
      {NOTIFICATION_ROWS.map((row) => (
        <div key={row.key} className="tpl-sp" style={{ padding: "5px 0" }}>
          <span style={{ color: "var(--tpl-t4)", fontSize: 13 }}>{row.label}</span>
          <button
            type="button"
            role="switch"
            aria-checked={notifications[row.key]}
            aria-label={row.label}
            onClick={() => onToggle(row.key)}
            className={`tpl-tog${notifications[row.key] ? " tpl-on" : ""}`}
          >
            <span />
          </button>
        </div>
      ))}
      {/*
        Stronger than the "Not enforced yet" chip used elsewhere, and
        deliberately so. Those mark a setting nothing reads. These configure a
        DELIVERY MECHANISM THAT DOES NOT EXIST -- there is no push, SMS or
        email in this product -- so "not enforced yet" would imply the pipe is
        built and the switch is merely off.
      */}
      <NotEnforcedNote title={TEXT_ALERTS_NO_DELIVERY_TITLE}>{TEXT_ALERTS_NO_DELIVERY}</NotEnforcedNote>
    </div>
  );
}
