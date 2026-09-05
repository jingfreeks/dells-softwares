import { useCallback, useEffect, useState } from "react";
import { useFeatures, fetchReviewSummary } from "@/lib";
import type { ReviewSummary } from "@/lib";

/** What the page should be showing right now. */
export type ReviewPageState = "loading" | "locked" | "ready" | "error";

/**
 * The month the design's date control defaults to ("This month"), in Manila
 * terms. review_summary() bounds the period in Asia/Manila too, so a review
 * and the Z-reading covering the same day agree about which day it was.
 */
function thisMonth(): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month] = parts.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

/**
 * Is this store entitled to Review, and do we know yet?
 *
 * null means "still loading", and callers must treat that as neither yes nor
 * no. useFeature() fails OPEN while loading, which is right for hiding a nav
 * item and wrong here: guessing "entitled" flashes real figures at a Starter
 * store, and guessing "locked" tells a paying one it has been downgraded.
 *
 * Shared by the dashboard and the low-stock detail so a route added later
 * cannot accidentally gate itself differently -- the brief's §20 is explicit
 * that a direct URL must not bypass the plan.
 */
export function useReviewEntitlement(): boolean | null {
  const { features, loading } = useFeatures();
  return loading ? null : features.has("pos.review");
}

export function useReviewPage() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [state, setState] = useState<ReviewPageState>("loading");
  const [period] = useState(thisMonth);

  const entitled = useReviewEntitlement();

  const load = useCallback(async () => {
    if (entitled !== true) return;
    setState("loading");
    // No third argument on purpose: the server reads the store's own
              // utang_overdue_days. Passing a client default here is what made
              // Review disagree with the Customers page.
    const result = await fetchReviewSummary(period.from, period.to);
    if (result.ok) {
      setSummary(result.summary);
      setState("ready");
      return;
    }
    // A refusal here means the client and the server disagree about the plan,
    // which the server wins. Showing the upgrade state is the honest outcome.
    setState(result.refused ? "locked" : "error");
  }, [entitled, period.from, period.to]);

  useEffect(() => {
    if (entitled === null) {
      setState("loading");
      return;
    }
    if (entitled === false) {
      // Never requested. The locked screen is marketing, and marketing does
      // not need the customer's data to render.
      setState("locked");
      return;
    }
    void load();
  }, [entitled, load]);

  return { state, summary, period, retry: load };
}
