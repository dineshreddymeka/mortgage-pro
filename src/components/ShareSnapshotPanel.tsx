import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppPersisted } from "../storage/mortgageState";
import { buildShareSnapshotInputFromScenario } from "../share/buildShareSnapshot";
import { buildShareViewerUrl, copyTextToClipboard } from "../share/buildShareUrl";
import { isShareSnapshotActive } from "../share/buildShareSnapshot";
import type { ShareSnapshotRecord } from "../share/shareSnapshotTypes";
import { getShareSnapshotStore } from "../storage/shareSnapshotStore";

const LOCAL_OWNER_KEY = "mortgage-pro:local-owner-id";

function resolveOwnerUid(userId: string | null): string {
  if (userId) return userId;
  try {
    let id = localStorage.getItem(LOCAL_OWNER_KEY);
    if (!id) {
      id = `local-${crypto.randomUUID()}`;
      localStorage.setItem(LOCAL_OWNER_KEY, id);
    }
    return id;
  } catch {
    return "local-anonymous";
  }
}

function formatWhen(ms: number | null): string {
  if (ms == null) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
  } catch {
    return String(ms);
  }
}

export type ShareSnapshotPanelProps = {
  state: AppPersisted;
  ownerUid: string | null;
  houseLabel: string;
  houseId: string;
  propertyDocId: string | null;
  cloudReady: boolean;
  onNotify?: (message: string, severity?: "success" | "error") => void;
};

export function ShareSnapshotPanel({
  state,
  ownerUid,
  houseLabel,
  houseId,
  propertyDocId,
  cloudReady,
  onNotify,
}: ShareSnapshotPanelProps) {
  const effectiveOwner = useMemo(() => resolveOwnerUid(ownerUid), [ownerUid]);
  const [rows, setRows] = useState<ShareSnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number>(0);
  const [revokeTarget, setRevokeTarget] = useState<ShareSnapshotRecord | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const store = getShareSnapshotStore(cloudReady);
      const list = await store.listByOwner(effectiveOwner);
      const filtered = list
        .filter((r) => r.houseId === houseId || r.propertyDocId === propertyDocId)
        .sort((a, b) => b.createdAt - a.createdAt);
      setRows(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load share links");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [cloudReady, effectiveOwner, houseId, propertyDocId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createSnapshot() {
    setBusy(true);
    setError(null);
    try {
      const store = getShareSnapshotStore(cloudReady);
      const expiresAt =
        expiryDays > 0 ? Date.now() + expiryDays * 24 * 60 * 60 * 1000 : null;
      const created = await store.create(
        buildShareSnapshotInputFromScenario(state, effectiveOwner, {
          houseLabel,
          houseId,
          propertyDocId: propertyDocId ?? undefined,
          name: houseLabel,
        }, expiresAt)
      );
      await refresh();
      onNotify?.("Read-only share snapshot created.", "success");
      const url = buildShareViewerUrl(created.shareToken);
      const copied = await copyTextToClipboard(url);
      if (copied) onNotify?.("Share link copied to clipboard.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create share snapshot";
      setError(msg);
      onNotify?.(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(record: ShareSnapshotRecord) {
    const url = buildShareViewerUrl(record.shareToken);
    const copied = await copyTextToClipboard(url);
    onNotify?.(
      copied ? "Share link copied." : "Copy failed — select the link manually.",
      copied ? "success" : "error"
    );
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      const store = getShareSnapshotStore(cloudReady);
      const ok = await store.revoke(revokeTarget.shareToken, effectiveOwner);
      if (!ok) throw new Error("Revoke denied or link not found.");
      setRevokeTarget(null);
      await refresh();
      onNotify?.("Share link revoked.", "success");
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Revoke failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const empty = !loading && rows.length === 0 && !error;

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        Publish an immutable, read-only snapshot of every tab. Viewers cannot edit — only revoke or expiry changes access.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          select
          size="small"
          label="Expiry"
          value={expiryDays}
          onChange={(e) => setExpiryDays(Number(e.target.value))}
          sx={{ minWidth: { sm: 160 }, width: { xs: "100%", sm: "auto" } }}
        >
          <MenuItem value={0}>Never</MenuItem>
          <MenuItem value={7}>7 days</MenuItem>
          <MenuItem value={30}>30 days</MenuItem>
          <MenuItem value={90}>90 days</MenuItem>
        </TextField>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <ShareOutlinedIcon />}
          disabled={busy}
          onClick={() => void createSnapshot()}
        >
          Create share snapshot
        </Button>
      </Stack>

      {!cloudReady ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
          Links are stored in this browser until Firestore sync is ready. Copy the URL after creating.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" variant="outlined" action={<Button size="small" onClick={() => void refresh()}>Retry</Button>}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading share links…
          </Typography>
        </Stack>
      ) : null}

      {empty ? (
        <Box sx={{ py: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No share snapshots yet for {houseLabel}.
          </Typography>
        </Box>
      ) : null}

      {!loading && rows.length > 0 ? (
        <Stack spacing={1}>
          {rows.map((row) => {
            const active = isShareSnapshotActive(row);
            return (
              <Box
                key={row.shareToken}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: (t) => (t.palette.mode === "light" ? "grey.50" : "action.hover"),
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.35} minWidth={0}>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: "100%" }}>
                        {row.payload.houseLabel}
                      </Typography>
                      <Chip
                        size="small"
                        label={active ? "Active" : row.revokedAt ? "Revoked" : "Expired"}
                        color={active ? "success" : "default"}
                        variant={active ? "filled" : "outlined"}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {buildShareViewerUrl(row.shareToken)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created {formatWhen(row.createdAt)}
                      {row.expiresAt ? ` · expires ${formatWhen(row.expiresAt)}` : ""}
                      {row.revokedAt ? ` · revoked ${formatWhen(row.revokedAt)}` : ""}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexShrink={0}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />}
                      disabled={!active}
                      onClick={() => void copyLink(row)}
                    >
                      Copy
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      variant="text"
                      startIcon={<LinkOffOutlinedIcon sx={{ fontSize: 16 }} />}
                      disabled={!active || busy}
                      onClick={() => setRevokeTarget(row)}
                    >
                      Revoke
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : null}

      <Dialog open={revokeTarget != null} onClose={() => setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke share link?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Viewers with this link will immediately lose access. The immutable snapshot payload stays stored for your audit trail.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button color="warning" variant="contained" disabled={busy} onClick={() => void confirmRevoke()}>
            Revoke link
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
