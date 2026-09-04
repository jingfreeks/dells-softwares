import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/lib";
import { Pair } from "../Pair";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    auth: { signInWithPassword: vi.fn() },
  },
}));

const mockedSupabase = supabase as unknown as {
  functions: { invoke: ReturnType<typeof vi.fn> };
  auth: { signInWithPassword: ReturnType<typeof vi.fn> };
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/pair"]}>
      <Routes>
        <Route path="/pair" element={<Pair />} />
        <Route path="/pos" element={<p>Pos page</p>} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("6-character pairing code"), "ab12cd");
  await user.type(screen.getByLabelText("Device name"), "Counter tablet");
  await user.click(screen.getByRole("button", { name: "Pair with this store" }));
}

describe("Pair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pairs successfully, signs in with the transient credentials, and navigates to /pos", async () => {
    const user = userEvent.setup();
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: { email: "device+abc@internal.invalid", password: "secret", storeName: "Dell's Store" },
      error: null,
    });
    mockedSupabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    renderPage();

    await fillAndSubmit(user);

    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("pair-device", {
      body: { code: "AB12CD", deviceName: "Counter tablet" },
    });
    expect(await screen.findByText("Pos page")).toBeInTheDocument();
    expect(mockedSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "device+abc@internal.invalid",
      password: "secret",
    });
  });

  it("shows a friendly error for an invalid or expired code", async () => {
    const user = userEvent.setup();
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: { error: "INVALID_OR_EXPIRED_CODE" },
      error: null,
    });
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("That code is invalid or has expired.");
    expect(mockedSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows what the failure said when the edge function call fails", async () => {
    const user = userEvent.setup();
    mockedSupabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });
    renderPage();

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("network down");
  });

  it("links back to sign in", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Back to sign in"));
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });
});
