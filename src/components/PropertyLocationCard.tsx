import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useRef, useState } from "react";
import type { AppPersisted } from "../storage/mortgageState";

export type PropertyLocationCardProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

const PLACE_FIELDS = ["formattedAddress", "location", "id", "addressComponents"] as const;
const MAP_ZOOM = 15;
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const MAP_COLLAPSED_KEY = "mortgage-pro:property-map-collapsed";

function readMapCollapsed(): boolean {
  try {
    return localStorage.getItem(MAP_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMapCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(MAP_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

let mapsOptionsConfigured = false;

function getMapsApiKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof raw === "string" ? raw.trim() : "";
}

/** Configure loader once; weekly channel for Places API (New) widgets. */
function ensureMapsOptions(key: string): void {
  if (mapsOptionsConfigured) return;
  setOptions({ key, v: "weekly" });
  mapsOptionsConfigured = true;
}

function toLatLng(lat: number | null, lng: number | null): google.maps.LatLngLiteral | null {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  return { lat, lng };
}

export function PropertyLocationCard({ state, patch }: PropertyLocationCardProps) {
  const apiKey = getMapsApiKey();
  const hasKey = apiKey.length > 0;

  const widgetHostRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const placeAutocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const initialCoordsRef = useRef(toLatLng(state.propertyLatitude, state.propertyLongitude));
  const initialAddressRef = useRef(state.propertyAddress ?? "");

  const [mapsStatus, setMapsStatus] = useState<"idle" | "loading" | "ready" | "error">(
    hasKey ? "loading" : "idle"
  );
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(readMapCollapsed);

  const address = state.propertyAddress ?? "";
  const lat = state.propertyLatitude;
  const lng = state.propertyLongitude;
  const coords = toLatLng(lat, lng);
  const showMap = hasKey && coords !== null;
  const showManualField = !hasKey || mapsStatus === "error";

  useEffect(() => {
    writeMapCollapsed(mapCollapsed);
  }, [mapCollapsed]);

  // Maps needs a resize/recenter after the panel or parent widget opens.
  useEffect(() => {
    if (mapCollapsed || mapsStatus !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const position = toLatLng(lat, lng) ?? initialCoordsRef.current ?? DEFAULT_CENTER;
    const refresh = () => {
      if (typeof google !== "undefined" && google.maps?.event) {
        google.maps.event.trigger(map, "resize");
      }
      map.setCenter(position);
      if (toLatLng(lat, lng)) map.setZoom(MAP_ZOOM);
    };
    const handle = window.setTimeout(refresh, 200);
    const el = mapContainerRef.current;
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (el.offsetHeight > 0) refresh();
      });
      ro.observe(el);
    }
    return () => {
      window.clearTimeout(handle);
      ro?.disconnect();
    };
  }, [mapCollapsed, mapsStatus, lat, lng]);

  useEffect(() => {
    if (!hasKey) {
      setMapsStatus("idle");
      setMapsError(null);
      return;
    }

    let cancelled = false;
    let placeAutocomplete: google.maps.places.PlaceAutocompleteElement | null = null;

    const onSelect = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      try {
        const place = selectEvent.placePrediction.toPlace();
        await place.fetchFields({ fields: [...PLACE_FIELDS] });
        if (cancelled) return;

        const location = place.location;
        const nextAddress = place.formattedAddress?.trim() || placeAutocomplete?.value?.trim() || "";
        const placeId = place.id ?? "";

        if (!location) {
          patchRef.current({
            propertyAddress: nextAddress,
            propertyPlaceId: placeId,
            propertyLatitude: null,
            propertyLongitude: null,
          });
          return;
        }

        patchRef.current({
          propertyAddress: nextAddress,
          propertyPlaceId: placeId,
          propertyLatitude: location.lat(),
          propertyLongitude: location.lng(),
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load place details.";
        setMapsError(message);
      }
    };

    async function initMaps() {
      setMapsStatus("loading");
      setMapsError(null);
      try {
        ensureMapsOptions(apiKey);
        const [{ Map }, placesLib] = await Promise.all([
          importLibrary("maps"),
          importLibrary("places"),
        ]);

        if (cancelled) return;

        const { PlaceAutocompleteElement } = placesLib;
        const host = widgetHostRef.current;
        if (!host) {
          throw new Error("Address widget host is not ready.");
        }

        placeAutocomplete = new PlaceAutocompleteElement({
          placeholder: "Street, city, state",
        });
        placeAutocomplete.style.width = "100%";
        const seedAddress = initialAddressRef.current.trim();
        if (seedAddress) {
          placeAutocomplete.value = seedAddress;
        }
        placeAutocomplete.addEventListener("gmp-select", onSelect);
        host.replaceChildren(placeAutocomplete);
        placeAutocompleteRef.current = placeAutocomplete;

        const mapEl = mapContainerRef.current;
        if (mapEl && !mapRef.current) {
          const initial = initialCoordsRef.current;
          const center = initial ?? DEFAULT_CENTER;
          const map = new Map(mapEl, {
            center,
            zoom: initial ? MAP_ZOOM : 3,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
          });
          mapRef.current = map;

          // Marker is available after the maps library loads.
          if (typeof google !== "undefined" && google.maps?.Marker) {
            markerRef.current = new google.maps.Marker({
              map,
              position: center,
              visible: initial !== null,
            });
          }
        }

        if (!cancelled) setMapsStatus("ready");
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load Google Maps.";
        setMapsError(message);
        setMapsStatus("error");
      }
    }

    void initMaps();

    return () => {
      cancelled = true;
      if (placeAutocomplete) {
        placeAutocomplete.removeEventListener("gmp-select", onSelect);
        placeAutocomplete.remove();
        placeAutocomplete = null;
      }
      placeAutocompleteRef.current = null;
      const host = widgetHostRef.current;
      if (host) host.replaceChildren();
    };
  }, [apiKey, hasKey]);

  useEffect(() => {
    if (mapsStatus !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    const position = toLatLng(lat, lng);
    if (!position) {
      markerRef.current?.setVisible(false);
      return;
    }
    map.setCenter(position);
    map.setZoom(MAP_ZOOM);
    if (markerRef.current) {
      markerRef.current.setPosition(position);
      markerRef.current.setVisible(true);
    } else if (typeof google !== "undefined" && google.maps?.Marker) {
      markerRef.current = new google.maps.Marker({ map, position });
    }
  }, [lat, lng, mapsStatus]);

  // Keep widget value in sync when scenario address changes elsewhere (import/reset).
  useEffect(() => {
    const el = placeAutocompleteRef.current;
    if (!el || mapsStatus !== "ready") return;
    if (el.value !== address) {
      el.value = address;
    }
  }, [address, mapsStatus]);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 1.75,
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#fff", 0.88) : alpha(t.palette.background.paper, 0.88),
        "& gmp-place-autocomplete": {
          width: "100%",
          colorScheme: (t) => (t.palette.mode === "dark" ? "dark" : "light"),
          "--gmp-mat-color-surface": (t) =>
            t.palette.mode === "light" ? alpha("#787880", 0.08) : alpha("#787880", 0.24),
          "--gmp-mat-color-on-surface": (t) => t.palette.text.primary,
          "--gmp-mat-color-outline": "transparent",
          borderRadius: "10px",
          fontFamily: "inherit",
          fontSize: "0.875rem",
        },
      }}
    >
      <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1.25 } }}>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontSize: "0.8125rem", letterSpacing: "-0.015em" }}>
              Property location
            </Typography>
            {hasKey && mapsStatus === "loading" ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CircularProgress size={14} thickness={5} color="secondary" />
                <Typography variant="caption" color="text.secondary">
                  Loading Maps…
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          {showManualField ? (
            <TextField
              label="Address"
              value={address}
              size="small"
              fullWidth
              placeholder="Street, city, state"
              autoComplete="off"
              onChange={(e) => {
                const next = e.target.value;
                if (coords !== null || state.propertyPlaceId) {
                  patch({
                    propertyAddress: next,
                    propertyPlaceId: "",
                    propertyLatitude: null,
                    propertyLongitude: null,
                  });
                } else {
                  patch({ propertyAddress: next });
                }
              }}
            />
          ) : (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.35, fontWeight: 500 }}
              >
                Address
              </Typography>
              <Box
                ref={widgetHostRef}
                sx={{
                  minHeight: 40,
                  width: "100%",
                  "&:empty": {
                    borderRadius: "10px",
                    bgcolor: (t) =>
                      t.palette.mode === "light" ? alpha("#787880", 0.08) : alpha("#787880", 0.24),
                  },
                }}
              />
              {mapsStatus === "ready" ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                  Pick a suggestion to set map location
                </Typography>
              ) : null}
            </Box>
          )}

          {!hasKey ? (
            <Alert severity="info" variant="outlined" sx={{ py: 0.25, px: 1 }}>
              <Typography variant="caption" component="div" sx={{ lineHeight: 1.35 }}>
                Set <code>VITE_GOOGLE_MAPS_API_KEY</code> for address autocomplete and map preview.
                You can still type an address manually.
              </Typography>
            </Alert>
          ) : null}

          {hasKey && mapsStatus === "error" && mapsError ? (
            <Alert severity="warning" variant="outlined" sx={{ py: 0.25, px: 1 }}>
              <Typography variant="caption" component="div" sx={{ lineHeight: 1.35 }}>
                Maps unavailable: {mapsError}. Address can still be entered manually.
              </Typography>
            </Alert>
          ) : null}

          {hasKey ? (
            <Box>
              <Button
                size="small"
                fullWidth
                onClick={() => setMapCollapsed((c) => !c)}
                startIcon={<MapOutlinedIcon sx={{ fontSize: 16 }} />}
                endIcon={mapCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                aria-expanded={!mapCollapsed}
                aria-controls="property-map-panel"
                sx={{
                  justifyContent: "space-between",
                  minHeight: 34,
                  px: 0.85,
                  color: "text.secondary",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "10px",
                }}
              >
                {mapCollapsed
                  ? showMap
                    ? "Show map"
                    : "Map preview"
                  : "Hide map"}
              </Button>

              <Collapse in={!mapCollapsed} timeout={200} id="property-map-panel">
                <Box
                  ref={mapContainerRef}
                  sx={{
                    mt: 0.85,
                    height: { xs: 180, md: 200 },
                    width: "100%",
                    borderRadius: 1.25,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                    display:
                      showMap || mapsStatus === "ready" || mapsStatus === "loading"
                        ? "block"
                        : "none",
                    position: "relative",
                  }}
                  aria-hidden={!showMap}
                >
                  {mapsStatus === "ready" && !showMap ? (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        px: 2,
                        pointerEvents: "none",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" align="center">
                        Select an address to preview the map
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              </Collapse>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
