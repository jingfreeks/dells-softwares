import { useCallback, useEffect, useState } from "react";
import { useFeatureState } from "../../lib/features";
import {
  fetchReviewSummary,
  fetchReviewHistory,
  thisMonthPeriod,
  type ReviewSummary,
  type ReviewHistoryMonth,
} from "../../lib/review";

export type ReviewScreenState = "loading" | "locked" | "ready" | "error";

export function useReviewScreen() {
  const entitled = useFeatureState("pos.review");
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [months, setMonths] = useState<ReviewHistoryMonth[]>([]);
  const [state, setState] = useState<ReviewScreenState>("loading");
  const [period] = useState(thisMonthPeriod);

  const load = useCallback(async () => {
    if (entitled !== true) return;
    setState("loading");
    // Both in flight together: they are independent reads and a phone on a
    // sari-sari store's connection should not pay for them in sequence.
    const [result, history] = await Promise.all([
      fetchReviewSummary(period.from, period.to),
      fetchReviewHistory(6),
    ]);
    if (result.ok) {
      setSummary(result.summary);
      // History failing is not worth failing the screen for -- the metrics are
      // the point, and an empty list reads as "no months yet" either way.
      setMonths(history.ok ? history.months : []);
      setState("ready");
      return;
    }
    // A refusal means the client and the server disagree about the plan, and
    // the server wins. The upgrade state is the honest outcome, not an error.
    setState(result.refused ? "locked" : "error");
  }, [entitled, period.from, period.to]);

  useEffect(() => {
    // null is "still loading", and must not be read as either answer:
    // guessing entitled flashes real figures at a Starter store, guessing
    // locked tells a paying one it has been downgraded.
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

  return { state, summary, months, retry: load };
}
