import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import { emptyAppState } from "../storage/mortgageState";
import { deriveScenario } from "./deriveScenario";
import { deriveTaxMetrics, isTaxModelingEnabled } from "./deriveTaxMetrics";

describe("deriveTaxMetrics", () => {
  it("returns null when tax modeling is disabled", () => {
    const d = deriveScenario(fixtureV2Full);
    expect(isTaxModelingEnabled(fixtureV2Full)).toBe(false);
    expect(deriveTaxMetrics(fixtureV2Full, d.rental, d.realWealthSnapshots)).toBeNull();
    expect(d.tax).toBeNull();
  });

  it("derives depreciation, QBI, and after-tax cash flow when enabled", () => {
    const state = {
      ...fixtureV2Full,
      tax: {
        enabled: true as const,
        landPercent: 20,
        marginalIncomeTaxRatePercent: 24,
      },
    };
    const d = deriveScenario(state);
    expect(d.tax).not.toBeNull();
    expect(d.tax!.operating.depreciation.annualDepreciation).toBeGreaterThan(0);
    expect(d.tax!.operating.qbi?.qbiDeduction).toBeGreaterThan(0);
    expect(d.tax!.operating.afterTaxCashFlowAnnual).not.toBeNull();
    expect(d.tax!.operating.afterTaxCashFlowAnnual!).toBeLessThan(d.rental.cashFlowAnnual);
  });

  it("builds exit snapshots with sale tax and after-tax proceeds", () => {
    const state = {
      ...fixtureV2Full,
      tax: {
        enabled: true as const,
        capitalGainsRatePercent: 15,
        recaptureRatePercent: 25,
        marginalIncomeTaxRatePercent: 22,
      },
    };
    const d = deriveScenario(state);
    const y5 = d.tax!.exitSnapshots.find((s) => s.year === 5);
    expect(y5).toBeDefined();
    expect(y5!.estimatedSaleTax).toBeGreaterThan(0);
    expect(y5!.afterTaxNetProceeds).toBeLessThan(y5!.netProceedsPreTax);
    expect(y5!.afterTaxRealWealthMade).toBeLessThan(
      d.realWealthSnapshots.find((w) => w.year === 5)!.realWealthMadeUserTerm
    );
  });

  it("models 1031 boot recognition tax separately from full sale tax", () => {
    const state = {
      ...fixtureV2Full,
      tax: {
        enabled: true as const,
        exchange1031: { replacementPropertyCost: 600_000, bootReceived: 25_000 },
      },
    };
    const d = deriveScenario(state);
    const y10 = d.tax!.exitSnapshots.find((s) => s.year === 10);
    expect(y10?.exchange1031?.recognizedGain).toBe(25_000);
    expect(y10!.estimatedSaleTax).toBeLessThan(
      y10!.saleTaxSummary.recapture.estimatedRecaptureTax +
        y10!.saleTaxSummary.capitalGainTax.estimatedTax
    );
  });

  it("handles empty scenario without NaN", () => {
    const d = deriveScenario(emptyAppState());
    expect(d.tax).toBeNull();
  });
});
