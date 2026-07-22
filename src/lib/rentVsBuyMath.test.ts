import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { computeRentVsBuy, readRentVsBuyAssumptions } from "./rentVsBuyMath";

describe("rentVsBuyMath", () => {
  it("readRentVsBuyAssumptions reads persisted assumptions only", () => {
    expect(readRentVsBuyAssumptions(fixtureV2Full)).toBeNull();
    const withAssumptions = {
      ...fixtureV2Full,
      rentVsBuy: { comparableRentMonthly: 2800, investmentReturnPercent: 6, horizonYears: 10 },
    };
    expect(readRentVsBuyAssumptions(withAssumptions)).toEqual({
      comparableRentMonthly: 2800,
      investmentReturnPercent: 6,
      horizonYears: 10,
    });
  });

  it("computeRentVsBuy returns buy and rent wealth paths without persisting results", () => {
    const result = computeRentVsBuy(fixtureV2Full, {
      comparableRentMonthly: 3000,
      investmentReturnPercent: 5,
      horizonYears: 7,
    });
    expect(result.horizonYears).toBe(7);
    expect(result.initialCashInvested).toBeGreaterThan(0);
    expect(Number.isFinite(result.buyNetWealth)).toBe(true);
    expect(Number.isFinite(result.rentNetWealth)).toBe(true);
    expect(result.advantageBuy).toBe(result.buyNetWealth - result.rentNetWealth);
  });

  it("returns zero-ish paths for empty scenario", () => {
    const result = computeRentVsBuy(emptyAppState(), { horizonYears: 5 });
    expect(result.buyNetWealth).toBe(0);
    expect(result.rentNetWealth).toBe(0);
  });
});
