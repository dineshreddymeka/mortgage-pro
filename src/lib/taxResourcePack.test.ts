import { describe, expect, it } from "vitest";
import {
  buildTaxResourcePack,
  filterTaxResources,
  filterTaxResourcesByJurisdiction,
  focusTopicsForVariant,
  getTopicGuide,
  groupTaxResourcesByJurisdiction,
  listTopicGuides,
  relevantTaxTopics,
  resolveRelatedResources,
} from "./taxResourcePack";
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

  it("lists topic guides with checklists", () => {
    const guides = listTopicGuides();
    expect(guides.length).toBeGreaterThan(5);
    const dep = getTopicGuide("depreciation");
    expect(dep?.checklist.length).toBeGreaterThan(2);
    expect(getTopicGuide("invalid" as never)).toBeUndefined();
  });

  it("focusTopicsForVariant emphasizes rental vs exit topics", () => {
    expect(focusTopicsForVariant("rental").has("depreciation")).toBe(true);
    expect(focusTopicsForVariant("rental").has("1031")).toBe(false);
    expect(focusTopicsForVariant("exit").has("1031")).toBe(true);
    expect(focusTopicsForVariant("exit").has("depreciation")).toBe(false);
  });

  it("resolveRelatedResources picks guide ids from pack", () => {
    const pack = buildTaxResourcePack({ propertyState: "", propertyPostalCode: "", propertyAddress: "" });
    const guide = getTopicGuide("1031");
    expect(guide).toBeDefined();
    const related = resolveRelatedResources(pack, guide!);
    expect(related.some((r) => r.id === "irs-1031")).toBe(true);
  });
});
