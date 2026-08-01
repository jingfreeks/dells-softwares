import { ARIA_SHOW_PASSWORD, ARIA_HIDE_PASSWORD } from "@/lib";
import { EyeIcon, EyeOffIcon } from "@/components";

type PasswordFieldProps = {
  id: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  minLength?: number;
};

export function PasswordField({
  id,
  autoComplete,
  value,
  onChange,
  visible,
  onToggleVisible,
  minLength,
}: PasswordFieldProps) {
  return (
    <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-[var(--color-brand)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? ARIA_HIDE_PASSWORD : ARIA_SHOW_PASSWORD}
          className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
  );
}
