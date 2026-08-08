import {
  LABEL_HOW_AND_WHEN,
  LABEL_CHANNEL_PUSH,
  TEXT_CHANNEL_PUSH_DESC,
  LABEL_CHANNEL_SMS,
  TEXT_CHANNEL_SMS_DESC,
  LABEL_CHANNEL_EMAIL,
  LABEL_ON_BADGE,
  TEXT_CHANNEL_OFF,
  LABEL_DAILY_SUMMARY_AT,
  TEXT_DAILY_SUMMARY_AT_DESC,
  LABEL_QUIET_HOURS,
  TEXT_QUIET_HOURS_DESC,
} from "@/lib";

interface HowAndWhenCardProps {
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  onToggleChannel: (channel: "pushEnabled" | "smsEnabled" | "emailEnabled") => void;
  dailySummaryTime: string;
  onDailySummaryTimeChange: (value: string) => void;
  quietHoursStart: string;
  onQuietHoursStartChange: (value: string) => void;
  quietHoursEnd: string;
  onQuietHoursEndChange: (value: string) => void;
}

export function HowAndWhenCard({
  pushEnabled,
  smsEnabled,
  emailEnabled,
  onToggleChannel,
  dailySummaryTime,
  onDailySummaryTimeChange,
  quietHoursStart,
  onQuietHoursStartChange,
  quietHoursEnd,
  onQuietHoursEndChange,
}: HowAndWhenCardProps) {
  const channels: {
    key: "pushEnabled" | "smsEnabled" | "emailEnabled";
    icon: string;
    label: string;
    onDesc: string;
    on: boolean;
  }[] = [
    { key: "pushEnabled", icon: "ti-bell", label: LABEL_CHANNEL_PUSH, onDesc: TEXT_CHANNEL_PUSH_DESC, on: pushEnabled },
    { key: "smsEnabled", icon: "ti-message", label: LABEL_CHANNEL_SMS, onDesc: TEXT_CHANNEL_SMS_DESC, on: smsEnabled },
    { key: "emailEnabled", icon: "ti-mail", label: LABEL_CHANNEL_EMAIL, onDesc: LABEL_ON_BADGE, on: emailEnabled },
  ];

  return (
    <div className="tpl-card" style={{ marginBottom: 18 }}>
      <p className="tpl-h3" style={{ marginBottom: 11 }}>
        {LABEL_HOW_AND_WHEN}
      </p>

      <div className="tpl-g3" style={{ marginBottom: 14 }}>
        {channels.map((channel) => (
          <button
            key={channel.key}
            type="button"
            role="switch"
            aria-checked={channel.on}
            aria-label={channel.label}
            onClick={() => onToggleChannel(channel.key)}
            className={`tpl-btn${channel.on ? " tpl-on" : ""}`}
            style={{ height: "auto", padding: 11, flexDirection: "column", alignItems: "flex-start", gap: 1 }}
          >
            <i className={`ti ${channel.icon}`} style={{ fontSize: 17 }} aria-hidden />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{channel.label}</span>
            <span className="tpl-ts">{channel.on ? channel.onDesc : TEXT_CHANNEL_OFF}</span>
          </button>
        ))}
      </div>

      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        style={{ padding: "6px 0", borderBottom: "0.5px solid var(--tpl-bd3)" }}
      >
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_DAILY_SUMMARY_AT}</p>
          <p className="tpl-ts">{TEXT_DAILY_SUMMARY_AT_DESC}</p>
        </div>
        <div
          className="tpl-fld tpl-mono"
          style={{ height: 28, width: 110, justifyContent: "center", flexShrink: 0 }}
        >
          <input
            type="time"
            value={dailySummaryTime}
            onChange={(e) => onDailySummaryTimeChange(e.target.value)}
            aria-label={LABEL_DAILY_SUMMARY_AT}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" style={{ padding: "6px 0" }}>
        <div className="tpl-flex1">
          <p className="tpl-tp">{LABEL_QUIET_HOURS}</p>
          <p className="tpl-ts">{TEXT_QUIET_HOURS_DESC}</p>
        </div>
        <div className="tpl-row" style={{ gap: 6, flexShrink: 0 }}>
          <div
            className="tpl-fld tpl-mono"
            style={{ height: 28, width: 110, justifyContent: "center", flexShrink: 0 }}
          >
            <input
              type="time"
              value={quietHoursStart}
              onChange={(e) => onQuietHoursStartChange(e.target.value)}
              aria-label={`${LABEL_QUIET_HOURS} start`}
            />
          </div>
          <div
            className="tpl-fld tpl-mono"
            style={{ height: 28, width: 110, justifyContent: "center", flexShrink: 0 }}
          >
            <input
              type="time"
              value={quietHoursEnd}
              onChange={(e) => onQuietHoursEndChange(e.target.value)}
              aria-label={`${LABEL_QUIET_HOURS} end`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
