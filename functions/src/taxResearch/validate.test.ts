import { describe, expect, it } from "vitest";
import { validateCollectHouseTaxResearchBody } from "../taxResearch/validate.js";

describe("validateCollectHouseTaxResearchBody", () => {
  it("accepts minimal valid request", () => {
    const result = validateCollectHouseTaxResearchBody({
      propertyDocId: "doc-123",
      propertyAddress: "123 Main St",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body.propertyDocId).toBe("doc-123");
      expect(result.body.propertyAddress).toBe("123 Main St");
    }
  });

  it("requires propertyDocId", () => {
    expect(validateCollectHouseTaxResearchBody({ propertyAddress: "123 Main St" }).ok).toBe(false);
  });

  it("requires at least one identity field", () => {
    expect(validateCollectHouseTaxResearchBody({ propertyDocId: "doc-123" }).ok).toBe(false);
  });

  it("normalizes propertyState to uppercase", () => {
    const result = validateCollectHouseTaxResearchBody({
      propertyDocId: "doc-123",
      propertyPostalCode: "78701",
      propertyState: "tx",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.propertyState).toBe("TX");
  });

  it("rejects invalid latitude", () => {
    const result = validateCollectHouseTaxResearchBody({
      propertyDocId: "doc-123",
      propertyLatitude: "bad",
      propertyAddress: "123 Main St",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts forceRefresh boolean", () => {
    const result = validateCollectHouseTaxResearchBody({
      propertyDocId: "doc-123",
      propertyAddress: "123 Main St",
      forceRefresh: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.forceRefresh).toBe(true);
  });
});
