import { describe, expect, it } from "vitest";
import { buildGoogleMapsUrl } from "./googleMapsLink";

describe("buildGoogleMapsUrl", () => {
  it("uses address and place id when available", () => {
    const url = buildGoogleMapsUrl({
      address: "1600 Amphitheatre Pkwy, Mountain View, CA",
      placeId: "place-123",
      latitude: 37.42,
      longitude: -122.08,
    });
    expect(url).toContain("query=1600+Amphitheatre+Pkwy");
    expect(url).toContain("query_place_id=place-123");
  });

  it("falls back to coordinates for a selected map point", () => {
    expect(buildGoogleMapsUrl({ latitude: 37.42, longitude: -122.08 })).toContain(
      "query=37.42%2C-122.08"
    );
  });

  it("returns null until a location exists", () => {
    expect(buildGoogleMapsUrl({ address: " " })).toBeNull();
  });
});
