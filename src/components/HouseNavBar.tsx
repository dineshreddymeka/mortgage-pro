import AddHomeOutlinedIcon from "@mui/icons-material/AddHomeOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
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
  if (status === "ready") return <CloudDoneOutlinedIcon sx={{ fontSize: 15 }} />;
  if (status === "connecting") return <CloudQueueOutlinedIcon sx={{ fontSize: 15 }} />;
  return <CloudOffOutlinedIcon sx={{ fontSize: 15 }} />;
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
        : (cloudError ?? "Firestore unavailable — house list needs cloud sync");

  const sorted = [...properties].sort((a, b) => a.houseNumber - b.houseNumber);

  return (
    <Box
      component="nav"
      aria-label="House navigation"
      sx={{
        width: { xs: "100%", md: 220 },
        flexShrink: 0,
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        borderRight: { xs: "none", md: "1px solid" },
        borderBottom: { xs: "1px solid", md: "none" },
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#ffffff", 0.92) : alpha("#1c1c1e", 0.92),
        position: { md: "sticky" },
        top: { md: 52 },
        alignSelf: { md: "flex-start" },
        maxHeight: { md: "calc(100dvh - 52px)" },
        minHeight: { md: "calc(100dvh - 52px)" },
      }}
    >
      <Stack
        direction={{ xs: "row", md: "column" }}
        sx={{
          width: "100%",
          px: { xs: 1, md: 1.25 },
          py: { xs: 0.75, md: 1.25 },
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
          sx={{ flexShrink: 0, px: { md: 0.5 }, minWidth: { xs: "auto", md: "100%" } }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Houses
          </Typography>
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
              gap: 0.35,
              flex: { md: 1 },
              py: 0,
            }}
          >
            {sorted.map((p) => {
              const selected = p.id === activePropertyId;
              return (
                <ListItemButton
                  key={p.id}
                  selected={selected}
                  onClick={() => onSelect(p.id)}
                  aria-current={selected ? "page" : undefined}
                  sx={{
                    borderRadius: "10px",
                    minHeight: 40,
                    px: 1,
                    py: 0.65,
                    flexShrink: 0,
                    minWidth: { xs: 118, md: "auto" },
                    "&.Mui-selected": {
                      bgcolor: (t) => alpha(t.palette.secondary.main, 0.14),
                      color: "secondary.main",
                      "&:hover": {
                        bgcolor: (t) => alpha(t.palette.secondary.main, 0.2),
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: "7px",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        fontVariantNumeric: "tabular-nums",
                        bgcolor: selected
                          ? "secondary.main"
                          : (t) => alpha(t.palette.text.primary, 0.08),
                        color: selected ? "secondary.contrastText" : "text.primary",
                      }}
                    >
                      {p.houseNumber}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={houseLabel(p.houseNumber)}
                    primaryTypographyProps={{
                      fontWeight: selected ? 700 : 550,
                      fontSize: "0.875rem",
                      letterSpacing: "-0.02em",
                      noWrap: true,
                    }}
                    secondary={selected ? "Active" : undefined}
                    secondaryTypographyProps={{
                      fontSize: "0.65rem",
                      color: "secondary.main",
                    }}
                  />
                  <HomeOutlinedIcon
                    sx={{
                      fontSize: 16,
                      opacity: selected ? 0.9 : 0.35,
                      display: { xs: "none", md: "block" },
                    }}
                  />
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
              ? "Loading houses…"
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
              minHeight: 36,
              flexShrink: 0,
              minWidth: { xs: 130, md: "auto" },
              justifyContent: "flex-start",
              borderStyle: "dashed",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Add house
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
