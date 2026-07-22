import { describe, expect, it } from "vitest";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";
import {
  buildBrrrrInput,
  buildFlipInput,
  hasBrrrrInputs,
  hasFlipInputs,
  resolveDealStrategySnapshots,
} from "./resolveDealStrategy";

describe("resolveDealStrategy", () => {
  it("builds BRRRR input from scenario primitives and overrides", () => {
    const input = buildBrrrrInput(fixtureV2Full, {
      arv: 650_000,
      refiLtvPercent: 75,
      refiClosingCosts: 5000,
      holdingCostsDuringRehab: 3000,
    });
    expect(input).not.toBeNull();
    expect(input!.purchasePrice).toBe(fixtureV2Full.homePrice);
    expect(input!.downPayment).toBe(fixtureV2Full.downPayment);
    expect(input!.initialLoanAmount).toBe(fixtureV2Full.homePrice - fixtureV2Full.downPayment);
    expect(input!.buyClosingCosts).toBe(fixtureV2Full.closingCosts);
  });

  it("derives BRRRR snapshot without persisting computed fields", () => {
    const snapshots = resolveDealStrategySnapshots(fixtureV2Full, {
      brrrr: { arv: 650_000, refiLtvPercent: 75, refiClosingCosts: 5000 },
    });
    expect(snapshots.brrrr).not.toBeNull();
    expect(snapshots.brrrr!.refiLoanAmount).toBeCloseTo(487_500, 0);
    expect(snapshots.flip).toBeNull();
  });

  it("derives flip snapshot from sale price override", () => {
    const snapshots = resolveDealStrategySnapshots(fixtureV2Full, {
      flip: { salePrice: 600_000, sellingCostPercent: 6, holdingCosts: 4000 },
    });
    expect(snapshots.flip).not.toBeNull();
    expect(snapshots.flip!.netProfit).toBeDefined();
    expect(snapshots.brrrr).toBeNull();
  });

  it("buildFlipInput defaults loan payoff to modeled loan amount", () => {
    const input = buildFlipInput(fixtureV2Full, { salePrice: 550_000 });
    expect(input!.loanPayoffAtSale).toBe(fixtureV2Full.homePrice - fixtureV2Full.downPayment);
  });

  it("hasBrrrrInputs / hasFlipInputs detect meaningful persisted input", () => {
    expect(hasBrrrrInputs(undefined)).toBe(false);
    expect(hasBrrrrInputs({ arv: 500_000 })).toBe(true);
    expect(hasFlipInputs(undefined)).toBe(false);
    expect(hasFlipInputs({ salePrice: 400_000 })).toBe(true);
  });
});
