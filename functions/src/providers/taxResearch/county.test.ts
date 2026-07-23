import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../../config.js";
import { collectCountyReferences } from "./county.js";
import { resetFetchForTests, setFetchForTests } from "./fetch.js";
import { createFixtureFetch } from "./testFixtures.js";

describe("collectCountyReferences", () => {
  beforeEach(() => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
  });

  it("returns directory and resolved county references for supported states", async () => {
    const outcome = await collectCountyReferences(
      { countyName: "San Francisco", stateCode: "CA", stateFips: "06", countyFips: "075" },
      "CA"
    );

    expect(outcome.references.some((ref) => ref.id === "county-dir-ca")).toBe(true);
    expect(outcome.references.some((ref) => ref.title.includes("San Francisco County"))).toBe(true);
    expect(outcome.errors.some((error) => error.code === "county_assessor_url_not_deterministic")).toBe(true);
    expect(outcome.provenanceSources[0]).toContain("boe.ca.gov");
  });

  it("reports partial unsupported state directories", async () => {
    const outcome = await collectCountyReferences(
      { countyName: "Travis", stateCode: "TX", stateFips: "48", countyFips: "453" },
      "TX"
    );

    expect(outcome.references.some((ref) => ref.id.startsWith("county-dir-tx"))).toBe(true);
    expect(outcome.errors.some((error) => error.code === "county_assessor_url_not_deterministic")).toBe(true);
  });
});
