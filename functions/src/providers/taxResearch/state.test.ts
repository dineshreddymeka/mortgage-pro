import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../../config.js";
import { resetFetchForTests, setFetchForTests } from "./fetch.js";
import { collectStateReferences } from "./state.js";
import { createFixtureFetch } from "./testFixtures.js";

describe("collectStateReferences", () => {
  beforeEach(() => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
  });

  it("selects and verifies the official CA portal", async () => {
    const outcome = await collectStateReferences("CA");

    expect(outcome.references).toHaveLength(1);
    expect(outcome.references[0]?.jurisdiction).toBe("state");
    expect(outcome.references[0]?.topic).toBe("state_local");
    expect(outcome.references[0]?.url).toContain("ftb.ca.gov");
    expect(outcome.errors).toEqual([]);
  });

  it("returns a partial error for unmapped states", async () => {
    const outcome = await collectStateReferences("ZZ");

    expect(outcome.references).toEqual([]);
    expect(outcome.errors[0]?.code).toBe("state_portal_unmapped");
  });
});
