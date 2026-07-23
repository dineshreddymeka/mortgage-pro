import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, resetConfigForTests, setConfigForTests } from "../config.js";
import { handleCollectHouseTaxResearch } from "../http/taxResearchHandler.js";
import type { ExternalTaxResearchSnapshot } from "../taxResearch/types.js";

const {
  verifyBearerToken,
  loadPropertyRecord,
  persistExternalTaxResearchSnapshot,
  collect,
} = vi.hoisted(() => ({
  verifyBearerToken: vi.fn(),
  loadPropertyRecord: vi.fn(),
  persistExternalTaxResearchSnapshot: vi.fn(),
  collect: vi.fn(),
}));

vi.mock("../http/auth.js", () => ({
  verifyBearerToken,
}));

vi.mock("../taxResearch/persist.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../taxResearch/persist.js")>();
  return {
    ...actual,
    loadPropertyRecord,
    persistExternalTaxResearchSnapshot,
  };
});

vi.mock("../taxResearch/collector.js", () => ({
  getTaxResearchCollector: () => ({
    id: "test-collector",
    collect,
  }),
}));

const FINGERPRINT = "sha256:94107|123-main-st";

function freshCachedSnapshot(): ExternalTaxResearchSnapshot {
  return {
    collectionStatus: "complete",
    addressFingerprint: FINGERPRINT,
    collectedAt: new Date().toISOString(),
    normalizedReferences: [
      {
        id: "cached-ref",
        topic: "property_tax",
        title: "Cached portal",
        url: "https://www.cdtfa.ca.gov/taxes-and-fees/property-tax.htm",
      },
    ],
  };
}

function mockPropertyData(snapshot?: ExternalTaxResearchSnapshot): Record<string, unknown> {
  return {
    userId: "owner-uid",
    scenario: {
      propertyAddress: "123 Main St",
      propertyPostalCode: "94107",
      research: snapshot
        ? {
            taxIssues: [{ id: "manual-1", topic: "qbi", title: "Saved issue" }],
            externalTaxResearch: snapshot,
          }
        : undefined,
    },
  };
}

function mockResponse() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown;
  return {
    res: {
      status(code: number) {
        statusCode = code;
        return this;
      },
      set(key: string, value: string) {
        headers[key] = value;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
      send() {
        return this;
      },
      end() {
        return this;
      },
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    headers,
  };
}

describe("handleCollectHouseTaxResearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigForTests();
    setConfigForTests(loadConfig({ ALLOWED_ORIGINS: "http://localhost:5173", CACHE_TTL_SECONDS: "21600" }));
    verifyBearerToken.mockResolvedValue({ uid: "owner-uid" });
    loadPropertyRecord.mockResolvedValue({
      exists: true,
      data: mockPropertyData(freshCachedSnapshot()),
    });
    persistExternalTaxResearchSnapshot.mockResolvedValue(undefined);
    collect.mockResolvedValue({
      collectionStatus: "complete",
      addressFingerprint: FINGERPRINT,
      collectedAt: new Date().toISOString(),
      normalizedReferences: [{ id: "fresh-ref", topic: "property_tax", title: "Fresh portal" }],
    });
  });

  it("returns cacheHit for a fresh stored snapshot", async () => {
    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(200);
    expect(mock.body).toMatchObject({ ok: true, cacheHit: true, persisted: false, accessRole: "owner" });
    expect(collect).not.toHaveBeenCalled();
    expect(persistExternalTaxResearchSnapshot).not.toHaveBeenCalled();
  });

  it("bypasses cache when forceRefresh is true", async () => {
    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
          forceRefresh: true,
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(200);
    expect(mock.body).toMatchObject({ ok: true, cacheHit: false, persisted: true });
    expect(collect).toHaveBeenCalledTimes(1);
    expect(persistExternalTaxResearchSnapshot).toHaveBeenCalledTimes(1);
  });

  it("bypasses stale cached snapshots", async () => {
    const staleSnapshot = freshCachedSnapshot();
    staleSnapshot.collectedAt = "2020-01-01T00:00:00.000Z";
    loadPropertyRecord.mockResolvedValue({
      exists: true,
      data: mockPropertyData(staleSnapshot),
    });

    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(200);
    expect(mock.body).toMatchObject({ ok: true, cacheHit: false });
    expect(collect).toHaveBeenCalledTimes(1);
  });

  it("bypasses cached snapshots with mismatched fingerprint", async () => {
    const mismatched = freshCachedSnapshot();
    mismatched.addressFingerprint = "sha256:other-address";
    loadPropertyRecord.mockResolvedValue({
      exists: true,
      data: mockPropertyData(mismatched),
    });

    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(200);
    expect(mock.body).toMatchObject({ ok: true, cacheHit: false });
    expect(collect).toHaveBeenCalledTimes(1);
  });

  it("rejects disallowed origins", async () => {
    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "https://evil.example", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(403);
    expect(mock.body).toMatchObject({ ok: false, error: "Origin not allowed." });
    expect(collect).not.toHaveBeenCalled();
  });

  it("rejects missing authorization", async () => {
    verifyBearerToken.mockResolvedValue(null);
    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(401);
    expect(mock.body).toMatchObject({ ok: false });
    expect(collect).not.toHaveBeenCalled();
  });

  it("rejects viewers without property access", async () => {
    verifyBearerToken.mockResolvedValue({ uid: "stranger-uid" });
    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(403);
    expect(mock.body).toMatchObject({ ok: false, error: "You do not have access to this house." });
    expect(collect).not.toHaveBeenCalled();
  });

  it("returns 409 when request identity does not match saved scenario", async () => {
    loadPropertyRecord.mockResolvedValue({
      exists: true,
      data: {
        userId: "owner-uid",
        scenario: {
          propertyAddress: "999 Other Ave",
          propertyPostalCode: "10001",
        },
      },
    });

    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(409);
    expect(mock.body).toMatchObject({
      ok: false,
      error: "Request address identity does not match the saved property scenario.",
    });
    expect(collect).not.toHaveBeenCalled();
  });

  it("skips server persist when persist is false", async () => {
    loadPropertyRecord.mockResolvedValue({
      exists: true,
      data: mockPropertyData(),
    });

    const mock = mockResponse();
    await handleCollectHouseTaxResearch(
      {
        method: "POST",
        headers: { origin: "http://localhost:5173", authorization: "Bearer token" },
        body: {
          propertyDocId: "doc-1",
          propertyAddress: "123 Main St",
          propertyPostalCode: "94107",
          persist: false,
          forceRefresh: true,
        },
      },
      mock.res
    );

    expect(mock.statusCode).toBe(200);
    expect(mock.body).toMatchObject({ ok: true, persisted: false, cacheHit: false });
    expect(collect).toHaveBeenCalledTimes(1);
    expect(persistExternalTaxResearchSnapshot).not.toHaveBeenCalled();
  });
});
