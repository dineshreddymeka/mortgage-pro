import AddHomeOutlinedIcon from "@mui/icons-material/AddHomeOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";
import type { CloudSyncStatus } from "../hooks/useMortgageSyncedState";
import type { HouseComparisonRow } from "../lib/houseComparison";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";
import { minOperationalFontPx } from "../layout/formLayout";
import {
  APP_HEADER_HEIGHT_PX,
  shellActionTargetSx,
  shellIconActionTargetSx,
} from "./workspaceShell";

const NAV_COLLAPSED_KEY = "mortgage-pro:house-nav-collapsed";
const opFont = `${minOperationalFontPx}px`;

export type HouseNavBarProps = {
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  properties: PropertyMeta[];
  archivedProperties: PropertyMeta[];
  comparisons: HouseComparisonRow[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
};

const money0 = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function CloudIcon({ status }: { status: CloudSyncStatus }) {
  if (status === "ready") return <CloudDoneOutlinedIcon sx={{ fontSize: 15 }} />;
  if (status === "connecting") return <CloudQueueOutlinedIcon sx={{ fontSize: 15 }} />;
  return <CloudOffOutlinedIcon sx={{ fontSize: 15 }} />;
}

function readCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(NAV_COLLAPSED_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
    // First visit: collapse on phones so content isn't pushed down.
    return typeof window !== "undefined" && window.matchMedia("(max-width: 899.95px)").matches;
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function HouseNavBar({
  cloudStatus,
  cloudError,
  properties,
  archivedProperties,
  comparisons,
  activePropertyId,
  onSelect,
  onCreate,
  onArchive,
  onRestore,
}: HouseNavBarProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    writeCollapsed(collapsed);
  }, [collapsed]);

  const statusTitle =
    cloudStatus === "ready"
      ? "Portfolio synced to Firestore"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore…"
        : (cloudError ?? "Firestore unavailable — house list needs cloud sync");

  const sorted = [...properties].sort((a, b) => a.houseNumber - b.houseNumber);
  const sortedArchived = [...archivedProperties].sort((a, b) => a.houseNumber - b.houseNumber);
  const byId = new Map(comparisons.map((c) => [c.id, c]));
  const active = sorted.find((p) => p.id === activePropertyId) ?? sorted[0] ?? null;

  const toggleCollapsed = () => setCollapsed((c) => !c);

  return (
    <Box
      component="nav"
      aria-label="House navigation"
      className="pp-fade-in"
      sx={{
        width: {
          xs: "100%",
          md: collapsed ? 64 : 248,
        },
        flexShrink: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "column" },
        borderRight: { xs: "none", md: "1px solid" },
        borderBottom: { xs: "1px solid", md: "none" },
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.97) : alpha("#1A2129", 0.96),
        position: { md: "sticky" },
        top: { md: APP_HEADER_HEIGHT_PX },
        alignSelf: { md: "flex-start" },
        maxHeight: { md: `calc(100dvh - ${APP_HEADER_HEIGHT_PX}px)` },
        minHeight: { md: `calc(100dvh - ${APP_HEADER_HEIGHT_PX}px)` },
        transition: "width 180ms ease",
      }}
    >
      {/* Header / collapse control — always visible */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={collapsed ? "center" : "space-between"}
        spacing={0.5}
        sx={{
          flexShrink: 0,
          px: collapsed ? 0.5 : 1.25,
          pt: { xs: 0.85, md: 1.15 },
          pb: { xs: collapsed ? 0.85 : 0.35, md: 0.5 },
          gap: 0.5,
        }}
      >
        {!collapsed ? (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: opFont,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Portfolio
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", letterSpacing: "-0.03em" }}>
              Houses
            </Typography>
          </Box>
        ) : null}

        <Stack direction="row" alignItems="center" spacing={0.15}>
          {!collapsed ? (
            <Tooltip title={statusTitle}>
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  color: cloudStatus === "ready" ? "primary.main" : "text.secondary",
                  mr: 0.25,
                }}
                aria-label={statusTitle}
              >
                <CloudIcon status={cloudStatus} />
              </Box>
            </Tooltip>
          ) : null}
          <Tooltip title={collapsed ? "Expand portfolio" : "Collapse portfolio"}>
            <IconButton
              size="small"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand portfolio navigation" : "Collapse portfolio navigation"}
              aria-expanded={!collapsed}
              sx={{
                ...shellIconActionTargetSx,
                color: "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "8px",
              }}
            >
              {/* Desktop: chevrons; mobile collapsed uses expand-more metaphor via same icons */}
              <Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
                {collapsed ? <ChevronRightIcon sx={{ fontSize: 18 }} /> : <ChevronLeftIcon sx={{ fontSize: 18 }} />}
              </Box>
              <Box sx={{ display: { xs: "inline-flex", md: "none" } }}>
                {collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />}
              </Box>
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Compact mobile portfolio summary (one line) */}
      {collapsed ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.65}
          sx={{
            display: { xs: "flex", md: "none" },
            px: 1.25,
            pb: 0.7,
            minHeight: 36,
            overflowX: "auto",
            scrollbarWidth: "thin",
            whiteSpace: "nowrap",
          }}
        >
          <Tooltip title={statusTitle}>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                color: cloudStatus === "ready" ? "primary.main" : "text.secondary",
                flexShrink: 0,
              }}
              aria-label={statusTitle}
            >
              <CloudIcon status={cloudStatus} />
            </Box>
          </Tooltip>
          {active ? (
            <Button
              size="small"
              variant="text"
              onClick={toggleCollapsed}
              aria-label={`Expand portfolio — ${active.name || houseLabel(active.houseId)}`}
              sx={{
                ...shellActionTargetSx,
                px: 0.5,
                fontWeight: 700,
                fontSize: opFont,
                letterSpacing: "-0.02em",
                flexShrink: 1,
                minWidth: 0,
                justifyContent: "flex-start",
                color: "text.primary",
              }}
            >
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {active.houseId} · {active.name || houseLabel(active.houseId)}
              </Box>
            </Button>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flexShrink: 0, fontSize: opFont }}
            >
              Portfolio hidden
            </Typography>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flexShrink: 0, fontSize: opFont, fontWeight: 650 }}
          >
            {sorted.length} active
            {sortedArchived.length > 0 ? ` · ${sortedArchived.length} archived` : ""}
          </Typography>
        </Stack>
      ) : null}

      {/* Desktop collapsed rail */}
      {collapsed ? (
        <Stack
          alignItems="center"
          spacing={0.6}
          sx={{
            display: { xs: "none", md: "flex" },
            px: 0.65,
            py: 0.5,
            flex: 1,
            overflowY: "auto",
            scrollbarWidth: "thin",
          }}
        >
          <Tooltip title={statusTitle} placement="right">
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                color: cloudStatus === "ready" ? "primary.main" : "text.secondary",
                mb: 0.25,
              }}
            >
              <CloudIcon status={cloudStatus} />
            </Box>
          </Tooltip>

          {sorted.map((p) => {
            const selected = p.id === activePropertyId;
            const label = p.name || houseLabel(p.houseId);
            return (
              <Tooltip key={p.id} title={label} placement="right">
                <IconButton
                  size="small"
                  onClick={() => onSelect(p.id)}
                  aria-label={label}
                  aria-current={selected ? "page" : undefined}
                  sx={{
                    ...shellIconActionTargetSx,
                    width: 40,
                    borderRadius: "10px",
                    fontFamily: "var(--pp-font-mono)",
                    fontWeight: 700,
                    fontSize: opFont,
                    border: "1px solid",
                    borderColor: selected ? "primary.main" : "divider",
                    bgcolor: selected
                      ? (t) => alpha(t.palette.primary.main, 0.12)
                      : "transparent",
                    color: selected ? "primary.main" : "text.primary",
                  }}
                >
                  {p.houseId}
                </IconButton>
              </Tooltip>
            );
          })}

          {cloudStatus === "ready" ? (
            <Tooltip title="Add house" placement="right">
              <IconButton
                size="small"
                onClick={onCreate}
                aria-label="Add house"
                sx={{
                  ...shellIconActionTargetSx,
                  mt: "auto",
                  width: 40,
                  borderRadius: "10px",
                  border: "1px dashed",
                  borderColor: "divider",
                  color: "text.secondary",
                }}
              >
                <AddHomeOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ) : null}

      {/* Expanded body */}
      <Collapse in={!collapsed} timeout={180}>
        <Stack
          direction={{ xs: "row", md: "column" }}
          sx={{
            width: "100%",
            px: { xs: 1, md: 1.25 },
            py: { xs: 0.85, md: 0.75 },
            gap: { xs: 0.75, md: 1 },
            overflowX: { xs: "auto", md: "visible" },
            overflowY: { md: "auto" },
            scrollbarWidth: "thin",
            maxHeight: { md: "calc(100dvh - 120px)" },
          }}
        >
          {cloudStatus === "ready" && sorted.length > 0 ? (
            <List
              disablePadding
              sx={{
                display: "flex",
                flexDirection: { xs: "row", md: "column" },
                gap: 0.5,
                flex: { md: 1 },
                py: 0,
              }}
            >
              {sorted.map((p) => {
                const selected = p.id === activePropertyId;
                const metrics = byId.get(p.id);
                const cf = metrics?.cashFlowMonthly ?? 0;
                return (
                  <ListItemButton
                    key={p.id}
                    selected={selected}
                    onClick={() => onSelect(p.id)}
                    aria-current={selected ? "page" : undefined}
                    sx={{
                      borderRadius: "12px",
                      minHeight: { xs: 52, md: 64 },
                      px: 1,
                      py: 0.75,
                      flexShrink: 0,
                      minWidth: { xs: 148, md: "auto" },
                      maxWidth: { xs: 200, md: "none" },
                      alignItems: "flex-start",
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "divider",
                      bgcolor: selected
                        ? (t) => alpha(t.palette.primary.main, 0.08)
                        : "transparent",
                      "&.Mui-selected": {
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                        "&:hover": {
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.14),
                        },
                      },
                    }}
                  >
                    <Stack spacing={0.35} sx={{ width: "100%", minWidth: 0 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Box
                          sx={{
                            minWidth: 36,
                            height: 28,
                            px: 0.5,
                            borderRadius: "8px",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700,
                            fontSize: opFont,
                            fontFamily: "var(--pp-font-mono)",
                            bgcolor: selected ? "primary.main" : alpha("#2A2A33", 0.08),
                            color: selected ? "primary.contrastText" : "text.primary",
                          }}
                        >
                          {p.houseId}
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.8125rem",
                            letterSpacing: "-0.03em",
                            flex: 1,
                            minWidth: 0,
                          }}
                          noWrap
                        >
                        {p.name || houseLabel(p.houseId)}
                      </Typography>
                      {p.accessRole === "member" ? (
                        <Chip size="small" label="Member" variant="outlined" sx={{ height: 22 }} />
                      ) : (
                      <Tooltip title={`Archive ${p.name || houseLabel(p.houseId)}`}>
                        <IconButton
                          size="small"
                          aria-label={`Archive ${p.name || houseLabel(p.houseId)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(p.id);
                          }}
                            sx={{
                              ...shellIconActionTargetSx,
                              mt: -0.25,
                              color: "text.secondary",
                              "&:hover": { color: "warning.main" },
                            }}
                          >
                            <ArchiveOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography
                          className="pp-mono"
                          sx={{ fontSize: opFont, color: "text.secondary" }}
                        >
                          {money0.format(metrics?.paymentMonthly ?? 0)}/mo
                        </Typography>
                        <Typography
                          className="pp-mono"
                          sx={{
                            fontSize: opFont,
                            fontWeight: 650,
                            color:
                              cf > 0 ? "success.main" : cf < 0 ? "error.main" : "text.secondary",
                          }}
                        >
                          CF {money0.format(cf)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </ListItemButton>
                );
              })}
            </List>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 0.5, py: 1, fontSize: "0.75rem", lineHeight: 1.35 }}
            >
              {cloudStatus === "connecting"
                ? "Loading portfolio…"
                : cloudStatus === "ready"
                  ? "No active houses — add one or restore from archive"
                  : "Connect Firestore to manage houses"}
            </Typography>
          )}

          {cloudStatus === "ready" && sortedArchived.length > 0 ? (
            <Box sx={{ flexShrink: 0, minWidth: { xs: 180, md: "100%" } }}>
              <Button
                size="small"
                fullWidth
                onClick={() => setArchivedOpen((o) => !o)}
                endIcon={archivedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                aria-expanded={archivedOpen}
                aria-controls="archived-houses-list"
                sx={{
                  ...shellActionTargetSx,
                  justifyContent: "space-between",
                  px: 0.75,
                  color: "text.secondary",
                  fontSize: opFont,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Archived ({sortedArchived.length})
              </Button>
              <Collapse in={archivedOpen} id="archived-houses-list">
                <List
                  disablePadding
                  sx={{ display: "flex", flexDirection: "column", gap: 0.4, mt: 0.35 }}
                >
                  {sortedArchived.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 0.75,
                        py: 0.55,
                        borderRadius: "10px",
                        border: "1px dashed",
                        borderColor: "divider",
                        opacity: 0.92,
                      }}
                    >
                      <Box
                        sx={{
                          minWidth: 32,
                          height: 24,
                          px: 0.4,
                          borderRadius: "6px",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: opFont,
                          fontFamily: "var(--pp-font-mono)",
                          bgcolor: alpha("#006AFF", 0.06),
                          color: "text.secondary",
                        }}
                      >
                        {p.houseId}
                      </Box>
                      <Typography
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 650,
                          fontSize: opFont,
                          color: "text.secondary",
                        }}
                        noWrap
                      >
                      {p.name || houseLabel(p.houseId)}
                    </Typography>
                    <Tooltip title={`Restore ${p.name || houseLabel(p.houseId)}`}>
                      <IconButton
                        size="small"
                        aria-label={`Restore ${p.name || houseLabel(p.houseId)}`}
                        onClick={() => onRestore(p.id)}
                        sx={{ ...shellIconActionTargetSx, color: "primary.main" }}
                      >
                          <UnarchiveOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </List>
              </Collapse>
            </Box>
          ) : null}

          {cloudStatus === "ready" ? (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<AddHomeOutlinedIcon sx={{ fontSize: 17 }} />}
              onClick={onCreate}
              aria-label="Add house"
              sx={{
                ...shellActionTargetSx,
                mt: { md: "auto" },
                flexShrink: 0,
                minWidth: { xs: 140, md: "auto" },
                justifyContent: "flex-start",
                borderStyle: "dashed",
                fontSize: opFont,
                fontWeight: 700,
              }}
            >
              Add house
            </Button>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}
