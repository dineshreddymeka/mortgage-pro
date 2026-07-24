import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests, setConfigForTests, loadConfig } from "../../config.js";
import { collectFederalReferences } from "./federal.js";
import { resetFetchForTests, setFetchForTests } from "./fetch.js";
import { createFixtureFetch } from "./testFixtures.js";

describe("collectFederalReferences", () => {
  beforeEach(() => {
    resetConfigForTests();
    setConfigForTests(loadConfig({}));
    setFetchForTests(createFixtureFetch());
  });

  afterEach(() => {
    resetFetchForTests();
  });

  it("returns IRS and Federal Register references from fixtures", async () => {
    const outcome = await collectFederalReferences();

    expect(outcome.references.some((ref) => ref.id === "irs-pub-530" && ref.jurisdiction === "federal")).toBe(true);
    expect(outcome.references.some((ref) => ref.id === "fr-2024-12345" && ref.topic === "1031")).toBe(true);
    expect(outcome.provenanceSources.some((url) => url.includes("irs.gov"))).toBe(true);

    const irsRef = outcome.references.find((ref) => ref.id === "irs-pub-530");
    expect(irsRef?.title).toBe("IRS Pub 530 — Tax Information for Homeowners");
    expect(irsRef?.excerpt).toContain("Mortgage interest");
  });
});
