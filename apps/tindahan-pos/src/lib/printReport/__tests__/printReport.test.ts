import { describe, expect, it, vi } from "vitest";
import { printReport } from "../printReport";

function spyOnWindowOpen() {
  const fakeDoc = document.implementation.createHTMLDocument("");
  const win = { document: fakeDoc, focus: vi.fn(), print: vi.fn() } as unknown as Window;
  const openSpy = vi.spyOn(window, "open").mockReturnValue(win);
  return { openSpy, fakeDoc, win };
}

describe("printReport", () => {
  it("opens a blank window synchronously and calls focus/print", () => {
    const { openSpy, win } = spyOnWindowOpen();
    printReport({
      storeName: "Dell's Sari-Sari Store",
      title: "Today's Sales",
      subtitle: "Sunday, 10 August 2026",
      printedByName: "Lyndell",
      columns: [{ header: "REFERENCE" }],
      rows: [["TXN-0001"]],
    });
    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(win.focus).toHaveBeenCalled();
    expect(win.print).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("does nothing (no throw) when window.open is blocked", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    expect(() =>
      printReport({
        storeName: "Store",
        title: "Report",
        subtitle: "Today",
        printedByName: "Admin",
        columns: [{ header: "A" }],
        rows: [],
      })
    ).not.toThrow();
    openSpy.mockRestore();
  });

  it("renders the title, subtitle, summary tiles, and table rows as text", () => {
    const { openSpy, fakeDoc } = spyOnWindowOpen();
    printReport({
      storeName: "Dell's Sari-Sari Store",
      storeAddress: "14 Sampaguita St., Quezon City",
      title: "Today's Sales",
      subtitle: "Sunday, 10 August 2026",
      printedByName: "Lyndell Dobluis",
      summaryTiles: [{ label: "Total sales", value: "₱265.00" }],
      columns: [{ header: "REFERENCE" }, { header: "TOTAL", align: "right" }],
      rows: [["TXN-0241", "10.00"]],
    });
    expect(fakeDoc.title).toBe("Dell's Sari-Sari Store — Today's Sales");
    expect(fakeDoc.body.textContent).toContain("Today's Sales");
    expect(fakeDoc.body.textContent).toContain("Sunday, 10 August 2026");
    expect(fakeDoc.body.textContent).toContain("₱265.00");
    expect(fakeDoc.body.textContent).toContain("TXN-0241");
    expect(fakeDoc.querySelectorAll("tbody tr")).toHaveLength(1);
    openSpy.mockRestore();
  });

  it("shows the empty message when there are no rows", () => {
    const { openSpy, fakeDoc } = spyOnWindowOpen();
    printReport({
      storeName: "Store",
      title: "Low Stock",
      subtitle: "Today",
      printedByName: "Admin",
      columns: [{ header: "PRODUCT" }],
      rows: [],
      emptyMessage: "No low-stock products found.",
    });
    expect(fakeDoc.body.textContent).toContain("No low-stock products found.");
    openSpy.mockRestore();
  });

  it("escapes a malicious value in a row instead of injecting it — never uses innerHTML", () => {
    const { openSpy, fakeDoc } = spyOnWindowOpen();
    const malicious = '<img src=x onerror="window.__pwned=true">';
    printReport({
      storeName: malicious,
      title: "Recent Sales",
      subtitle: "Today",
      printedByName: malicious,
      columns: [{ header: "CUSTOMER" }],
      rows: [[malicious]],
    });
    expect(fakeDoc.querySelectorAll("img")).toHaveLength(0);
    expect(fakeDoc.body.textContent).toContain(malicious);
    openSpy.mockRestore();
  });
});
