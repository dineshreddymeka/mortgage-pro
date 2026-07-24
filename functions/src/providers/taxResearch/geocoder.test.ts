import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../../config.js";
import { resetFetchForTests, setFetchForTests } from "./fetch.js";
import { resolveCountyViaCensusGeocoder } from "./geocoder.js";
import { createFixtureFetch } from "./testFixtures.js";

describe("resolveCountyViaCensusGeocoder", () => {
  beforeEach(() => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
  });

  it("resolves county and state FIPS from Census Geocoder fixture", async () => {
    const { resolution, outcome } = await resolveCountyViaCensusGeocoder({
      propertyDocId: "doc-1",
      propertyAddress: "123 Main St, San Francisco",
      propertyState: "CA",
      propertyPostalCode: "94107",
    });

    expect(outcome.errors).toEqual([]);
    expect(resolution?.countyName).toBe("San Francisco");
    expect(resolution?.stateCode).toBe("CA");
    expect(resolution?.stateFips).toBe("06");
    expect(resolution?.countyFips).toBe("075");
    expect(outcome.provenanceSources[0]).toContain("geocoding.geo.census.gov");
  });

  it("returns a clear error when address identity is insufficient", async () => {
    const { resolution, outcome } = await resolveCountyViaCensusGeocoder({
      propertyDocId: "doc-1",
      propertyPostalCode: "94107",
    });

    expect(resolution).toBeUndefined();
    expect(outcome.errors[0]?.code).toBe("geocoder_address_missing");
  });

  it("reports geocoder_state_mismatch when Census state differs from request", async () => {
    const { resolution, outcome } = await resolveCountyViaCensusGeocoder({
      propertyDocId: "doc-1",
      propertyAddress: "123 Main St, San Francisco",
      propertyState: "NY",
      propertyPostalCode: "94107",
    });

    expect(resolution?.stateMismatch).toBe(true);
    expect(resolution?.stateCode).toBe("CA");
    expect(outcome.errors.some((error) => error.code === "geocoder_state_mismatch")).toBe(true);
  });
});
