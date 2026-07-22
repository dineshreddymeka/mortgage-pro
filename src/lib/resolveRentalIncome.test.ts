import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { computeStrIncome } from "./dealStrategies";
import {
  canonicalFromMultifamily,
  canonicalFromStr,
  defaultMultifamilyUnit,
  newMultifamilyUnitId,
  patchRentalIncome,
  resolveRentalIncome,
  syncRentalIncomePatch,
  withResolvedRentalIncome,
} from "./resolveRentalIncome";

describe("resolveRentalIncome", () => {
  it("returns simple canonical fields by default", () => {
    const r = resolveRentalIncome(fixtureV2Full);
    expect(r.mode).toBe("simple");
    expect(r.monthlyRent).toBe(fixtureV2Full.monthlyRent);
    expect(r.otherMonthlyIncome).toBe(fixtureV2Full.otherMonthlyIncome);
    expect(r.vacancyRatePercent).toBe(fixtureV2Full.vacancyRatePercent);
  });

  it("aggregates multifamily units into canonical rent fields", () => {
    const state = {
      ...fixtureV2Full,
      rentalIncome: {
        mode: "multifamily" as const,
        multifamily: {
          units: [
            { id: "u1", monthlyRent: 1200, vacancyRatePercent: 5 },
            { id: "u2", monthlyRent: 1400, otherMonthlyIncome: 50, vacancyRatePercent: 8 },
          ],
          defaultVacancyRatePercent: 6,
        },
      },
    };
    const r = resolveRentalIncome(state);
    expect(r.mode).toBe("multifamily");
    expect(r.monthlyRent).toBe(2600);
    expect(r.otherMonthlyIncome).toBe(50);
    expect(r.multifamilySnapshot?.unitCount).toBe(2);
    expect(r.multifamilySnapshot?.effectiveGrossIncomeMonthly).toBeGreaterThan(0);
  });

  it("syncs STR income into canonical fields for rental pipeline", () => {
    const str = {
      nightlyRate: 200,
      nightsBookedPerMonth: 18,
      cleaningFeePerStay: 120,
      staysPerMonth: 6,
      platformFeePercent: 3,
      otherMonthlyIncome: 100,
      vacancyRatePercent: 5,
    };
    const canonical = canonicalFromStr(str);
    const strDirect = computeStrIncome(str);
    const resolved = resolveRentalIncome({
      ...fixtureV2Full,
      rentalIncome: { mode: "str", str },
    });
    expect(resolved.mode).toBe("str");
    expect(resolved.monthlyRent).toBe(canonical.monthlyRent);
    expect(resolved.strSnapshot?.effectiveGrossIncomeMonthly).toBe(strDirect.effectiveGrossIncomeMonthly);

    const effective = withResolvedRentalIncome({
      ...fixtureV2Full,
      rentalIncome: { mode: "str", str },
    });
    const gsi = effective.monthlyRent + effective.otherMonthlyIncome;
    const egi = gsi * (1 - effective.vacancyRatePercent / 100);
    expect(egi).toBeCloseTo(strDirect.effectiveGrossIncomeMonthly, 0);
  });

  it("patchRentalIncome keeps canonical rent in sync", () => {
    const patch = patchRentalIncome(fixtureV2Full, () => ({
      mode: "multifamily",
      multifamily: {
        units: [defaultMultifamilyUnit([], { monthlyRent: 1500, id: "a" })],
      },
    }));
    expect(patch.monthlyRent).toBe(1500);
    expect(patch.rentalIncome?.mode).toBe("multifamily");
  });

  it("generates stable unique multifamily unit ids", () => {
    const units = [{ id: "unit-1", monthlyRent: 1000 }, { id: "unit-2", monthlyRent: 1100 }];
    expect(newMultifamilyUnitId(units)).toBe("unit-3");
  });

  it("canonicalFromMultifamily matches aggregate vacancy math", () => {
    const canonical = canonicalFromMultifamily({
      units: [{ id: "u1", monthlyRent: 1000, vacancyRatePercent: 10 }],
    });
    expect(canonical.monthlyRent).toBe(1000);
    expect(canonical.vacancyRatePercent).toBeCloseTo(10, 1);
  });

  it("clears rentalIncome block when syncing simple mode", () => {
    expect(syncRentalIncomePatch(fixtureV2Full, { mode: "simple" })).toEqual({
      rentalIncome: { mode: "simple" },
    });
  });
});
