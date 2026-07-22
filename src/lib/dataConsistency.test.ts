import { describe, expect, it } from "vitest";
import {
  fixtureAllKnownFields,
  fixtureFutureV99,
  fixtureLegacyCategoryHouse,
  fixtureMalformedNested,
  fixtureV2Full,
} from "../__fixtures__/scenarioFixtures";
import { resolveScenarioFromHouseDoc } from "../storage/houseTree";
import { emptyAppState } from "../storage/mortgageState";
import {
  buildDataVerificationReport,
  compareDataDeep,
  importScenarioFromFullExport,
  verifyScenarioRoundTrip,
} from "./dataConsistency";
import { buildFullScenarioExport } from "./scenarioExport";

describe("scenario data consistency", () => {
  it("round-trips every populated canonical field without mutation", () => {
    const before = structuredClone(fixtureAllKnownFields);
    const result = verifyScenarioRoundTrip(fixtureAllKnownFields);

    expect(result).toMatchObject({
      ok: true,
      missingPaths: [],
      changedPaths: [],
      extraPaths: [],
    });
    expect(
      buildDataVerificationReport(fixtureAllKnownFields, {
        scenario: fixtureAllKnownFields,
      })
    ).toMatchObject({
      ok: true,
      invalidValues: [],
      duplicateAliases: [],
      duplicateCategoryMaps: [],
    });
    expect(fixtureAllKnownFields).toEqual(before);
  });

  it("round-trips the zero/reset state", () => {
    expect(verifyScenarioRoundTrip(emptyAppState()).ok).toBe(true);
  });

  it("preserves future-version extras while documenting version normalization", () => {
    const result = verifyScenarioRoundTrip(fixtureFutureV99);
    expect(result.ok).toBe(true);
    expect(result.toleratedNormalizations).toContainEqual({
      pair: "schema version migration",
      paths: ["v"],
    });

    const imported = importScenarioFromFullExport(
      buildFullScenarioExport(
        importScenarioFromFullExport({
          scenario: fixtureFutureV99,
        })
      )
    ) as unknown as Record<string, unknown>;
    expect(imported.futureUnderwriting).toEqual(fixtureFutureV99.futureUnderwriting);
  });

  it("tolerates explicitly documented derived normalization pairs", () => {
    const result = verifyScenarioRoundTrip(fixtureV2Full);
    expect(result.ok).toBe(true);
    expect(result.toleratedNormalizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pair: "present value ↔ annual appreciation" }),
      ])
    );
  });

  it("reports missing, changed, and extra nested paths", () => {
    expect(
      compareDataDeep(
        { loan: { productType: "fha", arm: { caps: [2, 5] } } },
        { loan: { productType: "va", arm: { caps: [2], margin: 2.25 } } }
      )
    ).toEqual([
      { kind: "missing", path: "loan.arm.caps[1]", expected: 5 },
      { kind: "extra", path: "loan.arm.margin", actual: 2.25 },
      { kind: "changed", path: "loan.productType", expected: "fha", actual: "va" },
    ]);
  });

  it("reports malformed nested arrays and objects without changing the input", () => {
    const before = structuredClone(fixtureMalformedNested);
    const report = buildDataVerificationReport(fixtureMalformedNested);
    const paths = report.invalidValues.map((item) => item.path);

    expect(report.ok).toBe(false);
    expect(paths).toEqual(
      expect.arrayContaining([
        "dealStrategy.brrrr",
        "dealStrategy.flip.salePrice",
        "loan.arm",
        "paymentPlan.frequency",
        "rentalIncome.multifamily.units[0].monthlyRent",
        "rentalProFormaInclude",
      ])
    );
    expect(fixtureMalformedNested).toEqual(before);
  });

  it("finds conflicting aliases and legacy category maps", () => {
    const withAliases = {
      ...fixtureAllKnownFields,
      earnestMoney: 999,
    };
    const aliasReport = buildDataVerificationReport(withAliases);
    expect(aliasReport.duplicateAliases).toContainEqual({
      canonicalPath: "upfront.earnestMoney",
      aliasPath: "earnestMoney",
      status: "conflict",
    });
    expect(aliasReport.singleSourceOfTruth.ok).toBe(false);

    const resolved = resolveScenarioFromHouseDoc(fixtureLegacyCategoryHouse);
    expect(resolved).not.toBeNull();
    const categoryReport = buildDataVerificationReport(resolved!, fixtureLegacyCategoryHouse);
    expect(categoryReport.duplicateCategoryMaps).toEqual([
      "exit",
      "financing",
      "property",
      "rental",
      "upfront",
    ]);
    expect(categoryReport.singleSourceOfTruth.ok).toBe(false);
  });

  it("imports the canonical house scenario and rejects non-export objects", () => {
    const exportDocument = buildFullScenarioExport(fixtureAllKnownFields);
    expect(importScenarioFromFullExport(exportDocument)).toEqual(
      importScenarioFromFullExport({ scenario: fixtureAllKnownFields })
    );
    expect(() => importScenarioFromFullExport({ calculated: {} })).toThrow(
      "does not contain house.scenario or scenario"
    );
  });
});
