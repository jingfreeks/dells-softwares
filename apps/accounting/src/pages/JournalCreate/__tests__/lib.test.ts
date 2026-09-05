import { describe, expect, it } from "vitest";
import {
  isDateInOpenPeriod,
  isUsableLine,
  periodFor,
  postBlocker,
  toAmount,
  totals,
} from "../lib";
import type { AccountingPeriod, DraftLine } from "@/lib";

const line = (over: Partial<DraftLine> = {}): DraftLine => ({
  accountCode: "1010",
  description: "",
  debit: "",
  credit: "",
  ...over,
});

const period = (over: Partial<AccountingPeriod> = {}): AccountingPeriod => ({
  id: "p",
  code: "FY2026-09",
  startsOn: "2026-09-01",
  endsOn: "2026-09-30",
  status: "OPEN",
  ...over,
});

describe("toAmount", () => {
  it("treats an empty field as zero, because every row starts empty", () => {
    expect(toAmount("")).toBe(0);
    expect(toAmount("   ")).toBe(0);
  });

  it("treats nonsense as zero rather than poisoning the total with NaN", () => {
    // One NaN makes the whole sum NaN, which renders as ₱NaN and tells the
    // user nothing about what they typed wrong.
    expect(toAmount("abc")).toBe(0);
  });
});

describe("totals", () => {
  it("sums each side and signs the difference", () => {
    const t = totals([line({ debit: "500" }), line({ credit: "300" })]);
    expect(t).toMatchObject({ debit: 500, credit: 300, difference: 200, balanced: false });
  });

  it("is balanced when the two sides agree", () => {
    expect(totals([line({ debit: "500" }), line({ credit: "500" })]).balanced).toBe(true);
  });

  it("does not report a false imbalance from binary floating point", () => {
    // 0.1 + 0.2 is 0.30000000000000004. Without rounding, this form looks
    // balanced, says it is not, and gives no reason a person can act on.
    const t = totals([line({ debit: "0.1" }), line({ debit: "0.2" }), line({ credit: "0.3" })]);
    expect(t.difference).toBe(0);
    expect(t.balanced).toBe(true);
  });
});

describe("isUsableLine", () => {
  it("wants an account", () => {
    expect(isUsableLine(line({ accountCode: "", debit: "100" }))).toBe(false);
  });

  it("wants exactly one side filled", () => {
    expect(isUsableLine(line({ debit: "100" }))).toBe(true);
    expect(isUsableLine(line({ credit: "100" }))).toBe(true);
    expect(isUsableLine(line({ debit: "100", credit: "100" }))).toBe(false);
    expect(isUsableLine(line({}))).toBe(false);
  });
});

describe("isDateInOpenPeriod", () => {
  it("accepts a date inside an open period, inclusive at both ends", () => {
    expect(isDateInOpenPeriod("2026-09-01", [period()])).toBe(true);
    expect(isDateInOpenPeriod("2026-09-30", [period()])).toBe(true);
  });

  it("refuses a date in a closed period", () => {
    expect(isDateInOpenPeriod("2026-09-15", [period({ status: "CLOSED" })])).toBe(false);
  });

  it("refuses a date in no period at all, matching the database", () => {
    expect(isDateInOpenPeriod("2026-10-01", [period()])).toBe(false);
  });

  it("compares as strings, so a month end does not slide west of UTC", () => {
    // Parsing "2026-09-30" into a Date and comparing gives the previous day in
    // a negative-offset zone -- the month-end entry filed under the wrong
    // month. yyyy-mm-dd sorts lexicographically in calendar order.
    expect(isDateInOpenPeriod("2026-09-30", [period()])).toBe(true);
  });
});

describe("periodFor", () => {
  it("finds a closed period too, so the ribbon can say why posting is refused", () => {
    expect(periodFor("2026-09-15", [period({ status: "CLOSED" })])?.code).toBe("FY2026-09");
  });

  it("is null when nothing covers the date", () => {
    expect(periodFor("2027-01-01", [period()])).toBeNull();
  });
});

describe("postBlocker", () => {
  const good = [line({ debit: "500" }), line({ accountCode: "4010", credit: "500" })];

  it("passes a balanced, described entry in an open period", () => {
    expect(postBlocker(good, "Cash sale", "2026-09-15", [period()])).toBeNull();
  });

  it("reports one reason at a time, in the order someone fixes them", () => {
    expect(postBlocker(good, "  ", "2026-09-15", [period()])).toBe("no-description");
    expect(postBlocker([line({ debit: "500" })], "Sale", "2026-09-15", [period()])).toBe(
      "needs-two-lines"
    );
    expect(
      postBlocker([line({ debit: "500" }), line({ accountCode: "4010", credit: "300" })], "Sale",
        "2026-09-15", [period()])
    ).toBe("not-balanced");
    expect(postBlocker(good, "Sale", "2026-10-15", [period()])).toBe("period-not-open");
  });
});
