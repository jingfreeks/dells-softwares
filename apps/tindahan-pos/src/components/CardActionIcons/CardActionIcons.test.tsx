import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardActionIcons } from "./CardActionIcons";

describe("CardActionIcons", () => {
  it("renders nothing when no actions are given", () => {
    const { container } = render(<CardActionIcons title="Sales" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders and fires each provided action", async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    const onPrint = vi.fn();
    const onShare = vi.fn();
    render(<CardActionIcons title="Sales" onDownload={onDownload} onPrint={onPrint} onShare={onShare} />);

    await user.click(screen.getByRole("button", { name: "Download Sales as PDF" }));
    await user.click(screen.getByRole("button", { name: "Print Sales" }));
    await user.click(screen.getByRole("button", { name: "Share Sales" }));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("renders only the download button when only onDownload is given", () => {
    render(<CardActionIcons title="Sales" onDownload={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Download Sales as PDF" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print Sales" })).not.toBeInTheDocument();
  });
});
