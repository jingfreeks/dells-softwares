import { useCallback, useEffect, useState } from "react";
import { useFeatureState } from "../../lib/features";
import { fetchReviewSummary, thisMonthPeriod, type ReviewSummary } from "../../lib/review";

export type ReviewScreenState = "loading" | "locked" | "ready" | "error";

export function useReviewScreen() {
  const entitled = useFeatureState("pos.review");
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [state, setState] = useState<ReviewScreenState>("loading");
  const [period] = useState(thisMonthPeriod);

  const load = useCallback(async () => {
    if (entitled !== true) return;
    setState("loading");
    const result = await fetchReviewSummary(period.from, period.to);
    if (result.ok) {
      setSummary(result.summary);
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

  return { state, summary, retry: load };
}
