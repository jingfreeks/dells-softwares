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

export function useReviewPage() {
  const { features, loading: featuresLoading } = useFeatures();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [state, setState] = useState<ReviewPageState>("loading");
  const [period] = useState(thisMonth);

  /**
   * useFeature() fails OPEN while loading, which is right for hiding a nav
   * item and wrong here: guessing "entitled" would flash the dashboard at a
   * Starter store, and guessing "locked" would flash an upgrade prompt at a
   * paying one. So this waits, exactly as Staff.tsx waits on permissions
   * before redirecting. An unloaded answer is not an answer.
   */
  const entitled = featuresLoading ? null : features.has("pos.review");

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
