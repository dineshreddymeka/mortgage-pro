import { describe, expect, it } from "vitest";
import {
  fixtureAllKnownFields,
  fixtureFirestoreHouseDoc,
  fixtureFutureV99,
  fixtureLegacyCategoryHouse,
  fixtureLegacyV2Aliases,
  fixtureV1MortgageOnly,
  fixtureV2Full,
} from "../__fixtures__/scenarioFixtures";
import { resolveScenarioFromHouseDoc } from "../storage/houseTree";
import {
  defaultAppState,
  emptyAppState,
  KNOWN_SCENARIO_KEYS,
  mergeParsedWithSchemaDefaults,
  OPTIONAL_SCENARIO_KEYS,
  parseMortgageState,
  preserveUnknownScenarioFields,
  REQUIRED_SCENARIO_KEYS,
  SCHEMA_VERSION,
  serializeMortgageState,
  type AppPersisted,
} from "../storage/mortgageState";

type KnownScenarioKey = (typeof KNOWN_SCENARIO_KEYS)[number];
const knownKeysCoverType: Exclude<keyof AppPersisted, KnownScenarioKey> extends never ? true : false =
  true;

function roundTrip(state: AppPersisted): AppPersisted {
  return mergeParsedWithSchemaDefaults(parseMortgageState(serializeMortgageState(state)));
}

function assertKnownFieldsEqual(a: AppPersisted, b: AppPersisted) {
  for (const key of KNOWN_SCENARIO_KEYS) {
    if (key === "v") {
      expect(b.v).toBe(SCHEMA_VERSION);
      continue;
    }
    expect(JSON.stringify((a as Record<string, unknown>)[key])).toBe(
      JSON.stringify((b as Record<string, unknown>)[key])
    );
  }
}

