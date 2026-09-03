import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SettingsSidebar } from "../SettingsSidebar";
import { version } from "../../../../../../package.json";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <SettingsSidebar />
    </MemoryRouter>
  );
}

describe("SettingsSidebar version identification", () => {
  // BIR accreditation expects the running software to be identifiable. A
  // version that exists only in package.json cannot be read off the device by
  // whoever is holding it, which is the whole point of showing it.
  it("shows the version the package declares", () => {
    renderSidebar();
    expect(screen.getByText(`v${version}`)).toBeInTheDocument();
  });

  it("is not a hardcoded string — it tracks package.json", () => {
    // Injected by vite.config.ts (and mirrored into vitest.config.ts) from
    // package.json at build time, so the number on screen and the number the
    // repository declares cannot drift apart. A hardcoded version would
    // eventually lie, which is worse than not showing one.
    renderSidebar();
    expect(version).not.toBe("0.0.0");
    expect(screen.getByText(`v${version}`).textContent).toBe(`v${version}`);
  });

  it("names the application alongside it", () => {
    // "v0.9.0" on its own identifies nothing.
    renderSidebar();
    const line = screen.getByText(`v${version}`).parentElement;
    expect(line?.textContent).toContain("Tindahan POS");
  });
});
