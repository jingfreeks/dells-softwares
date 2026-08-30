import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Privacy } from "../Privacy";

function renderPrivacy() {
  return render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>
  );
}

describe("Privacy", () => {
  it("renders the notice with a working back-to-home link", () => {
    renderPrivacy();
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Notice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute("href", "/");
  });

  it("covers what's collected, how it's used, and the account-deletion choice", () => {
    renderPrivacy();
    expect(screen.getByText("What we collect")).toBeInTheDocument();
    expect(screen.getByText("How we use it")).toBeInTheDocument();
    expect(screen.getByText(/Delete your account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "dobluis.lyndell@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:dobluis.lyndell@gmail.com"
    );
  });

  it("lists data-subject rights under the Data Privacy Act of 2012", () => {
    renderPrivacy();
    expect(screen.getByText("Your rights under Philippine law")).toBeInTheDocument();
    expect(screen.getByText(/Republic Act No\. 10173/)).toBeInTheDocument();
    expect(screen.getByText(/National Privacy Commission/)).toBeInTheDocument();
  });
});
