export type GoogleMapsLinkInput = {
  address?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Build a shareable Google Maps search URL without requiring the Maps SDK. */
export function buildGoogleMapsUrl({
  address,
  placeId,
  latitude,
  longitude,
}: GoogleMapsLinkInput): string | null {
  const cleanAddress = address?.trim() ?? "";
  const hasCoords =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);
  const query = cleanAddress || (hasCoords ? `${latitude},${longitude}` : "");
  if (!query) return null;

  const params = new URLSearchParams({ api: "1", query });
  const cleanPlaceId = placeId?.trim();
  if (cleanPlaceId) params.set("query_place_id", cleanPlaceId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
