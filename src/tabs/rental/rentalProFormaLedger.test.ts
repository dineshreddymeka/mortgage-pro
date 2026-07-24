import { describe, expect, it } from "vitest";
import { computeRentalAnalysis } from "../../lib/rentalMath";
import { computeMonthlyPayment } from "../../lib/mortgageMath";
import { fixtureV2Full } from "../../__fixtures__/scenarioFixtures";
import {
  buildProFormaLedgerRows,
  computeExitYieldAdjusted,
  computeProFormaAdjusted,
  ledgerNavAriaLabel,
  ledgerScrollElementId,
  lineIncluded,
  monthlyCarryingTotal,
  OPEX_SCROLL_ANCHOR,
  patchIncludeMap,
  pctOfEgi,
  PF_PI_ID,
  PF_PMI_ID,
} from "./rentalProFormaLedger";

function analysisForFixture() {
  const mortgage = computeMonthlyPayment(
    fixtureV2Full.homePrice,
    fixtureV2Full.downPayment,
    fixtureV2Full.interestRateApr,
    fixtureV2Full.termYears,
    fixtureV2Full.propertyTaxAnnual,
    fixtureV2Full.insuranceAnnual,
    fixtureV2Full.hoaMonthly,
    fixtureV2Full.pmiMonthly
  );
  return computeRentalAnalysis(fixtureV2Full, mortgage);
}

describe("rentalProFormaLedger helpers", () => {
  it("treats missing include keys as on and patches exclusion maps", () => {
    expect(lineIncluded(undefined, "mgmt")).toBe(true);
    expect(lineIncluded({}, "mgmt")).toBe(true);
    expect(lineIncluded({ mgmt: false }, "mgmt")).toBe(false);
    expect(patchIncludeMap(undefined, "mgmt", false)).toEqual({ mgmt: false });
    expect(patchIncludeMap({ mgmt: false }, "mgmt", true)).toBeUndefined();
    expect(patchIncludeMap({ mgmt: false, tax: false }, "mgmt", true)).toEqual({ tax: false });
  });

  it("builds one ledger sequence with income, opex, debt, and cash flow", () => {
    const r = analysisForFixture();
    const rows = buildProFormaLedgerRows(r, fixtureV2Full.vacancyRatePercent);
    const kinds = rows.map((row) => row.kind);
    expect(kinds.slice(0, 3)).toEqual(["gsi", "vacancy", "egi"]);
    expect(kinds.filter((kind) => kind === "opex")).toHaveLength(r.operatingExpenseLines.length);
    expect(kinds.indexOf("noi")).toBeGreaterThan(kinds.lastIndexOf("opex"));
    expect(kinds.indexOf("pi")).toBeGreaterThan(kinds.indexOf("noi"));
    expect(kinds.at(-1)).toBe("cashflow");
    expect(rows.find((row) => row.kind === "pi")?.navTarget).toBe("common-inputs");
    expect(rows.find((row) => row.kind === "cashflow")?.navTarget).toBe("overview");
    for (const line of r.operatingExpenseLines) {
      const row = rows.find((item) => item.id === line.id);
      expect(row?.opexAnchorId).toBe(OPEX_SCROLL_ANCHOR[line.id] ?? "rental-edit-carrying");
      expect(row?.showIncludeToggles).toBe(true);
    }
  });

  it("routes P&I/PMI ledger nav to Common Inputs with matching aria labels", () => {
    const r = analysisForFixture();
    const rows = buildProFormaLedgerRows(r, fixtureV2Full.vacancyRatePercent);
    const pi = rows.find((row) => row.kind === "pi");
    expect(pi?.navTarget).toBe("common-inputs");
    expect(ledgerNavAriaLabel(pi!)).toBe("Edit P&I (principal & interest) on Common Inputs");

    const pmi = rows.find((row) => row.kind === "pmi");
    if (pmi) {
      expect(pmi.navTarget).toBe("common-inputs");
      expect(ledgerNavAriaLabel(pmi)).toBe("Edit PMI on Common Inputs");
    }

    expect(ledgerScrollElementId("income")).toBe("rental-edit-income");
    expect(ledgerScrollElementId("vacancy")).toBe("rental-edit-vacancy");
    expect(ledgerScrollElementId("overview")).toBe("rental-metrics-row");
    expect(ledgerScrollElementId("opex", "rental-edit-mgmt")).toBe("rental-edit-mgmt");
    expect(ledgerScrollElementId("opex")).toBe("rental-edit-carrying");
    expect(ledgerNavAriaLabel({ label: "Mgmt", navTarget: "opex" })).toBe(
      "Jump to operating expense editor for Mgmt"
    );
  });

  it("computes pro-forma adjusted totals independently from exit-yield totals", () => {
    const r = analysisForFixture();
    const pf = computeProFormaAdjusted(r, { [PF_PI_ID]: false, mgmt: false });
    const yieldAdj = computeExitYieldAdjusted(r, { [PF_PI_ID]: true, mgmt: false });

    expect(pf.piIn).toBe(false);
    expect(pf.opexPartial).toBe(true);
    expect(pf.hasExclusion).toBe(true);
    expect(pf.cfAdj).toBeCloseTo(pf.noiAdj, 5);

    expect(yieldAdj.piIn).toBe(true);
    expect(yieldAdj.opexPartial).toBe(true);
    expect(yieldAdj.cfAdj).toBeLessThan(yieldAdj.noiAdj);
    expect(yieldAdj.cfAdj).not.toBeCloseTo(pf.cfAdj, 5);
  });

  it("keeps PMI toggle out of pro-forma totals when PMI is zero", () => {
    const r = analysisForFixture();
    if (r.pmiMonthly > 0.0001) {
      const withPmiOff = computeProFormaAdjusted(r, { [PF_PMI_ID]: false });
      expect(withPmiOff.pmiIn).toBe(false);
      expect(withPmiOff.cfAdj).toBeCloseTo(withPmiOff.noiAdj - withPmiOff.piAmt, 5);
    } else {
      const adj = computeProFormaAdjusted(r, { [PF_PMI_ID]: false });
      expect(adj.pmiIn).toBe(false);
      expect(adj.pmiAmt).toBe(0);
    }
  });

  it("formats percent-of-EGI with the prior display conventions", () => {
    expect(pctOfEgi(50, 0)).toBe("—");
    expect(pctOfEgi(0.2, 100)).toBe("<1%");
    expect(pctOfEgi(-0.2, 100)).toBe(">−1%");
    expect(pctOfEgi(25, 100)).toBe("25%");
  });

  it("includes PMI in monthly carrying total with OpEx and P&I", () => {
    expect(monthlyCarryingTotal(400, 1200, 85)).toBe(1685);
    expect(monthlyCarryingTotal(400, 1200, 0)).toBe(1600);
    const r = analysisForFixture();
    const opex = r.operatingExpenseLines.reduce((sum, line) => sum + line.amount, 0);
    expect(monthlyCarryingTotal(opex, r.principalAndInterestMonthly, r.pmiMonthly)).toBeCloseTo(
      opex + r.principalAndInterestMonthly + r.pmiMonthly,
      5
    );
  });
});
