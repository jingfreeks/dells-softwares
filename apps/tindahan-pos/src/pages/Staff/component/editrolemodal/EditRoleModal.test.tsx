import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeStore } from "../../../../test/testUtils";
import { EditRoleModal } from "./EditRoleModal";

describe("EditRoleModal", () => {
  it("saves the toggled value", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    const onClose = vi.fn();
    render(<EditRoleModal store={makeStore({ cashierCanEditPrices: false })} onSave={onSave} onClose={onClose} />);

    await user.click(screen.getByRole("switch", { name: "Cashiers can edit prices" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ cashierCanEditPrices: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("saves without toggling when the current value is already correct", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    render(<EditRoleModal store={makeStore({ cashierCanEditPrices: true })} onSave={onSave} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({ cashierCanEditPrices: true });
  });

  it("shows an error and does not close when saving fails", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: "Network error" });
    const onClose = vi.fn();
    render(<EditRoleModal store={makeStore()} onSave={onSave} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network error");
    expect(onClose).not.toHaveBeenCalled();
  });
});
