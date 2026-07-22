import { describe, expect, it } from "vitest";
import {
  buildSellYearlyRows,
  futureHomeValue,
  netProceedsAtSale,
} from "./whenToSellMath";

describe("whenToSellMath", () => {
  it("futureHomeValue applies compound appreciation", () => {
    expect(futureHomeValue(100_000, 5, 10)).toBeCloseTo(162_889.46, 0);
  });

  it("netProceedsAtSale subtracts balance and selling costs", () => {
    expect(netProceedsAtSale(500_000, 200_000, 6)).toBeCloseTo(270_000, 0);
    expect(netProceedsAtSale(180_000, 200_000, 6)).toBe(0);
  });

  it("buildSellYearlyRows produces 30 projection years", () => {
    const rows = buildSellYearlyRows(240_000, 6.5, 300_000, 3, 6, 30, 30);
    expect(rows).toHaveLength(30);
    expect(rows[0]?.year).toBe(1);
    expect(rows[0]?.futureHomeValue).toBeCloseTo(futureHomeValue(300_000, 3, 1), 0);
    expect(rows[29]?.balanceUserTerm).toBeCloseTo(0, 0);
  });
});
