import { beforeEach, describe, expect, it, vi } from "vitest";
import { mergeResearchSnapshot, persistExternalTaxResearchSnapshot } from "../taxResearch/persist.js";
import type { ExternalTaxResearchSnapshot } from "../taxResearch/types.js";

const { runTransaction, txUpdate, txGet } = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  txUpdate: vi.fn(),
  txGet: vi.fn(),
}));

vi.mock("../db.js", () => ({
  getDb: () => ({
    collection: () => ({
      doc: () => ({}),
    }),
    runTransaction: runTransaction,
  }),
}));

describe("mergeResearchSnapshot", () => {
  it("preserves manual taxIssues and other research fields", () => {
    const scenario = {
      propertyAddress: "123 Main St",
      monthlyRent: 2500,
      research: {
        notes: "Keep these notes",
        taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
        links: [{ id: "link-1", title: "County map", url: "https://example.gov/map" }],
      },
    };

    const snapshot: ExternalTaxResearchSnapshot = {
      collectionStatus: "complete",
      addressFingerprint: "sha256:94107|123-main-st",
      collectedAt: "2026-07-23T12:00:00.000Z",
      normalizedReferences: [
        {
          id: "external-1",
          topic: "property_tax",
          title: "Official portal",
          url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
        },
      ],
    };

    const merged = mergeResearchSnapshot(scenario, snapshot);
    expect(merged.propertyAddress).toBe("123 Main St");
    expect(merged.monthlyRent).toBe(2500);
    expect(merged.research).toMatchObject({
      notes: "Keep these notes",
      taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
      links: [{ id: "link-1", title: "County map", url: "https://example.gov/map" }],
      externalTaxResearch: snapshot,
    });
  });
});

describe("persistExternalTaxResearchSnapshot", () => {
  const snapshot: ExternalTaxResearchSnapshot = {
    collectionStatus: "complete",
    addressFingerprint: "sha256:94107|123-main-st",
    collectedAt: "2026-07-23T12:00:00.000Z",
    normalizedReferences: [
      {
        id: "external-1",
        topic: "property_tax",
        title: "Official portal",
        url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    txGet.mockResolvedValue({
      exists: true,
      data: () => ({
        scenario: {
          propertyAddress: "123 Main St",
          research: {
            taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
          },
        },
        collaboration: {
          revision: 4,
          updatedAt: "2026-07-23T10:00:00.000Z",
          updatedByUid: "owner-uid",
          editorSessionId: "client-session",
        },
      }),
    });
    runTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({ get: txGet, update: txUpdate });
    });
  });

  it("merges snapshot into scenario without bumping collaboration revision", async () => {
    await persistExternalTaxResearchSnapshot("doc-1", "collector-uid", snapshot);

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    const [_, payload] = txUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).not.toHaveProperty("collaboration");
    expect(payload.scenario).toMatchObject({
      propertyAddress: "123 Main St",
      research: {
        taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
        externalTaxResearch: snapshot,
      },
    });
    expect(typeof payload.updatedAt).toBe("number");
    expect(typeof payload.lastOpenedAt).toBe("number");
  });
});
