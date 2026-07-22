import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useRef, useState } from "react";
import { HouseComparisonPanel } from "../components/HouseComparisonBar";
import type { HouseComparisonRow } from "../lib/houseComparison";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";

const COMPARE_SELECTION_KEY = "mortgage-pro:compare-selected-ids";

export type CompareTabProps = {
  /** All house comparison rows available (cloud portfolio and/or local active house). */
  rows: HouseComparisonRow[];
  properties: PropertyMeta[];
  activePropertyId: string | null;
  cloudReady: boolean;
  onSelect: (id: string) => void;
};

function readStoredSelection(): string[] | null {
  try {
    const raw = localStorage.getItem(COMPARE_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
}

function writeStoredSelection(ids: string[]): void {
  try {
    localStorage.setItem(COMPARE_SELECTION_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function CompareTab({
  rows,
  properties,
  activePropertyId,
  cloudReady,
  onSelect,
}: CompareTabProps) {
  const candidateIds = useMemo(() => {
    const fromRows = rows.map((r) => r.id);
    if (fromRows.length > 0) return fromRows;
    return properties.map((p) => p.id);
  }, [rows, properties]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const stored = readStoredSelection();
    if (stored == null) return candidateIds;
    const allowed = new Set(candidateIds);
    const kept = stored.filter((id) => allowed.has(id));
    return kept.length > 0 ? kept : candidateIds;
  });

  const prevCandidatesRef = useRef<string[]>(candidateIds);

  // Prune removed houses; auto-include newly added active houses.
  useEffect(() => {
    const allowed = new Set(candidateIds);
    const prev = new Set(prevCandidatesRef.current);
    const added = candidateIds.filter((id) => !prev.has(id));

    setSelectedIds((current) => {
      let next = current.filter((id) => allowed.has(id));
      if (added.length > 0) next = [...next, ...added];
      if (next.length === 0 && candidateIds.length > 0) next = [...candidateIds];
      const unchanged =
        next.length === current.length && next.every((id, i) => id === current[i]);
      if (!unchanged) writeStoredSelection(next);
      return unchanged ? current : next;
    });

    prevCandidatesRef.current = candidateIds;
  }, [candidateIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedSet.has(r.id)).sort((a, b) => a.houseNumber - b.houseNumber),
    [rows, selectedSet]
  );

  const labelFor = (id: string) => {
    const fromProp = properties.find((p) => p.id === id);
    if (fromProp?.name?.trim()) return fromProp.name.trim();
    if (fromProp) return houseLabel(fromProp.houseId);
    const fromRow = rows.find((r) => r.id === id);
    return fromRow?.label ?? "House";
  };

  function setSelection(next: string[]) {
    const allowed = new Set(candidateIds);
    const cleaned = next.filter((id) => allowed.has(id));
    setSelectedIds(cleaned);
    writeStoredSelection(cleaned);
  }

  function toggleId(id: string) {
    if (selectedSet.has(id)) setSelection(selectedIds.filter((x) => x !== id));
    else setSelection([...selectedIds, id]);
  }

  if (candidateIds.length === 0 || rows.length === 0) {
    return (
      <Box className="pp-fade-in" sx={{ py: 3, px: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.03em", mb: 0.5 }}>
          Compare houses
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, lineHeight: 1.45 }}>
          {cloudReady
            ? "Add an active house from the portfolio to compare. Archived houses stay out of this view."
            : "No house data to compare yet. Enter values on Mortgage, or connect Firestore to sync a multi-house portfolio."}
        </Typography>
      </Box>
    );
  }

  const allSelected = candidateIds.length > 0 && candidateIds.every((id) => selectedSet.has(id));
  const multiHouse = candidateIds.length > 1;

  return (
    <Box className="pp-fade-in" sx={{ pt: 0.25 }}>
      <Stack spacing={1.25} sx={{ mb: 1.5 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "baseline" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Compare tab
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "1.02rem", letterSpacing: "-0.03em" }}>
              {multiHouse
                ? `Compare ${selectedRows.length} of ${candidateIds.length} houses`
                : selectedRows[0]?.label ?? "House metrics"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {multiHouse
                ? "Toggle houses below · tap a column header to open that house"
                : "Side-by-side metrics for your active house. Add more houses in the portfolio to compare."}
            </Typography>
          </Box>
          {multiHouse ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                disabled={allSelected}
                onClick={() => setSelection(candidateIds)}
                sx={{ minHeight: 30, fontWeight: 700, fontSize: "0.75rem" }}
              >
                Select all
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={selectedIds.length === 0}
                onClick={() => setSelection([])}
                sx={{ minHeight: 30, fontWeight: 700, fontSize: "0.75rem" }}
              >
                Clear
              </Button>
            </Stack>
          ) : null}
        </Stack>

        {!cloudReady ? (
          <Alert severity="info" variant="outlined" sx={{ py: 0.35, px: 1.1 }}>
            <Typography variant="caption" component="div" sx={{ lineHeight: 1.4 }}>
              Showing the current house from this browser. Connect Firestore (portfolio sync) to add
              more houses and pick which ones to compare.
            </Typography>
          </Alert>
        ) : null}

        {multiHouse ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
            {candidateIds.map((id) => {
              const checked = selectedSet.has(id);
              const active = id === activePropertyId;
              return (
                <Chip
                  key={id}
                  clickable
                  color={checked ? "secondary" : "default"}
                  variant={checked ? "filled" : "outlined"}
                  onClick={() => toggleId(id)}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.35}>
                      <Checkbox
                        size="small"
                        checked={checked}
                        tabIndex={-1}
                        disableRipple
                        sx={{
                          p: 0.1,
                          color: "inherit",
                          "&.Mui-checked": { color: "inherit" },
                        }}
                      />
                      <span>{labelFor(id)}</span>
                      {active ? (
                        <Typography
                          component="span"
                          sx={{ fontSize: "0.62rem", fontWeight: 700, opacity: 0.85 }}
                        >
                          · active
                        </Typography>
                      ) : null}
                    </Stack>
                  }
                  sx={{
                    height: 36,
                    borderRadius: "10px",
                    fontWeight: 700,
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              );
            })}
          </Stack>
        ) : null}
      </Stack>

      {selectedRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, maxWidth: 420, lineHeight: 1.45 }}>
          Select one or more houses above to build the comparison table.
        </Typography>
      ) : (
        <HouseComparisonPanel
          rows={selectedRows}
          activePropertyId={activePropertyId}
          onSelect={onSelect}
        />
      )}
    </Box>
  );
}
