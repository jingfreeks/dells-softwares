import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScannerLoadingOverlay } from "./ScannerLoadingOverlay";

describe("ScannerLoadingOverlay", () => {
  it("renders a loading message", () => {
    render(<ScannerLoadingOverlay />);
    expect(screen.getByText("Loading camera…")).toBeInTheDocument();
  });
});
