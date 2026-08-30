import { describe, expect, it, beforeEach } from "vitest";
import { recordActiveTrial, shouldShowTrialExpired, markTrialExpiredShown } from "../trialExpiredTracking";

describe("trialExpiredTracking", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("has nothing to show before a trial has ever been recorded", () => {
    expect(shouldShowTrialExpired("store-1")).toBe(false);
  });

  it("shows once after a trial deadline was recorded and the store checks again", () => {
    recordActiveTrial("store-1", "2026-09-01T00:00:00Z");
    expect(shouldShowTrialExpired("store-1")).toBe(true);
  });

  it("stops showing once marked shown", () => {
    recordActiveTrial("store-1", "2026-09-01T00:00:00Z");
    markTrialExpiredShown("store-1");
    expect(shouldShowTrialExpired("store-1")).toBe(false);
  });

  it("keys tracking per store", () => {
    recordActiveTrial("store-1", "2026-09-01T00:00:00Z");
    expect(shouldShowTrialExpired("store-2")).toBe(false);
  });

  it("re-recording the same still-active deadline does not reset an already-shown flag", () => {
    recordActiveTrial("store-1", "2026-09-01T00:00:00Z");
    markTrialExpiredShown("store-1");
    recordActiveTrial("store-1", "2026-09-01T00:00:00Z");
    expect(shouldShowTrialExpired("store-1")).toBe(false);
  });
});
