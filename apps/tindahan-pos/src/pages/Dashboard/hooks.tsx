import { useEffect, useMemo, useState } from "react";
import { buildDailyReport, salesByCategory, STORE_NAME, TEXT_SHARE_NOT_SUPPORTED, ERROR_COULD_NOT_GENERATE_REPORT } from "@/lib";
import type { Product, SaleRecord } from "@/lib";
import type { CardSection } from "@/lib/reportPdf";
import type { CardActions } from "@/components";

type ReportAction = "download" | "print" | "share" | null;

export function useDashboardReport(products: Product[], sales: SaleRecord[]) {
  const [reportAction, setReportAction] = useState<ReportAction>(null);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const report = useMemo(() => buildDailyReport(products, sales), [products, sales]);
  const categoryTotals = useMemo(() => salesByCategory(sales, products), [sales, products]);
  const recentSales = sales.slice(0, 8);

  // Warms the lazy reportPdf chunk ahead of any click, so by the time
  // someone actually hits Print/Share the import() below resolves
  // (near-)instantly instead of adding a real network/parse delay. Print
  // and Share both need to fire their browser API call (window.open /
  // navigator.share) within the click's user-activation window, which a
  // slow first-time import could burn through entirely.
  useEffect(() => {
    void import("@/lib/reportPdf");
  }, []);

  async function runReportAction(action: Exclude<ReportAction, null>) {
    // window.open() must happen synchronously in the click handler, before
    // any `await` — by the time the dynamic import below resolves, the
    // browser may no longer consider this "in response to user input",
    // and a window opened after that point can silently fail to navigate.
    // See printPdfDoc's doc comment in reportPdf.ts for the full story.
    const targetWindow = action === "print" ? window.open("", "_blank") : null;
    setReportAction(action);
    setReportNotice(null);
    try {
      const { downloadDailyReportPdf, printDailyReportPdf, shareDailyReportPdf } = await import(
        "@/lib/reportPdf"
      );
      if (action === "download") {
        downloadDailyReportPdf(report, STORE_NAME);
      } else if (action === "print") {
        printDailyReportPdf(report, STORE_NAME, targetWindow);
      } else {
        const result = await shareDailyReportPdf(report, STORE_NAME);
        if (result === "downloaded") {
          setReportNotice(TEXT_SHARE_NOT_SUPPORTED);
        }
      }
    } catch (err) {
      setReportNotice(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
    } finally {
      setReportAction(null);
    }
  }

  /** Download/print/share handlers for a single dashboard card's focused PDF. */
  function buildCardActions(section: CardSection): CardActions {
    return {
      onDownload: async () => {
        setReportNotice(null);
        try {
          const { downloadCardSectionPdf } = await import("@/lib/reportPdf");
          downloadCardSectionPdf(section, STORE_NAME, report.generatedAt);
        } catch (err) {
          setReportNotice(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
        }
      },
      onPrint: async () => {
        // Same synchronous-open requirement as runReportAction above.
        const targetWindow = window.open("", "_blank");
        setReportNotice(null);
        try {
          const { printCardSectionPdf } = await import("@/lib/reportPdf");
          printCardSectionPdf(section, STORE_NAME, report.generatedAt, targetWindow);
        } catch (err) {
          setReportNotice(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
        }
      },
      onShare: async () => {
        setReportNotice(null);
        try {
          const { shareCardSectionPdf } = await import("@/lib/reportPdf");
          const result = await shareCardSectionPdf(section, STORE_NAME, report.generatedAt);
          if (result === "downloaded") {
            setReportNotice(TEXT_SHARE_NOT_SUPPORTED);
          }
        } catch (err) {
          setReportNotice(err instanceof Error ? err.message : ERROR_COULD_NOT_GENERATE_REPORT);
        }
      },
    };
  }

  return { report, categoryTotals, recentSales, reportAction, reportNotice, runReportAction, buildCardActions };
}
