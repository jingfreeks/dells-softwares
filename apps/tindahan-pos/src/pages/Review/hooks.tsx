import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useFeatures, fetchReviewSummary, fetchReviewHistory } from "@/lib";
import { reviewPeriodFor, type ReviewPeriodPreset, type ReviewPeriod } from "./lib";
import type { ReviewSummary, ReviewHistoryMonth } from "@/lib";

/** What the page should be showing right now. */
export type ReviewPageState = "loading" | "locked" | "ready" | "error";

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

  // "This month" is the design's default. One period drives every figure on
  // the page -- the brief forbids sales, inventory and utang each answering
  // for a different range.
  // A history row opens its month here, through the same location.state
  // channel the rest of the app uses for navigation intent. It arrives as a
  // custom period with the server's own bounds, so the report cannot disagree
  // with the row that opened it.
  const opened = (useLocation().state as { period?: ReviewPeriod } | null)?.period ?? null;

  const [preset, setPreset] = useState<ReviewPeriodPreset>(opened ? "custom" : "month");
  const [custom, setCustom] = useState<ReviewPeriod>(
    () => opened ?? reviewPeriodFor("month", { from: "", to: "" })
  );

  // The initialisers above only run on MOUNT, and the history card on this very
  // page navigates to /review -- the same route, so React Router updates
  // location.state without remounting anything. Without this the row would
  // highlight nothing and change nothing, which is worse than not being
  // clickable. Keyed on the dates so re-renders do not fight the user's own
  // later choice of period.
  useEffect(() => {
    if (!opened) return;
    setPreset("custom");
    setCustom(opened);
  }, [opened?.from, opened?.to]);
  const period = useMemo(() => reviewPeriodFor(preset, custom), [preset, custom]);

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

  return {
    state,
    summary,
    period,
    preset,
    // Switching away from Custom must not strand the dates the owner typed:
    // they are kept so switching back returns to them rather than to today.
    setPreset,
    custom,
    setCustom,
    retry: load,
  };
}

/**
 * The months there is something to review.
 *
 * Its own query rather than a key on the summary: the summary is period-scoped
 * and this is the whole life of the store, so folding it in would make every
 * dashboard load compute a list only the history view reads.
 *
 * Entitlement is waited on for the same reason the summary waits — an unloaded
 * answer is not an answer — and a store without it never asks.
 */
export function useReviewHistory(limit = 24) {
  const entitled = useReviewEntitlement();
  const [months, setMonths] = useState<ReviewHistoryMonth[]>([]);
  const [state, setState] = useState<ReviewPageState>("loading");

  const load = useCallback(async () => {
    if (entitled !== true) return;
    setState("loading");
    const result = await fetchReviewHistory(limit);
    if (result.ok) {
      setMonths(result.months);
      setState("ready");
      return;
    }
    setState(result.refused ? "locked" : "error");
  }, [entitled, limit]);

  useEffect(() => {
    if (entitled === null) {
      setState("loading");
      return;
    }
    if (entitled === false) {
      setState("locked");
      return;
    }
    void load();
  }, [entitled, load]);

  return { state, months, retry: load };
}
