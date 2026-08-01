import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useStoreData } from "@/lib";
import { makeCreditPayment, makeCustomer, makeStoreDataValue } from "../../test/testUtils";
import { Customers } from "./Customers";

vi.mock("@/lib/storeData", () => ({ useStoreData: vi.fn() }));

const customers = [
  makeCustomer({ id: "c1", name: "Mang Jose", balance: 300 }),
  makeCustomer({ id: "c2", name: "Aling Rosa", phone: null, balance: 0 }),
];

async function submitAddForm(user: ReturnType<typeof userEvent.setup>) {
  const buttons = screen.getAllByRole("button", { name: "Add customer" });
  await user.click(buttons[buttons.length - 1]);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Customers />
    </MemoryRouter>
  );
}

describe("Customers", () => {
  it("shows total outstanding balance and customer count", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers }));
    renderPage();
    expect(screen.getByText("Total outstanding")).toBeInTheDocument();
    const totals = screen.getAllByText("₱300.00");
    expect(totals.length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("filters the customer list by search query", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers }));
    renderPage();

    await user.type(screen.getByPlaceholderText("Search by name or phone"), "Jose");
    expect(screen.getByText("Mang Jose")).toBeInTheDocument();
    expect(screen.queryByText("Aling Rosa")).not.toBeInTheDocument();
  });

  it("shows an empty state when no customers match", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers }));
    renderPage();
    await user.type(screen.getByPlaceholderText("Search by name or phone"), "nobody");
    expect(screen.getByText('No customers match "nobody".')).toBeInTheDocument();
  });

  it("shows a top-level empty state with no customers at all", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers: [] }));
    renderPage();
    expect(screen.getByText("No customers yet.")).toBeInTheDocument();
  });

  it("adds a new customer via the add form", async () => {
    const user = userEvent.setup();
    const addCustomer = vi.fn().mockResolvedValue(makeCustomer({ id: "c3", name: "Bimbo" }));
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, addCustomer, fetchCreditPayments })
    );
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await user.type(screen.getByLabelText("Name"), "Bimbo");
    await user.type(screen.getByLabelText("Credit limit (₱, optional)"), "200");
    await submitAddForm(user);

    expect(addCustomer).toHaveBeenCalledWith("Bimbo", null, 200);
  });

  it("shows a validation error when the add form name is blank", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers: [] }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await submitAddForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("shows a validation error for a negative credit limit", async () => {
    const user = userEvent.setup();
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers: [] }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await user.type(screen.getByLabelText("Name"), "Bimbo");
    await user.type(screen.getByLabelText("Credit limit (₱, optional)"), "-5");
    await submitAddForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("valid number");
  });

  it("shows an error when adding a customer fails", async () => {
    const user = userEvent.setup();
    const addCustomer = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers: [], addCustomer }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await user.type(screen.getByLabelText("Name"), "Bimbo");
    await submitAddForm(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
  });

  it("selects a customer and shows their balance and payment history", async () => {
    const user = userEvent.setup();
    const fetchCreditPayments = vi.fn().mockResolvedValue([makeCreditPayment()]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, fetchCreditPayments })
    );
    renderPage();

    await user.click(screen.getByText("Mang Jose"));
    expect(await screen.findByText("Current balance")).toBeInTheDocument();
    expect(fetchCreditPayments).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("₱50.00")).toBeInTheDocument();
    expect(screen.getByText(/recorded by Aling Nena/)).toBeInTheDocument();
  });

  it("shows an empty payment history state", async () => {
    const user = userEvent.setup();
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, fetchCreditPayments })
    );
    renderPage();
    await user.click(screen.getByText("Mang Jose"));
    expect(await screen.findByText("No payments recorded yet.")).toBeInTheDocument();
  });

  it("records a payment for the selected customer", async () => {
    const user = userEvent.setup();
    const recordCreditPayment = vi.fn().mockResolvedValue(undefined);
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, recordCreditPayment, fetchCreditPayments })
    );
    renderPage();

    await user.click(screen.getByText("Mang Jose"));
    await screen.findByText("Current balance");

    const amountInput = screen.getByLabelText("Record a payment");
    await user.clear(amountInput);
    await user.type(amountInput, "100");
    await user.type(screen.getByPlaceholderText("Note (optional)"), "Partial payment");
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(recordCreditPayment).toHaveBeenCalledWith("c1", 100, "Partial payment");
  });

  it("shows a validation error for a zero payment amount", async () => {
    const user = userEvent.setup();
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, fetchCreditPayments })
    );
    renderPage();

    await user.click(screen.getByText("Mang Jose"));
    await screen.findByText("Current balance");
    const amountInput = screen.getByLabelText("Record a payment");
    await user.clear(amountInput);
    await user.type(amountInput, "0");
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("greater than zero");
  });

  it("shows an error when recording a payment fails", async () => {
    const user = userEvent.setup();
    const recordCreditPayment = vi.fn().mockRejectedValue(new Error("Payment failed"));
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, recordCreditPayment, fetchCreditPayments })
    );
    renderPage();

    await user.click(screen.getByText("Mang Jose"));
    await screen.findByText("Current balance");
    const amountInput = screen.getByLabelText("Record a payment");
    await user.clear(amountInput);
    await user.type(amountInput, "50");
    await user.click(screen.getByRole("button", { name: "Record payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Payment failed");
  });

  it("shows a placeholder when nothing is selected", () => {
    vi.mocked(useStoreData).mockReturnValue(makeStoreDataValue({ customers }));
    renderPage();
    expect(screen.getByText("Select a customer to view their balance and record a payment.")).toBeInTheDocument();
  });

  it("shows the credit limit when set", async () => {
    const user = userEvent.setup();
    const fetchCreditPayments = vi.fn().mockResolvedValue([]);
    vi.mocked(useStoreData).mockReturnValue(
      makeStoreDataValue({ customers, fetchCreditPayments })
    );
    renderPage();
    await user.click(screen.getByText("Mang Jose"));
    expect(await screen.findByText(/Credit limit: ₱500\.00/)).toBeInTheDocument();
  });
});
