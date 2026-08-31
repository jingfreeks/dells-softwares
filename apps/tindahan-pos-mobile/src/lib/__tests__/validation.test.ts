import { isValidEmail, isValidPassword, MIN_PASSWORD_LENGTH } from "../validation";

describe("isValidEmail", () => {
  it("accepts a well-formed email", () => {
    expect(isValidEmail("owner@store.com")).toBe(true);
    expect(isValidEmail("  owner@store.com  ")).toBe(true);
  });

  it("rejects missing @ or domain", () => {
    expect(isValidEmail("owner")).toBe(false);
    expect(isValidEmail("owner@")).toBe(false);
    expect(isValidEmail("owner@store")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("isValidPassword", () => {
  it(`requires at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(isValidPassword("short1")).toBe(false);
    expect(isValidPassword("a".repeat(MIN_PASSWORD_LENGTH))).toBe(true);
  });
});
