import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportDetailModal } from "../ReportDetailModal";

describe("ReportDetailModal", () => {
  it("renders title, subtitle, summary tiles, and children", () => {
    render(
      <ReportDetailModal
        title="Today's Sales"
        subtitle="Sunday, 10 August 2026"
        summaryTiles={[{ label: "Total sales", value: "₱265.00" }]}
        onClose={vi.fn()}
        onPrint={vi.fn()}
      >
        <p>Report body</p>
      </ReportDetailModal>
    );
    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText("Sunday, 10 August 2026")).toBeInTheDocument();
    expect(screen.getByText("Total sales")).toBeInTheDocument();
    expect(screen.getByText("₱265.00")).toBeInTheDocument();
    expect(screen.getByText("Report body")).toBeInTheDocument();
  });

  it("calls onPrint when either Print button is clicked", async () => {
    const user = userEvent.setup();
    const onPrint = vi.fn();
    render(
      <ReportDetailModal title="Report" subtitle="Today" onClose={vi.fn()} onPrint={onPrint}>
        <p>Body</p>
      </ReportDetailModal>
    );
    const printButtons = screen.getAllByRole("button", { name: "Print" });
    expect(printButtons).toHaveLength(2);
    await user.click(printButtons[0]);
    expect(onPrint).toHaveBeenCalledTimes(1);
    await user.click(printButtons[1]);
    expect(onPrint).toHaveBeenCalledTimes(2);
  });

  it("calls onClose when the X or the footer Close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ReportDetailModal title="Report" subtitle="Today" onClose={onClose} onPrint={vi.fn()}>
        <p>Body</p>
      </ReportDetailModal>
    );
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons).toHaveLength(2); // the X icon button and the footer Close button
    await user.click(closeButtons[0]);
    await user.click(closeButtons[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when clicking inside the panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ReportDetailModal title="Report" subtitle="Today" onClose={onClose} onPrint={vi.fn()}>
        <p>Body content</p>
      </ReportDetailModal>
    );
    await user.click(screen.getByText("Body content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders without a summary tiles section when none are given", () => {
    render(
      <ReportDetailModal title="Report" subtitle="Today" onClose={vi.fn()} onPrint={vi.fn()}>
        <p>Body</p>
      </ReportDetailModal>
    );
    expect(screen.queryByText("Total sales")).not.toBeInTheDocument();
  });
});
