import AddHomeOutlinedIcon from "@mui/icons-material/AddHomeOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { CloudSyncStatus } from "../hooks/useMortgageSyncedState";
import type { HouseComparisonRow } from "../lib/houseComparison";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";

export type HouseNavBarProps = {
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  properties: PropertyMeta[];
  comparisons: HouseComparisonRow[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
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
  comparisons,
  activePropertyId,
  onSelect,
  onCreate,
}: HouseNavBarProps) {
  const statusTitle =
    cloudStatus === "ready"
      ? "Portfolio synced to Firestore"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore…"
        : (cloudError ?? "Firestore unavailable — house list needs cloud sync");

  const sorted = [...properties].sort((a, b) => a.houseNumber - b.houseNumber);
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
                    minWidth: { xs: 158, md: "auto" },
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
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "8px",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          fontFamily: "var(--pp-font-mono)",
                          bgcolor: selected ? "secondary.main" : alpha("#0b1f33", 0.08),
                          color: selected ? "secondary.contrastText" : "text.primary",
                        }}
                      >
                        {p.houseNumber}
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
                        {houseLabel(p.houseNumber)}
                      </Typography>
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
              : "Connect Firestore to manage houses"}
          </Typography>
        )}

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
