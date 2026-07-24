import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { HouseComparisonPanel } from "../components/HouseComparisonBar";
import { shellActionTargetSx } from "../components/workspaceShell";
import { minOperationalFontPx } from "../layout/formLayout";
import { computeStressTestComparison } from "../lib/stressTestMath";
import type { HouseComparisonRow } from "../lib/houseComparison";
import type { AppPersisted } from "../storage/mortgageState";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";
import {
  bootstrapCompareSelection,
  filterSelectedRows,
  reconcileCompareSelection,
  toggleCompareId,
  writeCompareSelection,
} from "./compareSelection";

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const opFont = `${minOperationalFontPx}px`;

export type CompareTabProps = {
  /** All house comparison rows available (cloud portfolio and/or local active house). */
  rows: HouseComparisonRow[];
  properties: PropertyMeta[];
  activePropertyId: string | null;
  activeState?: AppPersisted;
  cloudReady: boolean;
  onSelect: (id: string) => void;
};

export function CompareTab({
  rows,
  properties,
  activePropertyId,
  activeState,
  cloudReady,
  onSelect,
}: CompareTabProps) {
  const menuId = useId();
  const listboxId = useId();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const candidateIds = useMemo(() => {
    const fromRows = rows.map((r) => r.id);
    if (fromRows.length > 0) return fromRows;
    return properties.map((p) => p.id);
  }, [rows, properties]);

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    bootstrapCompareSelection(candidateIds)
  );

  const prevCandidatesRef = useRef<string[]>(candidateIds);

  // Prune removed houses; auto-include newly added when selection is non-empty.
  useEffect(() => {
    setSelectedIds((current) => {
      const next = reconcileCompareSelection({
        current,
        candidateIds,
        prevCandidateIds: prevCandidatesRef.current,
      });
      const unchanged =
        next.length === current.length && next.every((id, i) => id === current[i]);
      if (!unchanged) writeCompareSelection(next);
      return unchanged ? current : next;
    });
    prevCandidatesRef.current = candidateIds;
  }, [candidateIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedRows = useMemo(
    () => filterSelectedRows(rows, selectedIds),
    [rows, selectedIds]
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
    writeCompareSelection(cleaned);
  }

  function toggleId(id: string) {
    setSelection(toggleCompareId(selectedIds, id));
  }

  const activeStress = useMemo(() => {
    if (!activeState?.stressTestDeltas) return null;
    const hasDelta = Object.values(activeState.stressTestDeltas).some((v) => v !== 0);
    if (!hasDelta || activeState.homePrice <= 0) return null;
    return computeStressTestComparison(activeState, activeState.stressTestDeltas);
  }, [activeState]);

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
  const menuOpen = Boolean(menuAnchor);

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
                fontSize: opFont,
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.25, fontSize: opFont }}
            >
              {multiHouse
                ? "Choose houses in the menu · open a house from its column header button"
                : "Side-by-side metrics for your active house. Add more houses in the portfolio to compare."}
            </Typography>
          </Box>
          {multiHouse ? (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
              <Button
                size="small"
                variant="outlined"
                endIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                onClick={(event: MouseEvent<HTMLElement>) => setMenuAnchor(event.currentTarget)}
                aria-haspopup="listbox"
                aria-expanded={menuOpen ? "true" : undefined}
                aria-controls={menuOpen ? listboxId : undefined}
                aria-label="Choose houses to compare"
                sx={{ ...shellActionTargetSx, fontWeight: 700, fontSize: opFont }}
              >
                Houses ({selectedIds.length}/{candidateIds.length})
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={allSelected}
                onClick={() => setSelection(candidateIds)}
                sx={{ ...shellActionTargetSx, fontWeight: 700, fontSize: opFont }}
              >
                Select all
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={selectedIds.length === 0}
                onClick={() => setSelection([])}
                sx={{ ...shellActionTargetSx, fontWeight: 700, fontSize: opFont }}
              >
                Clear
              </Button>
              <Menu
                id={menuId}
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => setMenuAnchor(null)}
                MenuListProps={{
                  id: listboxId,
                  role: "listbox",
                  "aria-label": "Houses to compare",
                  "aria-multiselectable": "true",
                  dense: true,
                }}
              >
                {candidateIds.map((id) => {
                  const checked = selectedSet.has(id);
                  const active = id === activePropertyId;
                  return (
                    <MenuItem
                      key={id}
                      role="option"
                      aria-selected={checked}
                      selected={checked}
                      onClick={() => toggleId(id)}
                      sx={shellActionTargetSx}
                    >
                      <ListItemIcon sx={{ minWidth: 34 }}>
                        {checked ? (
                          <CheckBoxIcon fontSize="small" color="secondary" />
                        ) : (
                          <CheckBoxOutlineBlankIcon fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={labelFor(id)}
                        secondary={active ? "Active house" : undefined}
                        primaryTypographyProps={{ fontWeight: 650, fontSize: opFont }}
                        secondaryTypographyProps={{ fontSize: opFont }}
                      />
                    </MenuItem>
                  );
                })}
              </Menu>
            </Stack>
          ) : null}
        </Stack>

        {!cloudReady ? (
          <Alert severity="info" variant="outlined" sx={{ py: 0.35, px: 1.1 }}>
            <Typography variant="caption" component="div" sx={{ lineHeight: 1.4, fontSize: opFont }}>
              Showing the current house from this browser. Connect Firestore (portfolio sync) to add
              more houses and pick which ones to compare.
            </Typography>
          </Alert>
        ) : null}
      </Stack>

      {activeStress ? (
        <Alert severity="warning" variant="outlined" sx={{ mb: 1.25, borderRadius: 1.5 }}>
          Active house stress test: payment {money0.format(activeStress.baseline.paymentMonthly)} →{" "}
          {money0.format(activeStress.stressed.paymentMonthly)} · cash flow{" "}
          {money0.format(activeStress.baseline.cashFlowMonthly)} →{" "}
          {money0.format(activeStress.stressed.cashFlowMonthly)} (edit deltas on Rental tab)
        </Alert>
      ) : null}

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
