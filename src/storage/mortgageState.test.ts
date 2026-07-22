import { describe, expect, it } from "vitest";
import {
  fixtureFirestoreHouseDoc,
  fixtureFutureV99,
  fixtureLegacyCategoryHouse,
  fixtureV1MortgageOnly,
  fixtureV2Full,
} from "../__fixtures__/scenarioFixtures";
import { resolveScenarioFromHouseDoc } from "../storage/houseTree";
import {
  defaultAppState,
  emptyAppState,
  KNOWN_SCENARIO_KEYS,
  mergeParsedWithSchemaDefaults,
  parseMortgageState,
  preserveUnknownScenarioFields,
  SCHEMA_VERSION,
  serializeMortgageState,
  type AppPersisted,
} from "../storage/mortgageState";

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
  it("default scenario round-trips without field loss", () => {
    const base = defaultAppState();
    const restored = roundTrip(base);
    assertKnownFieldsEqual(base, restored);
  });

  it("preserves refi, DTI budget, and rentalProFormaInclude through serialize/parse", () => {
    const restored = roundTrip(fixtureV2Full);
    expect(restored.refi).toEqual(fixtureV2Full.refi);
    expect(restored.customHousingBudgetMonthly).toBe(fixtureV2Full.customHousingBudgetMonthly);
    expect(restored.rentalProFormaInclude).toEqual(fixtureV2Full.rentalProFormaInclude);
    expect(restored.sellRentalYieldInclude).toEqual(fixtureV2Full.sellRentalYieldInclude);
    expect(restored.buyingCostLineOverrides).toEqual(fixtureV2Full.buyingCostLineOverrides);
  });

  it("migrates known v1 mortgage JSON to current schema with rental defaults", () => {
    const parsed = parseMortgageState(JSON.stringify(fixtureV1MortgageOnly));
    expect(parsed.v).toBe(SCHEMA_VERSION);
    expect(parsed.homePrice).toBe(400_000);
    expect(parsed.downPayment).toBe(80_000);
    expect(parsed.pmiMonthly).toBe(180);
    expect(parsed.monthlyRent).toBe(defaultAppState().monthlyRent);
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

  it("emptyAppState reset clears editable fields to zero/empty", () => {
    const cleared = emptyAppState();
    expect(cleared.homePrice).toBe(0);
    expect(cleared.monthlyRent).toBe(0);
    expect(cleared.propertyAddress).toBe("");
    expect(cleared.refi).toBeUndefined();
    expect(cleared.rentalProFormaInclude).toBeUndefined();
    expect(cleared.v).toBe(SCHEMA_VERSION);
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

  it("mergeParsedWithSchemaDefaults adds missing fields from current defaults", () => {
    const partial = { ...fixtureV2Full, pmiMonthly: undefined } as unknown as AppPersisted;
    const merged = mergeParsedWithSchemaDefaults(partial);
    expect(merged.pmiMonthly).toBe(0);
    expect(merged.refi).toEqual(fixtureV2Full.refi);
  });
});
