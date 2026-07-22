import { useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { ScenarioReportView } from "../report/ScenarioReportView";
import { buildScenarioReportModel } from "../report/scenarioReportModel";
import "../report/reportPrint.css";
import { getShareSnapshotStore } from "../storage/shareSnapshotStore";
import { parseShareTokenFromHash } from "./parseShareRoute";
import { resolveShareViewerRecord, type ShareViewerResolution } from "./resolveShareViewer";

function viewerMessage(resolution: ShareViewerResolution): { severity: "error" | "warning" | "info"; title: string; body: string } {
  switch (resolution.status) {
    case "invalid-token":
      return { severity: "error", title: "Invalid share link", body: "This URL does not contain a valid read-only share token." };
    case "not-found":
      return { severity: "error", title: "Snapshot not found", body: "The share token is unknown or was never saved on this device." };
    case "revoked":
      return { severity: "warning", title: "Link revoked", body: "The owner revoked this read-only snapshot. Ask them for a new link." };
    case "expired":
      return { severity: "warning", title: "Link expired", body: "This share snapshot reached its expiry time and is no longer available." };
    case "hash-mismatch":
      return { severity: "error", title: "Integrity check failed", body: "Snapshot payload failed the content hash check — do not trust these numbers." };
    default:
      return { severity: "info", title: "Loading", body: "" };
  }
}

function formatWhen(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
  } catch {
    return String(ms);
  }
}

export default function ShareRoot() {
  const token = useMemo(() => parseShareTokenFromHash(window.location.hash), []);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState<ShareViewerResolution | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const store = getShareSnapshotStore();
        const record = token ? await store.getByToken(token) : null;
        if (cancelled) return;
        setResolution(resolveShareViewerRecord(token, record));
      } catch {
        if (!cancelled) setResolution(resolveShareViewerRecord(token, null));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3 }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Loading read-only snapshot…
          </Typography>
        </Stack>
      </Box>
    );
  }

  const resolved = resolution ?? resolveShareViewerRecord(token, null);

  if (resolved.status !== "ready") {
    const msg = viewerMessage(resolved);
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: { xs: 2, sm: 3 }, maxWidth: 520, mx: "auto" }}>
        <Stack spacing={2} width="100%">
          <Stack direction="row" spacing={1} alignItems="center">
            <LockOutlinedIcon color="action" fontSize="small" />
            <Typography variant="h6" fontWeight={700}>
              Read-only share
            </Typography>
          </Stack>
          <Alert severity={msg.severity} variant="outlined">
            <Typography fontWeight={700} gutterBottom>
              {msg.title}
            </Typography>
            <Typography variant="body2">{msg.body}</Typography>
            {resolved.record?.revokedAt ? (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Revoked {formatWhen(resolved.record.revokedAt)}
              </Typography>
            ) : null}
            {resolved.record?.expiresAt ? (
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Expired {formatWhen(resolved.record.expiresAt)}
              </Typography>
            ) : null}
          </Alert>
        </Stack>
      </Box>
    );
  }

  const model = buildScenarioReportModel(resolved.state, {
    houseId: resolved.record.payload.houseId,
    houseLabel: resolved.record.payload.houseLabel,
  });

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      <Alert
        severity="info"
        icon={<LockOutlinedIcon fontSize="inherit" />}
        sx={{
          borderRadius: 0,
          justifyContent: "center",
          "& .MuiAlert-message": { width: "100%", maxWidth: 900 },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 0.5, sm: 2 }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          width="100%"
        >
          <Typography variant="body2" fontWeight={600}>
            Read-only snapshot · hash verified · edits disabled
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Created {formatWhen(resolved.record.createdAt)}
            {resolved.record.expiresAt ? ` · expires ${formatWhen(resolved.record.expiresAt)}` : ""}
          </Typography>
        </Stack>
      </Alert>
      <ScenarioReportView
        model={model}
        onPrint={() => window.print()}
        onClose={() => {
          window.location.hash = "";
          window.location.reload();
        }}
      />
    </Box>
  );
}
