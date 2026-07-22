import AddHomeOutlinedIcon from "@mui/icons-material/AddHomeOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import type { CloudSyncStatus } from "../hooks/useMortgageSyncedState";
import type { HouseComparisonRow } from "../lib/houseComparison";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";

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

  const statusTitle =
    cloudStatus === "ready"
      ? "Portfolio synced to Firestore"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore…"
        : (cloudError ?? "Firestore unavailable — house list needs cloud sync");

  const sorted = [...properties].sort((a, b) => a.houseNumber - b.houseNumber);
  const sortedArchived = [...archivedProperties].sort((a, b) => a.houseNumber - b.houseNumber);
  const byId = new Map(comparisons.map((c) => [c.id, c]));

  return (
    <Box
      component="nav"
      aria-label="House navigation"
      className="pp-fade-in"
      sx={{
        width: { xs: "100%", md: 248 },
        flexShrink: 0,
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        borderRight: { xs: "none", md: "1px solid" },
        borderBottom: { xs: "1px solid", md: "none" },
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#f7fafc", 0.94) : alpha("#101a24", 0.94),
        position: { md: "sticky" },
        top: { md: 56 },
        alignSelf: { md: "flex-start" },
        maxHeight: { md: "calc(100dvh - 56px)" },
        minHeight: { md: "calc(100dvh - 56px)" },
      }}
    >
      <Stack
        direction={{ xs: "row", md: "column" }}
        sx={{
          width: "100%",
          px: { xs: 1, md: 1.25 },
          py: { xs: 0.85, md: 1.35 },
          gap: { xs: 0.75, md: 1 },
          overflowX: { xs: "auto", md: "visible" },
          overflowY: { md: "auto" },
          scrollbarWidth: "thin",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ flexShrink: 0, px: { md: 0.35 }, minWidth: { xs: "auto", md: "100%" } }}
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
              Portfolio
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", letterSpacing: "-0.03em" }}>
              Houses
            </Typography>
          </Box>
          <Tooltip title={statusTitle}>
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                color: cloudStatus === "ready" ? "secondary.main" : "text.secondary",
              }}
              aria-label={statusTitle}
            >
              <CloudIcon status={cloudStatus} />
            </Box>
          </Tooltip>
        </Stack>

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
                    minHeight: { xs: 56, md: 64 },
                    px: 1,
                    py: 0.75,
                    flexShrink: 0,
                    minWidth: { xs: 168, md: "auto" },
                    alignItems: "flex-start",
                    border: "1px solid",
                    borderColor: selected ? "secondary.main" : "divider",
                    bgcolor: selected
                      ? (t) => alpha(t.palette.secondary.main, 0.1)
                      : "transparent",
                    "&.Mui-selected": {
                      bgcolor: (t) => alpha(t.palette.secondary.main, 0.12),
                      "&:hover": {
                        bgcolor: (t) => alpha(t.palette.secondary.main, 0.16),
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
                          fontSize: "0.72rem",
                          fontFamily: "var(--pp-font-mono)",
                          bgcolor: selected ? "secondary.main" : alpha("#0b1f33", 0.08),
                          color: selected ? "secondary.contrastText" : "text.primary",
                        }}
                      >
                        {p.houseId}
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.88rem",
                          letterSpacing: "-0.03em",
                          flex: 1,
                          minWidth: 0,
                        }}
                        noWrap
                      >
                        {houseLabel(p.houseId)}
                      </Typography>
                      <Tooltip title={`Archive ${houseLabel(p.houseId)}`}>
                        <IconButton
                          size="small"
                          aria-label={`Archive ${houseLabel(p.houseId)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchive(p.id);
                          }}
                          sx={{
                            mt: -0.25,
                            color: "text.secondary",
                            "&:hover": { color: "warning.main" },
                          }}
                        >
                          <ArchiveOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography
                        className="pp-mono"
                        sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                      >
                        {money0.format(metrics?.paymentMonthly ?? 0)}/mo
                      </Typography>
                      <Typography
                        className="pp-mono"
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 650,
                          color: cf > 0 ? "success.main" : cf < 0 ? "error.main" : "text.secondary",
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
                justifyContent: "space-between",
                minHeight: 34,
                px: 0.75,
                color: "text.secondary",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Archived ({sortedArchived.length})
            </Button>
            <Collapse in={archivedOpen} id="archived-houses-list">
              <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.4, mt: 0.35 }}>
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
                        fontSize: "0.66rem",
                        fontFamily: "var(--pp-font-mono)",
                        bgcolor: alpha("#0b1f33", 0.06),
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
                        fontSize: "0.8rem",
                        color: "text.secondary",
                      }}
                      noWrap
                    >
                      {houseLabel(p.houseId)}
                    </Typography>
                    <Tooltip title={`Restore ${houseLabel(p.houseId)}`}>
                      <IconButton
                        size="small"
                        aria-label={`Restore ${houseLabel(p.houseId)}`}
                        onClick={() => onRestore(p.id)}
                        sx={{ color: "secondary.main" }}
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
              mt: { md: "auto" },
              minHeight: 38,
              flexShrink: 0,
              minWidth: { xs: 140, md: "auto" },
              justifyContent: "flex-start",
              borderStyle: "dashed",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            Add house
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
