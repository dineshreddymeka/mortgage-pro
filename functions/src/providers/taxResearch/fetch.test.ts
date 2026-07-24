import { afterEach, describe, expect, it } from "vitest";
import { extractPageMetadata } from "./extract.js";
import { normalizeAllowedUrl } from "../../taxResearch/allowedUrls.js";
import { safeFetchText, setFetchForTests, resetFetchForTests } from "./fetch.js";

describe("safeFetchText", () => {
  afterEach(() => {
    resetFetchForTests();
  });

  it("rejects non-allowlisted hosts", async () => {
    const result = await safeFetchText("https://evil.example/phish");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("url_not_allowed");
  });

  it("follows redirects when each hop stays on an allowlisted host", async () => {
    let callCount = 0;
    setFetchForTests(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      callCount += 1;
      if (url.startsWith("https://www.irs.gov/start")) {
        return new Response(null, {
          status: 302,
          headers: { Location: "https://www.irs.gov/final" },
        });
      }
      expect(init?.redirect).toBe("manual");
      return new Response("ok", { status: 200 });
    });

    const result = await safeFetchText("https://www.irs.gov/start");
    expect(result.ok).toBe(true);
    expect(result.canonicalUrl).toBe("https://www.irs.gov/final");
    expect(result.redirected).toBe(true);
    expect(result.text).toBe("ok");
    expect(callCount).toBe(2);
  });

  it("rejects redirects to non-allowlisted hosts", async () => {
    setFetchForTests(async (_input, init) => {
      expect(init?.redirect).toBe("manual");
      return new Response(null, {
        status: 302,
        headers: { Location: "https://evil.example/phish" },
      });
    });

    const result = await safeFetchText("https://www.irs.gov/publications/p530");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("redirect_not_allowed");
    expect(result.redirected).toBe(false);
  });

  it("stops after the maximum redirect count", async () => {
    setFetchForTests(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const parsed = new URL(url);
      const hop = Number(parsed.searchParams.get("hop") ?? "0");
      return new Response(null, {
        status: 302,
        headers: { Location: `https://www.irs.gov/chain?hop=${hop + 1}` },
      });
    });

    const result = await safeFetchText("https://www.irs.gov/chain?hop=0", { maxRedirects: 2 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("redirect_limit_exceeded");
  });

  it("enforces response size limits", async () => {
    setFetchForTests(async () => new Response("x".repeat(600_000), { status: 200 }));
    const result = await safeFetchText("https://www.irs.gov/publications/p530", { maxBytes: 1000 });
    expect(result.ok).toBe(true);
    expect(result.text?.length).toBe(1000);
  });
});

describe("extractPageMetadata", () => {
  it("extracts title and description safely", () => {
    const metadata = extractPageMetadata(
      '<html><head><title>IRS Pub 530</title><meta name="description" content="Homeowner tax info." /></head></html>'
    );
    expect(metadata.title).toBe("IRS Pub 530");
    expect(metadata.excerpt).toBe("Homeowner tax info.");
  });
});

describe("normalizeAllowedUrl integration", () => {
  it("allows Census Geocoder and Federal Register hosts", () => {
    expect(normalizeAllowedUrl("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=test")).toBeTruthy();
    expect(normalizeAllowedUrl("https://www.federalregister.gov/api/v1/documents.json")).toBeTruthy();
  });
});
