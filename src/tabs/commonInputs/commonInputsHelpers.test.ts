import { describe, expect, it } from "vitest";
import {
  COMMON_INPUT_FIELD_KEYS,
  patchClosingCosts,
  patchMiscInitialCash,
  summarizeCommonCashInvested,
} from "./commonInputsHelpers";

describe("commonInputsHelpers", () => {
  it("lists the canonical shared field keys edited on Common Inputs", () => {
    expect(COMMON_INPUT_FIELD_KEYS).toEqual([
      "homePrice",
      "downPayment",
      "downPaymentPercent",
      "interestRateApr",
      "termYears",
      "propertyTaxAnnual",
      "propertyTaxPercent",
      "insuranceAnnual",
      "hoaMonthly",
      "pmiMonthly",
      "extraPrincipalMonthly",
      "closingCosts",
      "miscInitialCash",
    ]);
  });

  it("summarizes cash invested with derived loan and net cash", () => {
    const summary = summarizeCommonCashInvested(
      { downPayment: 80_000.4, closingCosts: 9_500.6, miscInitialCash: 2_500.2 },
      { loanAmount: 320_000.7, netCashToClose: 91_250.4 }
    );
    expect(summary).toEqual({
      downPayment: 80_000,
      closingCosts: 9_501,
      miscInitialCash: 2_500,
      closingPlusMisc: 12_001,
      grossCashIn: 92_001,
      loanAmount: 320_001,
      netCashToClose: 91_250,
    });
  });

  it("clamps negative closing and misc patches to zero", () => {
    expect(patchClosingCosts(-12)).toEqual({ closingCosts: 0 });
    expect(patchMiscInitialCash(-3)).toEqual({ miscInitialCash: 0 });
    expect(patchClosingCosts(4500)).toEqual({ closingCosts: 4500 });
    expect(patchMiscInitialCash(250)).toEqual({ miscInitialCash: 250 });
  });

  it("treats missing numeric inputs as zero in the cash summary", () => {
    const summary = summarizeCommonCashInvested(
      { downPayment: Number.NaN, closingCosts: Number.NaN, miscInitialCash: Number.NaN },
      { loanAmount: Number.NaN, netCashToClose: Number.NaN }
    );
    expect(summary.grossCashIn).toBe(0);
    expect(summary.loanAmount).toBe(0);
    expect(summary.netCashToClose).toBe(0);
  });
});
