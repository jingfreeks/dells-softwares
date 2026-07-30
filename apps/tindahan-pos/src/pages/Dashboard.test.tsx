import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useStoreData } from "../lib/storeData";
import { makeProduct, makeSaleRecord, makeStoreDataValue } from "../test/testUtils";
import { Dashboard } from "./Dashboard";

vi.mock("../lib/storeData", () => ({ useStoreData: vi.fn() }));

const downloadDailyReportPdf = vi.fn();
const printDailyReportPdf = vi.fn();
const shareDailyReportPdf = vi.fn().mockResolvedValue("shared");
const downloadCardSectionPdf = vi.fn();
const printCardSectionPdf = vi.fn();
const shareCardSectionPdf = vi.fn().mockResolvedValue("shared");

vi.mock("../lib/reportPdf", () => ({
  downloadDailyReportPdf: (...args: unknown[]) => downloadDailyReportPdf(...args),
  printDailyReportPdf: (...args: unknown[]) => printDailyReportPdf(...args),
  shareDailyReportPdf: (...args: unknown[]) => shareDailyReportPdf(...args),
  downloadCardSectionPdf: (...args: unknown[]) => downloadCardSectionPdf(...args),
  printCardSectionPdf: (...args: unknown[]) => printCardSectionPdf(...args),
  shareCardSectionPdf: (...args: unknown[]) => shareCardSectionPdf(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  it("shows a loading skeleton while data loads", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ loading: true }));
    renderPage();
    expect(screen.queryByText("Today's sales")).not.toBeInTheDocument();
  });

  it("shows an error banner", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ error: "Failed to load" }));
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load");
  });

  it("renders stat cards from sales/products", () => {
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ stock: 0, lowStockThreshold: 5 })],
        sales: [makeSaleRecord()],
      })
    );
    renderPage();
    expect(screen.getByText("Today's sales")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("singularizes counts for exactly one transaction and one item, and shows a low (not out) stock product", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct({ stock: 2, lowStockThreshold: 5 })],
        sales: [makeSaleRecord({ timestamp: new Date().toISOString() })],
      })
    );
    renderPage();
    expect(screen.getByText(/1 item ·/)).toBeInTheDocument();
    expect(screen.getByText("2 left")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Download Today's sales as PDF" }));
    await vi.waitFor(() =>
      expect(downloadCardSectionPdf).toHaveBeenCalledWith(
        expect.objectContaining({ hint: "1 transaction" }),
        expect.anything(),
        expect.anything()
      )
    );
  });

  it("downloads the full daily report", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Download report as PDF" }));
    await vi.waitFor(() => expect(downloadDailyReportPdf).toHaveBeenCalled());
  });

  it("prints the full daily report, opening a window synchronously", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Print report" }));
    await vi.waitFor(() => expect(printDailyReportPdf).toHaveBeenCalled());
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    openSpy.mockRestore();
  });

  it("shares the full daily report and shows a fallback notice when downloaded instead", async () => {
    const user = userEvent.setup();
    shareDailyReportPdf.mockResolvedValueOnce("downloaded");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Share report" }));
    expect(await screen.findByRole("status")).toHaveTextContent("downloaded instead");
  });

  it("shows an error notice when report generation throws", async () => {
    const user = userEvent.setup();
    downloadDailyReportPdf.mockImplementationOnce(() => {
      throw new Error("PDF failed");
    });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Download report as PDF" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PDF failed");
  });

  it("downloads a single card section", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Download Today's sales as PDF" }));
    await vi.waitFor(() => expect(downloadCardSectionPdf).toHaveBeenCalled());
  });

  it("prints a single card section", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Print Today's sales" }));
    await vi.waitFor(() => expect(printCardSectionPdf).toHaveBeenCalled());
    openSpy.mockRestore();
  });

  it("shares a single card section", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Share Today's sales" }));
    await vi.waitFor(() => expect(shareCardSectionPdf).toHaveBeenCalled());
  });

  it("shows an error notice when a card action throws", async () => {
    const user = userEvent.setup();
    downloadCardSectionPdf.mockImplementationOnce(() => {
      throw new Error("Card PDF failed");
    });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Download Today's sales as PDF" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Card PDF failed");
  });

  it("falls back to a generic message when the full report action rejects a non-Error", async () => {
    const user = userEvent.setup();
    downloadDailyReportPdf.mockImplementationOnce(() => {
      throw "nope";
    });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Download report as PDF" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not generate the report.");
  });

  it("falls back to a generic message when a card print rejects a non-Error", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    printCardSectionPdf.mockImplementationOnce(() => {
      throw "nope";
    });
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Print Today's sales" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not generate the report.");
    openSpy.mockRestore();
  });

  it("falls back to a generic message when a card share rejects a non-Error", async () => {
    const user = userEvent.setup();
    shareCardSectionPdf.mockImplementationOnce(() => Promise.reject("nope"));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Share Today's sales" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not generate the report.");
  });

  it("shows a fallback notice when a card share downloads instead", async () => {
    const user = userEvent.setup();
    shareCardSectionPdf.mockResolvedValueOnce("downloaded");
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();

    await user.click(screen.getByRole("button", { name: "Share Today's sales" }));
    expect(await screen.findByRole("status")).toHaveTextContent("downloaded instead");
  });

  it("shows recent sales and empty-state messages", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ sales: [], products: [] }));
    renderPage();
    expect(screen.getByText("No sales recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("All products are adequately stocked.")).toBeInTheDocument();
  });

  it("links to quick actions", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue());
    renderPage();
    expect(screen.getByText("Start a sale").closest("a")).toHaveAttribute("href", "/pos");
    expect(screen.getByText("Manage inventory").closest("a")).toHaveAttribute("href", "/inventory");
    expect(screen.getByText("Manage staff").closest("a")).toHaveAttribute("href", "/staff");
  });
});
