import { LABEL_ALL_DEVICES } from "@/lib";

interface DeviceOption {
  id: string;
  name: string;
}

interface DeviceFilterProps {
  devices: DeviceOption[];
  deviceId: string | null;
  onChange: (deviceId: string | null) => void;
}

export function DeviceFilter({ devices, deviceId, onChange }: DeviceFilterProps) {
  return (
    <div className="tpl-fld" style={{ padding: "0 10px", width: "auto" }}>
      <select
        aria-label={LABEL_ALL_DEVICES}
        value={deviceId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">{LABEL_ALL_DEVICES}</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </div>
  );
}
