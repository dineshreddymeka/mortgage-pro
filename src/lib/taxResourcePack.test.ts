import { describe, expect, it } from "vitest";
import { buildTaxResourcePack, filterTaxResources, relevantTaxTopics } from "./taxResourcePack";
import { fixtureV2Full } from "../__fixtures__/scenarioFixtures";

describe("taxResourcePack", () => {
  it("includes base IRS resources for any state", () => {
    const pack = buildTaxResourcePack({ propertyState: "" });
    expect(pack.some((r) => r.id === "irs-pub-527")).toBe(true);
    expect(pack.some((r) => r.id === "irs-1031")).toBe(true);
  });

  it("adds state portal entry when propertyState is known", () => {
    const pack = buildTaxResourcePack({ propertyState: "TX" });
    expect(pack.some((r) => r.topic === "state_local" && r.source === "TX")).toBe(true);
  });

  it("filters resources by topic", () => {
    const pack = buildTaxResourcePack({ propertyState: "CA" });
    const qbi = filterTaxResources(pack, "qbi");
    expect(qbi.every((r) => r.topic === "qbi")).toBe(true);
    expect(qbi.length).toBeGreaterThan(0);
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
