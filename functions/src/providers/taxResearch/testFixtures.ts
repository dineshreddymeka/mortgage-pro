import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FetchFn } from "./fetch.js";

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

function jsonResponse(body: string, status = 200, finalUrl?: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function htmlResponse(body: string, status = 200, finalUrl?: string): Response {
  const response = new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  if (finalUrl) {
    Object.defineProperty(response, "url", { value: finalUrl });
  }
  return response;
}

/** Deterministic fetch mock for CI — routes official hosts to local fixtures. */
export function createFixtureFetch(overrides: Record<string, Response | (() => Response)> = {}): FetchFn {
  const censusFixture = loadFixture("census-geocoder-ca.json");
  const irsFixture = loadFixture("irs-p530.html");
  const federalRegisterFixture = loadFixture("federal-register-1031.json");
  const statePortalFixture = loadFixture("state-portal-ca.html");
  const countyDirectoryFixture = loadFixture("county-directory-ca.html");

  return async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const override = overrides[url];
    if (override) {
      return typeof override === "function" ? override() : override;
    }

    if (url.includes("geocoding.geo.census.gov/geocoder/geographies/onelineaddress")) {
      return jsonResponse(censusFixture, 200, url);
    }
    if (url.includes("www.federalregister.gov/api/v1/documents.json")) {
      if (url.includes("like-kind")) {
        return jsonResponse(federalRegisterFixture, 200, url);
      }
      return jsonResponse('{"results":[]}', 200, url);
    }
    if (url.includes("www.irs.gov/")) {
      if (init?.method === "HEAD") {
        return new Response(null, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return htmlResponse(irsFixture, 200, url);
    }
    if (url.includes("ftb.ca.gov")) {
      return htmlResponse(statePortalFixture, 200, url);
    }
    if (url.includes("boe.ca.gov/proptaxes/countycontacts.htm")) {
      return htmlResponse(countyDirectoryFixture, 200, url);
    }

    return new Response("not found", { status: 404 });
  };
}