describe("mortgageState serialization and migration", () => {
  it("keeps the type, key inventory, defaults, reset, and populated fixtures synchronized", () => {
    expect(knownKeysCoverType).toBe(true);
    expect(new Set(KNOWN_SCENARIO_KEYS).size).toBe(KNOWN_SCENARIO_KEYS.length);
    expect([...REQUIRED_SCENARIO_KEYS, ...OPTIONAL_SCENARIO_KEYS]).toEqual(
      KNOWN_SCENARIO_KEYS
    );

    const defaults = defaultAppState() as unknown as Record<string, unknown>;
    const reset = emptyAppState() as unknown as Record<string, unknown>;
    for (const key of REQUIRED_SCENARIO_KEYS) {
      expect(defaults, `default missing ${key}`).toHaveProperty(key);
      expect(reset, `reset missing ${key}`).toHaveProperty(key);
    }
    for (const key of Object.keys(defaults)) {
      expect(KNOWN_SCENARIO_KEYS).toContain(key);
    }
    for (const key of Object.keys(reset)) {
      expect(KNOWN_SCENARIO_KEYS).toContain(key);
    }

    const populated = fixtureAllKnownFields as unknown as Record<string, unknown>;
    for (const key of OPTIONAL_SCENARIO_KEYS) {
      const represented =
        Object.prototype.hasOwnProperty.call(populated, key) ||
        Object.prototype.hasOwnProperty.call(fixtureLegacyV2Aliases, key);
      expect(represented, `populated fixtures missing optional field ${key}`).toBe(true);
    }
  });

  it("default scenario round-trips without field loss", () => {
    const base = defaultAppState();
    const restored = roundTrip(base);
    assertKnownFieldsEqual(base, restored);
  });

  it("preserves refi, DTI budget, growth, paymentPlan, rentalProFormaInclude, rentalIncome, and dealStrategy through serialize/parse", () => {
    const withBlocks = {
      ...fixtureV2Full,
      growth: { rentGrowthPercent: 2.5, expenseGrowthPercent: 1.5 },
      paymentPlan: { frequency: "biweekly" as const, lumpSums: [{ month: 24, amount: 5000 }] },
      rentalIncome: {
        mode: "multifamily" as const,
        multifamily: {
          units: [{ id: "u1", monthlyRent: 1500, vacancyRatePercent: 5 }],
        },
      },
      dealStrategy: {
        brrrr: { arv: 600_000, refiLtvPercent: 75 },
        flip: { salePrice: 580_000 },
      },
    };
    const restored = roundTrip(withBlocks);
    expect(restored.refi).toEqual(fixtureV2Full.refi);
    expect(restored.customHousingBudgetMonthly).toBe(fixtureV2Full.customHousingBudgetMonthly);
    expect(restored.rentalProFormaInclude).toEqual(fixtureV2Full.rentalProFormaInclude);
    expect(restored.sellRentalYieldInclude).toEqual(fixtureV2Full.sellRentalYieldInclude);
    expect(restored.buyingCostLineOverrides).toEqual(fixtureV2Full.buyingCostLineOverrides);
    expect(restored.growth).toEqual(withBlocks.growth);
    expect(restored.paymentPlan).toEqual(withBlocks.paymentPlan);
    expect(restored.rentalIncome).toEqual(withBlocks.rentalIncome);
    expect(restored.dealStrategy).toEqual(withBlocks.dealStrategy);
  });

  it("preserves enabled tax assumptions through serialize/parse", () => {
    const withTax = {
      ...fixtureV2Full,
      tax: {
        enabled: true as const,
        landPercent: 25,
        marginalIncomeTaxRatePercent: 32,
        exchange1031: { bootReceived: 10_000 },
      },
    };
    const restored = roundTrip(withTax);
    expect(restored.tax).toEqual(withTax.tax);
  });

  it("drops tax block when enabled is not true", () => {
    const parsed = parseMortgageState(
      JSON.stringify({ ...fixtureV2Full, tax: { enabled: false, landPercent: 30 } })
    );
    expect(parsed.tax).toBeUndefined();
  });

  it("migrates known v1 mortgage JSON to current schema with rental defaults", () => {
    const parsed = parseMortgageState(JSON.stringify(fixtureV1MortgageOnly));
    expect(parsed.v).toBe(SCHEMA_VERSION);
    expect(parsed.homePrice).toBe(400_000);
    expect(parsed.downPayment).toBe(80_000);
    expect(parsed.pmiMonthly).toBe(180);
    expect(parsed.monthlyRent).toBe(defaultAppState().monthlyRent);
  });

  it("migrates v2 top-level credit aliases into the canonical upfront block", () => {
    const parsed = parseMortgageState(JSON.stringify(fixtureLegacyV2Aliases));
    expect(parsed.upfront).toEqual({
      earnestMoney: 8000,
      sellerCredit: 2500,
      lenderCredit: 750,
      rehabCashIn: 12_000,
    });
    expect(parsed.earnestMoney).toBeUndefined();
    expect(parsed.sellerCredit).toBeUndefined();
    expect(parsed.lenderCredit).toBeUndefined();
    expect(parsed.rehabCashIn).toBeUndefined();
  });

  it("does not silently reset when loading a future numeric schema version", () => {
    const parsed = parseMortgageState(JSON.stringify(fixtureFutureV99));
    expect(parsed.homePrice).toBe(fixtureV2Full.homePrice);
    expect(parsed.refi).toEqual(fixtureV2Full.refi);
    expect(parsed.customHousingBudgetMonthly).toBe(fixtureV2Full.customHousingBudgetMonthly);
    expect((parsed as Record<string, unknown>).growth).toEqual(fixtureFutureV99.growth);
    expect((parsed as Record<string, unknown>).offerTargets).toEqual(fixtureFutureV99.offerTargets);
    expect(parsed.v).toBe(SCHEMA_VERSION);
  });

  it("preserveUnknownScenarioFields keeps extra keys from newer clients", () => {
    const source = { ...fixtureV2Full, futureBlock: { foo: 1 } };
    const preserved = preserveUnknownScenarioFields(source, fixtureV2Full);
    expect((preserved as Record<string, unknown>).futureBlock).toEqual({ foo: 1 });
    expect(preserved.homePrice).toBe(fixtureV2Full.homePrice);
  });

  it("parses decision-tool assumptions without persisting derived results", () => {
    const raw = {
      ...fixtureV2Full,
      offerTargets: { targetCashFlowMonthly: 500, targetDscr: 1.2 },
      rentVsBuy: { comparableRentMonthly: 2500, horizonYears: 5 },
      stressTestDeltas: { rateDeltaPct: 1, rentDeltaPct: -5 },
    };
    const parsed = parseMortgageState(JSON.stringify(raw));
    expect(parsed.offerTargets).toEqual(raw.offerTargets);
    expect(parsed.rentVsBuy).toEqual(raw.rentVsBuy);
    expect(parsed.stressTestDeltas).toEqual(raw.stressTestDeltas);
  });

  it("emptyAppState reset clears editable fields to zero/empty", () => {
    const cleared = emptyAppState();
    expect(cleared.homePrice).toBe(0);
    expect(cleared.monthlyRent).toBe(0);
    expect(cleared.propertyAddress).toBe("");
    expect(cleared.refi).toBeUndefined();
    expect(cleared.growth).toBeUndefined();
    expect(cleared.paymentPlan).toBeUndefined();
    expect(cleared.tax).toBeUndefined();
    expect(cleared.rentalProFormaInclude).toBeUndefined();
    expect(cleared.v).toBe(SCHEMA_VERSION);
  });

  it("parses legacy growth field aliases rentGrowthPct / expenseGrowthPct", () => {
    const parsed = parseMortgageState(
      JSON.stringify({
        ...fixtureV2Full,
        growth: { rentGrowthPct: 4, expenseGrowthPct: 2 },
      })
    );
    expect(parsed.growth).toEqual({ rentGrowthPercent: 4, expenseGrowthPercent: 2 });
  });

  it("Firestore house doc scenario round-trips through resolveScenarioFromHouseDoc", () => {
    const doc = fixtureFirestoreHouseDoc(fixtureV2Full);
    const resolved = resolveScenarioFromHouseDoc(doc);
    expect(resolved).not.toBeNull();
    assertKnownFieldsEqual(fixtureV2Full, resolved!);
    expect(resolved!.refi).toEqual(fixtureV2Full.refi);
  });

  it("legacy category house doc folds into single scenario without losing inputs", () => {
    const resolved = resolveScenarioFromHouseDoc(fixtureLegacyCategoryHouse);
    expect(resolved).not.toBeNull();
    expect(resolved!.homePrice).toBe(350_000);
    expect(resolved!.downPayment).toBe(70_000);
    expect(resolved!.monthlyRent).toBe(2400);
    expect(resolved!.closingCosts).toBe(7000);
    expect(resolved!.propertyAddress).toBe("456 Oak Ave");
  });

  it("parses loan, upfront, and location fields", () => {
    const parsed = parseMortgageState(JSON.stringify({
      ...fixtureV2Full,
      loan: { productType: "fha", financeUpfrontFees: true },
      upfront: { earnestMoney: 5000 },
      propertyState: "tx",
      propertyPostalCode: "78701",
    }));
    expect(parsed.loan?.productType).toBe("fha");
    expect(parsed.upfront?.earnestMoney).toBe(5000);
    expect(parsed.propertyState).toBe("TX");
  });

  it("mergeParsedWithSchemaDefaults adds missing fields from current defaults", () => {
    const partial = { ...fixtureV2Full, pmiMonthly: undefined } as unknown as AppPersisted;
    const merged = mergeParsedWithSchemaDefaults(partial);
    expect(merged.pmiMonthly).toBe(0);
    expect(merged.refi).toEqual(fixtureV2Full.refi);
  });
});
