import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionCardHeader } from "./SectionCardHeader";

describe("SectionCardHeader", () => {
  it("renders the title and passes actions through", () => {
    render(<SectionCardHeader title="Recent sales" onDownload={vi.fn()} />);
    expect(screen.getByText("Recent sales")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Recent sales as PDF" })).toBeInTheDocument();
  });

  it("renders with no action icons when none are given", () => {
    render(<SectionCardHeader title="Recent sales" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
