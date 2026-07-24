import { describe, expect, it } from "vitest";
import {
  fixtureLegacyCategoryHouse,
  fixtureV1MortgageOnly,
  fixtureV2Full,
} from "../__fixtures__/scenarioFixtures";
import { HOUSE_TREE_VERSION } from "./houseTree";
import { SCHEMA_VERSION } from "./mortgageState";
import { validatePropertyProScenario } from "./scenarioValidation";

describe("validatePropertyProScenario", () => {
  it("accepts every supported input envelope and returns one canonical scenario", () => {
    const cases = [
      ["raw-scenario", fixtureV2Full],
      ["scenario-envelope", { scenario: fixtureV2Full }],
      [
        "house-root",
        { id: "001", v: HOUSE_TREE_VERSION, houseNumber: 1, scenario: fixtureV2Full },
      ],
      [
        "full-export",
        {
          exportKind: "property-pro-full-export",
          house: { id: "001", v: HOUSE_TREE_VERSION, scenario: fixtureV2Full },
          scenario: fixtureV2Full,
        },
      ],
      ["legacy-categories", fixtureLegacyCategoryHouse],
    ] as const;

    for (const [kind, input] of cases) {
      const result = validatePropertyProScenario(input);
      expect(result.inputKind).toBe(kind);
      expect(result.repairedScenario).toBeDefined();
      expect(result.repairedScenario?.homePrice).toBeGreaterThan(0);
      expect(
        (result.repairedScenario as unknown as Record<string, unknown>).validationIssues
      ).toBeUndefined();
    }
  });

  it("migrates v1 and category maps through the canonical state/house-tree readers", () => {
    const legacy = validatePropertyProScenario(fixtureV1MortgageOnly);
    expect(legacy.issues.some((issue) => issue.code === "SCHEMA_VERSION_LEGACY")).toBe(true);
    expect(legacy.repairedScenario?.v).toBe(SCHEMA_VERSION);
    expect(legacy.repairedScenario?.homePrice).toBe(400_000);

    const categories = validatePropertyProScenario({
      property: { homePrice: 310_000, futurePropertyField: { source: "new-client" } },
      financing: { downPayment: 62_000, interestRateApr: 6.5, termYears: 30 },
      rental: { monthlyRent: 2200 },
    });
    expect(categories.inputKind).toBe("legacy-categories");
    expect(categories.repairedScenario?.homePrice).toBe(310_000);
    expect(
      (categories.repairedScenario as unknown as Record<string, unknown>).futurePropertyField
    ).toEqual({ source: "new-client" });
  });

  it("reports safe coercions and repairs synchronized dollar/percentage pairs", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      homePrice: "500000",
      downPayment: 70_000,
      downPaymentPercent: 20,
      propertyTaxAnnual: 100,
      propertyTaxPercent: 1.1,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NUMBER_COERCED",
          path: "scenario.homePrice",
          repairability: "automatic",
        }),
        expect.objectContaining({
          code: "SYNCHRONIZED_PAIR_MISMATCH",
          path: "scenario.downPayment",
        }),
        expect.objectContaining({
          code: "SYNCHRONIZED_PAIR_MISMATCH",
          path: "scenario.propertyTaxAnnual",
        }),
      ])
    );
    expect(result.repairedScenario?.homePrice).toBe(500_000);
    expect(result.repairedScenario?.downPayment).toBe(100_000);
    expect(result.repairedScenario?.propertyTaxAnnual).toBe(5500);
  });

  it("suppresses a candidate for ambiguous ranges and incomplete coordinates", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      homePrice: -1,
      propertyLatitude: 37.7,
      propertyLongitude: null,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "NUMBER_OUT_OF_RANGE",
          path: "scenario.homePrice",
          repairability: "manual",
        }),
        expect.objectContaining({
          code: "COORDINATE_PAIR_INCOMPLETE",
          repairability: "manual",
        }),
      ])
    );
    expect(result.repairedScenario).toBeUndefined();
  });

  it("validates external tax research separately from manual taxIssues", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      research: {
        taxIssues: "not-an-array",
        externalTaxResearch: {
          collectionStatus: "done",
          addressFingerprint: "",
          normalizedReferences: [
            {
              title: "",
              topic: "bad-topic",
              linkStatus: "dead",
              publishedAt: "not-a-date",
            },
          ],
          errors: [{ code: "", message: "" }, "not-an-object"],
          sourceProvenance: { sources: "not-an-array" },
        },
      },
    });

    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        "scenario.research.taxIssues",
        "scenario.research.externalTaxResearch.collectionStatus",
        "scenario.research.externalTaxResearch.addressFingerprint",
        "scenario.research.externalTaxResearch.collectedAt",
        "scenario.research.externalTaxResearch.sourceProvenance.sources",
        "scenario.research.externalTaxResearch.normalizedReferences[0].title",
        "scenario.research.externalTaxResearch.normalizedReferences[0].topic",
        "scenario.research.externalTaxResearch.normalizedReferences[0].linkStatus",
        "scenario.research.externalTaxResearch.normalizedReferences[0].publishedAt",
        "scenario.research.externalTaxResearch.errors[0].code",
        "scenario.research.externalTaxResearch.errors[0].message",
        "scenario.research.externalTaxResearch.errors[1]",
      ])
    );
  });

  it("checks nested refi, payment, loan, tax, STR, strategy, and target blocks", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      refi: { balance: -1, newTermYears: 17 },
      paymentPlan: { frequency: "weekly", lumpSums: [{ month: 0, amount: -10 }] },
      loan: { productType: "other", rateType: "arm" },
      tax: { enabled: true, landPercent: 120, exchange1031: { bootReceived: -1 } },
      rentalIncome: {
        mode: "str",
        str: {
          nightlyRate: 200,
          nightsBookedPerMonth: 32,
          cleaningFeePerStay: 75,
          staysPerMonth: 4,
        },
      },
      dealStrategy: { brrrr: { arv: -100, refiLtvPercent: 110 } },
      offerTargets: { targetDscr: -1 },
    });

    expect(result.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        "scenario.refi.balance",
        "scenario.refi.newTermYears",
        "scenario.paymentPlan.frequency",
        "scenario.paymentPlan.lumpSums[0].month",
        "scenario.loan.productType",
        "scenario.loan.arm",
        "scenario.tax.landPercent",
        "scenario.tax.exchange1031.bootReceived",
        "scenario.rentalIncome.str.nightsBookedPerMonth",
        "scenario.dealStrategy.brrrr.arv",
        "scenario.offerTargets.targetDscr",
      ])
    );
    expect(result.repairedScenario).toBeUndefined();
  });

  it("detects duplicate and unstable unit ids", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      rentalIncome: {
        mode: "multifamily",
        multifamily: {
          units: [
            { id: "unit 1", monthlyRent: 1200 },
            { id: "dupe", monthlyRent: 1300 },
            { id: "dupe", monthlyRent: 1400 },
          ],
        },
      },
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNIT_ID_UNSTABLE",
          path: "scenario.rentalIncome.multifamily.units[0].id",
        }),
        expect.objectContaining({
          code: "UNIT_ID_DUPLICATE",
          path: "scenario.rentalIncome.multifamily.units[2].id",
        }),
      ])
    );
    expect(result.repairedScenario).toBeUndefined();
  });

  it("preserves unknown future fields recursively when current-schema repair is safe", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      futureBlock: { enabled: true },
      loan: {
        productType: "fha",
        futureFeeModel: { basisPoints: 25 },
      },
      tax: {
        enabled: true,
        landPercent: 20,
        futureTaxRule: "2027",
        exchange1031: { bootReceived: 5000, futureExchangeRule: true },
      },
      rentalIncome: {
        mode: "multifamily",
        multifamily: {
          units: [{ id: "unit-a", monthlyRent: 1500, futureLabel: "A" }],
        },
      },
    });

    const repaired = result.repairedScenario as unknown as Record<string, unknown>;
    expect(repaired.futureBlock).toEqual({ enabled: true });
    expect(repaired.loan).toEqual(
      expect.objectContaining({ futureFeeModel: { basisPoints: 25 } })
    );
    expect(repaired.tax).toEqual(
      expect.objectContaining({
        futureTaxRule: "2027",
        exchange1031: expect.objectContaining({ futureExchangeRule: true }),
      })
    );
    expect(repaired.rentalIncome).toEqual(
      expect.objectContaining({
        multifamily: expect.objectContaining({
          units: [expect.objectContaining({ futureLabel: "A" })],
        }),
      })
    );
  });

  it("reports future schemas without rewriting them", () => {
    const result = validatePropertyProScenario({
      ...fixtureV2Full,
      v: SCHEMA_VERSION + 10,
      futureBlock: { doNotDrop: true },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "SCHEMA_VERSION_FUTURE",
        severity: "warning",
        repairability: "manual",
      })
    );
    expect(result.repairedScenario).toBeUndefined();
  });

  it("validates business ids and rejects conflicting duplicate scenario sources", () => {
    const normalizedId = validatePropertyProScenario({
      id: "1",
      houseNumber: 1,
      scenario: fixtureV2Full,
    });
    expect(normalizedId.houseId).toBe("001");
    expect(normalizedId.repairedScenario).toBeDefined();
    expect(normalizedId.issues).toContainEqual(
      expect.objectContaining({ code: "HOUSE_ID_NORMALIZED" })
    );

    const conflict = validatePropertyProScenario({
      house: { id: "001", v: HOUSE_TREE_VERSION, scenario: fixtureV2Full },
      scenario: { ...fixtureV2Full, homePrice: fixtureV2Full.homePrice + 1 },
    });
    expect(conflict.issues).toContainEqual(
      expect.objectContaining({ code: "DUPLICATE_SCENARIO_CONFLICT" })
    );
    expect(conflict.repairedScenario).toBeUndefined();
  });

  it("never throws for unsupported or hostile user data", () => {
    for (const input of [null, [], "{}", 42, {}, { scenario: [] }]) {
      expect(() => validatePropertyProScenario(input)).not.toThrow();
      expect(validatePropertyProScenario(input).valid).toBe(false);
    }

    const hostile = new Proxy(
      {},
      {
        has() {
          throw new Error("user getter failure");
        },
      }
    );
    expect(validatePropertyProScenario(hostile)).toEqual(
      expect.objectContaining({
        valid: false,
        issues: [expect.objectContaining({ code: "INPUT_INSPECTION_FAILED" })],
      })
    );
  });
});
