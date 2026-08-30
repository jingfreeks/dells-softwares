import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { DemoForm } from "../DemoForm";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const mockedInvoke = vi.mocked(supabase.functions.invoke);

function renderDemoForm() {
  return render(
    <MemoryRouter>
      <DemoForm />
    </MemoryRouter>
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "Juan Dela Cruz");
  await user.type(screen.getByLabelText("Business name"), "Dells Software");
  await user.type(screen.getByLabelText("Mobile number"), "0917 555 0142");
  await user.click(screen.getByRole("checkbox"));
}

describe("DemoForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks submission and shows field errors when required fields are missing", async () => {
    const user = userEvent.setup();
    renderDemoForm();

    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(screen.getByText("Your name is required")).toBeInTheDocument();
    expect(screen.getByText("Business name is required")).toBeInTheDocument();
    expect(screen.getByText("Mobile number is required")).toBeInTheDocument();
    expect(screen.getByText("Please agree before sending your request")).toBeInTheDocument();
    expect(mockedInvoke).not.toHaveBeenCalled();
  });

  it("submits successfully and shows the confirmation state", async () => {
    const user = userEvent.setup();
    mockedInvoke.mockResolvedValue({ data: { ok: true }, error: null } as never);
    renderDemoForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(await screen.findByText(/Salamat/)).toBeInTheDocument();
    expect(mockedInvoke).toHaveBeenCalledWith(
      "submit-demo-request",
      expect.objectContaining({ body: expect.objectContaining({ name: "Juan Dela Cruz", mobile: "0917 555 0142" }) })
    );
  });

  it("shows a server error and lets the visitor try again without losing the confirmation state", async () => {
    const user = userEvent.setup();
    mockedInvoke.mockResolvedValue({ data: { error: "Could not send your request. Try again." }, error: null } as never);
    renderDemoForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not send your request. Try again.");
    expect(screen.queryByText(/Salamat/)).not.toBeInTheDocument();
  });

  it("fills in the optional fields (email, business type, locations, message) and sends them", async () => {
    const user = userEvent.setup();
    mockedInvoke.mockResolvedValue({ data: { ok: true }, error: null } as never);
    renderDemoForm();

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/Email/), "aling.nena@example.com");
    await user.selectOptions(screen.getByLabelText("Type of business"), "Bakery");
    await user.selectOptions(screen.getByLabelText("Locations"), "2 to 5");
    await user.type(screen.getByLabelText(/Anything we should know/), "We also sell load.");
    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(await screen.findByText(/Salamat/)).toBeInTheDocument();
    expect(mockedInvoke).toHaveBeenCalledWith(
      "submit-demo-request",
      expect.objectContaining({
        body: expect.objectContaining({
          email: "aling.nena@example.com",
          businessType: "Bakery",
          locations: "2 to 5",
          message: "We also sell load.",
        }),
      })
    );
  });

  it("ignores a second submit while the first is still in flight", async () => {
    const user = userEvent.setup();
    let resolveInvoke: (value: unknown) => void = () => {};
    mockedInvoke.mockReturnValue(new Promise((resolve) => (resolveInvoke = resolve)) as never);
    renderDemoForm();

    await fillRequiredFields(user);
    const button = screen.getByRole("button", { name: "Request a demo" });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Sending..." }));

    resolveInvoke({ data: { ok: true }, error: null });
    await screen.findByText(/Salamat/);
    expect(mockedInvoke).toHaveBeenCalledTimes(1);
  });

  it("shows a generic message when the invoke call rejects with something other than an Error", async () => {
    const user = userEvent.setup();
    mockedInvoke.mockRejectedValue("network is down");
    renderDemoForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong sending your request. Please try again."
    );
  });

  it("disables the submit button while a request is in flight", async () => {
    const user = userEvent.setup();
    let resolveInvoke: (value: unknown) => void = () => {};
    mockedInvoke.mockReturnValue(new Promise((resolve) => (resolveInvoke = resolve)) as never);
    renderDemoForm();

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a demo" }));

    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    resolveInvoke({ data: { ok: true }, error: null });
    expect(await screen.findByText(/Salamat/)).toBeInTheDocument();
  });
});
