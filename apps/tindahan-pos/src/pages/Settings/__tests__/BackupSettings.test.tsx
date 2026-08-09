import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth, useStoreData, useOfflineQueue } from "@/lib";
import { makeAuthValue, makeStaffAccount, makeProduct, makeSaleRecord, makeCustomer, makeStoreDataValue } from "../../../test/testUtils";
import { BackupSettings } from "../BackupSettings";
import { ComingSoonSettingsPage } from "../ComingSoonSettingsPage";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));
vi.mock("@/lib/offlineQueue", async () => {
  const actual = await vi.importActual<typeof import("@/lib/offlineQueue")>("@/lib/offlineQueue");
  return { ...actual, useOfflineQueue: vi.fn() };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/settings/backup"]}>
      <Routes>
        <Route path="/settings/backup" element={<BackupSettings />} />
        <Route
          path="/settings/profile"
          element={<ComingSoonSettingsPage heading="Your profile" subheading="How you appear across the app" />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("BackupSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(useAuth).mockReturnValue(makeAuthValue({ user: makeStaffAccount({ storeId: "store-9" }) }));
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({
        products: [makeProduct(), makeProduct({ id: "p2" })],
        sales: [makeSaleRecord()],
        customers: [makeCustomer()],
      })
    );
    vi.mocked(useOfflineQueue).mockReturnValue({
      pendingCount: 0,
      items: [],
      lastSyncedAt: null,
      retryNow: vi.fn(),
      needsReauth: false,
    });
  });

  it("shows real counts from store data", () => {
    renderPage();
    expect(screen.getByText(/2 products/)).toBeInTheDocument();
    expect(screen.getByText(/1 sales/)).toBeInTheDocument();
    expect(screen.getByText(/1 customers/)).toBeInTheDocument();
  });

  it("calls refresh() when Refresh now is clicked", async () => {
    const user = userEvent.setup();
    const refresh = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ products: [makeProduct()], sales: [], customers: [], refresh })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Refresh now" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("triggers a CSV download when 'Sales as CSV' is clicked", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") el.click = clickSpy;
      return el;
    });
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });

    renderPage();
    await user.click(screen.getByRole("button", { name: /Sales as CSV/ }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows the automatic-backup toggles and cycles the frequency", async () => {
    const user = userEvent.setup();
    renderPage();

    const cloudToggle = screen.getByRole("switch", { name: "Back up to the cloud" });
    expect(cloudToggle).toHaveAttribute("aria-checked", "true");

    const frequencyButton = screen.getByRole("button", { name: "Every hour" });
    await user.click(frequencyButton);
    expect(screen.getByRole("button", { name: "Every 6 hours" })).toBeInTheDocument();
  });

  it("persists automatic-backup settings on save", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("switch", { name: "Only on wi-fi" }));
    expect(await screen.findByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Backup settings updated.");
    const raw = window.localStorage.getItem("tindahan-pos:backup:store-9");
    expect(JSON.parse(raw as string)).toMatchObject({ wifiOnly: true });
  });

  it("shows the offline queue as empty when nothing is pending, and the restore button as inert", () => {
    renderPage();
    expect(screen.getByText("0 sales")).toBeInTheDocument();
    expect(screen.getByText("Restore")).toHaveAttribute("aria-disabled", "true");
  });

  it("shows real pending-sale counts and a retry action when sales are queued offline", async () => {
    const user = userEvent.setup();
    const retryNow = vi.fn();
    vi.mocked(useOfflineQueue).mockReturnValue({
      pendingCount: 2,
      items: [
        {
          id: "q1",
          payload: {
            items: [],
            services: [],
            customerId: null,
            paymentType: "cash",
            referenceNo: null,
            overridePin: null,
            cashierToken: null,
          },
          occurredAt: "2026-08-09T10:00:00Z",
          cashierName: "Aling Nena",
          total: 54,
          status: "pending",
          attempts: 0,
          lastError: null,
          createdAt: "2026-08-09T10:00:00Z",
          updatedAt: "2026-08-09T10:00:00Z",
        },
      ],
      lastSyncedAt: null,
      retryNow,
      needsReauth: false,
    });
    renderPage();

    expect(screen.getByText("Some sales are waiting to sync")).toBeInTheDocument();
    expect(screen.getAllByText(/2 sales/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Aling Nena/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry now" }));
    expect(retryNow).toHaveBeenCalled();
  });

  describe("settings sidebar", () => {
    it("navigates to the other settings sub-pages", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("link", { name: /Your profile/ }));
      expect(await screen.findByText("Coming soon")).toBeInTheDocument();
    });
  });
});
