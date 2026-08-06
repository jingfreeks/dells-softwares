import { Link } from "react-router-dom";
import {
  APP_NAME,
  PAGE_HEADING_CHECK_YOUR_EMAIL,
  TEXT_CONFIRMATION_EMAIL_SENT_PREFIX,
  TEXT_CONFIRMATION_EMAIL_SENT_SUFFIX,
  LINK_BACK_TO_LOGIN,
} from "@/lib";

export function ConfirmationSentScreen({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-[var(--color-brand)]">{APP_NAME}</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{PAGE_HEADING_CHECK_YOUR_EMAIL}</h1>
        <p role="status" className="mt-3 text-sm text-slate-600">
          {TEXT_CONFIRMATION_EMAIL_SENT_PREFIX} <span className="font-medium">{email}</span>
          {TEXT_CONFIRMATION_EMAIL_SENT_SUFFIX}
        </p>
        <Link to="/login" className="mt-6 inline-block font-medium text-[var(--color-brand)] hover:underline">
          {LINK_BACK_TO_LOGIN}
        </Link>
      </div>
    </div>
  );
}
