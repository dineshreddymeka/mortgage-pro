import AddHomeOutlinedIcon from "@mui/icons-material/AddHomeOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { CloudSyncStatus } from "../hooks/useMortgageSyncedState";
import { houseLabel, type PropertyMeta } from "../storage/firestoreProperties";

export type HouseNavBarProps = {
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  properties: PropertyMeta[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

function CloudIcon({ status }: { status: CloudSyncStatus }) {
  if (status === "ready") return <CloudDoneOutlinedIcon sx={{ fontSize: 16 }} />;
  if (status === "connecting") return <CloudQueueOutlinedIcon sx={{ fontSize: 16 }} />;
  return <CloudOffOutlinedIcon sx={{ fontSize: 16 }} />;
}

export function HouseNavBar({
  cloudStatus,
  cloudError,
  properties,
  activePropertyId,
  onSelect,
  onCreate,
}: HouseNavBarProps) {
  const statusTitle =
    cloudStatus === "ready"
      ? "Houses synced to Firestore"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore…"
        : cloudError ?? "Firestore unavailable — house list needs cloud sync";

  const sorted = [...properties].sort((a, b) => a.houseNumber - b.houseNumber);

  return (
    <Box
      component="nav"
      aria-label="Houses"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#f5f5f7", 0.55) : alpha("#1c1c1e", 0.55),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 0.55,
          maxWidth: "xl",
          mx: "auto",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Tooltip title={statusTitle}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.4,
              color: cloudStatus === "ready" ? "secondary.main" : "text.secondary",
              flexShrink: 0,
              mr: 0.25,
            }}
          >
            <CloudIcon status={cloudStatus} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: "0.7rem" }}
            >
              Houses
            </Typography>
          </Box>
        </Tooltip>

        {cloudStatus === "ready" && sorted.length > 0
          ? sorted.map((p) => {
              const selected = p.id === activePropertyId;
              return (
                <Button
                  key={p.id}
                  size="small"
                  disableElevation
                  onClick={() => onSelect(p.id)}
                  aria-current={selected ? "page" : undefined}
                  sx={{
                    minHeight: 28,
                    minWidth: 64,
                    px: 1.1,
                    py: 0.35,
                    borderRadius: "8px",
                    flexShrink: 0,
                    fontWeight: selected ? 700 : 500,
                    fontSize: "0.78rem",
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    color: selected ? "secondary.contrastText" : "text.primary",
                    bgcolor: selected ? "secondary.main" : "transparent",
                    border: "1px solid",
                    borderColor: selected ? "secondary.main" : "divider",
                    "&:hover": {
                      bgcolor: selected
                        ? "secondary.dark"
                        : (t) => alpha(t.palette.text.primary, 0.04),
                    },
                  }}
                >
                  {houseLabel(p.houseNumber)}
                </Button>
              );
            })
          : null}

        {cloudStatus === "ready" ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddHomeOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={onCreate}
            aria-label="Add house"
            sx={{
              minHeight: 28,
              px: 1,
              flexShrink: 0,
              fontSize: "0.75rem",
              borderStyle: "dashed",
            }}
          >
            Add house
          </Button>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.72rem" }}>
            {cloudStatus === "connecting" ? "Loading houses…" : "Connect Firestore to manage houses"}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
