import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RevisionConflict } from "../collaboration/types";

export type RevisionConflictDialogProps = {
  open: boolean;
  conflict: RevisionConflict | null;
  busy?: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  onDismiss: () => void;
};

function RevisionColumn({
  title,
  revision,
  updatedAt,
  emphasize,
}: {
  title: string;
  revision: number;
  updatedAt?: string;
  emphasize?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: emphasize ? "warning.main" : "divider",
        bgcolor: emphasize ? "action.hover" : "transparent",
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
        rev {revision}
      </Typography>
      {updatedAt ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {updatedAt}
        </Typography>
      ) : null}
    </Box>
  );
}

export function RevisionConflictDialog({
  open,
  conflict,
  busy = false,
  onReload,
  onOverwrite,
  onDismiss,
}: RevisionConflictDialogProps) {
  if (!conflict) return null;
  return (
    <Dialog open={open} onClose={onDismiss} maxWidth="sm" fullWidth>
      <DialogTitle>Another save landed first</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25}>
          <Alert severity="warning" variant="outlined">
            Realtime merge is not available. Compare revisions below, then reload the remote scenario or overwrite
            with your local edits.
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <RevisionColumn title="Your local" revision={conflict.localRevision} />
            <RevisionColumn
              title="Remote"
              revision={conflict.remoteRevision}
              updatedAt={conflict.remoteUpdatedAt}
              emphasize
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {conflict.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tip: to keep both versions, Export Excel / JSON first, then overwrite — or create a new house after reload.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 0.5, px: 2, pb: 2 }}>
        <Button onClick={onDismiss} disabled={busy}>
          Keep editing
        </Button>
        <Button variant="outlined" onClick={onReload} disabled={busy}>
          Reload remote
        </Button>
        <Button variant="contained" color="warning" onClick={onOverwrite} disabled={busy}>
          Overwrite remote
        </Button>
      </DialogActions>
    </Dialog>
  );
}
