import AddIcon from "@mui/icons-material/Add";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudQueueOutlinedIcon from "@mui/icons-material/CloudQueueOutlined";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import type { CloudSyncStatus } from "../hooks/useMortgageSyncedState";
import type { PropertyMeta } from "../storage/firestoreProperties";

export type PropertySwitcherProps = {
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  properties: PropertyMeta[];
  activePropertyId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
};

function CloudIcon({ status }: { status: CloudSyncStatus }) {
  if (status === "ready") return <CloudDoneOutlinedIcon sx={{ fontSize: 18 }} />;
  if (status === "connecting") return <CloudQueueOutlinedIcon sx={{ fontSize: 18 }} />;
  return <CloudOffOutlinedIcon sx={{ fontSize: 18 }} />;
}

export function PropertySwitcher({
  cloudStatus,
  cloudError,
  properties,
  activePropertyId,
  onSelect,
  onCreate,
}: PropertySwitcherProps) {
  if (cloudStatus === "off") return null;

  const statusTitle =
    cloudStatus === "ready"
      ? "Synced to Firestore"
      : cloudStatus === "connecting"
        ? "Connecting to Firestore…"
        : cloudError ?? "Firestore unavailable — using this browser only";

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.35, minWidth: 0 }}>
      <Tooltip title={statusTitle}>
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            color: cloudStatus === "ready" ? "secondary.main" : "text.secondary",
            opacity: cloudStatus === "connecting" ? 0.7 : 1,
          }}
          aria-label={statusTitle}
        >
          <CloudIcon status={cloudStatus} />
        </Box>
      </Tooltip>

      {cloudStatus === "ready" && properties.length > 0 ? (
        <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 160 }, maxWidth: 220 }}>
          <Select
            value={activePropertyId ?? ""}
            displayEmpty
            onChange={(e) => {
              const id = String(e.target.value);
              if (id) onSelect(id);
            }}
            aria-label="Active property"
            sx={{
              height: 30,
              fontSize: "0.78rem",
              ".MuiSelect-select": { py: 0.5, pr: 3 },
            }}
          >
            {properties.map((p) => (
              <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.82rem" }}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {cloudStatus === "ready" ? (
        <Tooltip title="New property">
          <IconButton size="small" onClick={onCreate} aria-label="Create new property">
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}
