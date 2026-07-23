import { describe, expect, it } from "vitest";
import { buildTaxResourcePack, filterTaxResources, filterTaxResourcesByJurisdiction, groupTaxResourcesByJurisdiction, relevantTaxTopics } from "./taxResourcePack";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";

describe("taxResourcePack", () => {
  it("includes federal IRS resources for any state", () => {
    const pack = buildTaxResourcePack({ propertyState: "", propertyPostalCode: "", propertyAddress: "" });
    expect(pack.some((r) => r.id === "irs-pub-527" && r.jurisdiction === "federal")).toBe(true);
    expect(pack.some((r) => r.id === "irs-1031")).toBe(true);
  });

  it("adds state portal when propertyState is known", () => {
    const pack = buildTaxResourcePack({ propertyState: "TX", propertyPostalCode: "", propertyAddress: "" });
    expect(pack.some((r) => r.jurisdiction === "state" && r.source === "TX")).toBe(true);
  });

  it("adds county directory and zip lookup for TX", () => {
    const pack = buildTaxResourcePack({
      propertyState: "TX",
      propertyPostalCode: "78701",
      propertyAddress: "123 Main St, Austin",
    });
    expect(pack.some((r) => r.jurisdiction === "county" && r.id.startsWith("county-dir-tx"))).toBe(true);
    expect(pack.some((r) => r.jurisdiction === "county" && r.title.includes("78701"))).toBe(true);
  });

  it("groups federal, state, and county resources", () => {
    const pack = buildTaxResourcePack({
      propertyState: "CA",
      propertyPostalCode: "90210",
      propertyAddress: "",
    });
    const groups = groupTaxResourcesByJurisdiction(pack);
    expect(groups.federal.length).toBeGreaterThan(0);
    expect(groups.state.length).toBe(1);
    expect(groups.county.length).toBeGreaterThan(0);
  });

  it("filters resources by topic and jurisdiction", () => {
    const pack = buildTaxResourcePack({ propertyState: "CA", propertyPostalCode: "", propertyAddress: "" });
    const qbi = filterTaxResources(pack, "qbi");
    expect(qbi.every((r) => r.topic === "qbi")).toBe(true);
    const county = filterTaxResourcesByJurisdiction(pack, "county");
    expect(county.every((r) => r.jurisdiction === "county")).toBe(true);
  });

  it("highlights relevant topics when tax modeling is enabled", () => {
    const topics = relevantTaxTopics({
      ...fixtureV2Full,
      tax: { enabled: true, landPercent: 20 },
    });
    expect(topics.has("depreciation")).toBe(true);
    expect(topics.has("1031")).toBe(true);
  });
});
