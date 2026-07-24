import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import GoogleIcon from "@mui/icons-material/Google";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useId, useState } from "react";
import {
  describeAuthUser,
  signInOrLinkGoogle,
  signInWithGoogleDirect,
  signOutUser,
  subscribeAuthUser,
  type AuthProfile,
} from "../collaboration/auth";
import { FormField, FormGrid } from "../layout/FormGrid";
import { isFirebaseConfigured } from "../lib/firebase";

export type CollaborationAuthPanelProps = {
  cloudReady: boolean;
  onAuthChanged?: (profile: AuthProfile | null) => void;
  onNotify?: (message: string, severity?: "success" | "error") => void;
  onReloadPortfolio?: () => void;
};

export function CollaborationAuthPanel({
  cloudReady,
  onAuthChanged,
  onNotify,
  onReloadPortfolio,
}: CollaborationAuthPanelProps) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkPrompt, setLinkPrompt] = useState<string | null>(null);
  const detailsId = useId();

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    return subscribeAuthUser((user) => {
      const next = user ? describeAuthUser(user) : null;
      setProfile(next);
      onAuthChanged?.(next);
      setLoading(false);
    });
  }, [onAuthChanged]);

  async function handleGoogleLink() {
    setBusy(true);
    setError(null);
    setLinkPrompt(null);
    try {
      const result = await signInOrLinkGoogle();
      if (!result.ok) {
        if (result.code === "credential-already-in-use") {
          setLinkPrompt(result.message);
          return;
        }
        setError(result.message);
        return;
      }
      setProfile(describeAuthUser(result.user));
      onAuthChanged?.(describeAuthUser(result.user));
      await onReloadPortfolio?.();
      onNotify?.(result.linked ? "Google linked — same UID preserved." : "Signed in with Google.", "success");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSwitch() {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogleDirect();
      if (!user) {
        setError("Google sign-in failed.");
        return;
      }
      setLinkPrompt(null);
      setProfile(describeAuthUser(user));
      onAuthChanged?.(describeAuthUser(user));
      await onReloadPortfolio?.();
      onNotify?.("Signed in with your Google profile.", "success");
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
        Add Firebase env vars to enable cloud sync and collaboration.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">Checking sign-in…</Typography>
      </Stack>
    );
  }

  const summaryLabel = profile
    ? `${profile.displayName || profile.email || "Signed in"} · ${profile.isAnonymous ? "Anonymous" : "Google"}`
    : "Not signed in";

  return (
    <Accordion
      defaultExpanded
      disableGutters
      elevation={0}
      // Keep auth state mounted while collapsed (no unmountOnExit).
      slotProps={{ transition: { unmountOnExit: false } }}
      sx={{ bgcolor: "transparent", border: "none", "&:before": { display: "none" } }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={detailsId}
        id={`${detailsId}-summary`}
        sx={{
          px: 0,
          "& .MuiAccordionSummary-content": { my: 0.5, alignItems: "center", gap: 0.75 },
        }}
      >
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ minWidth: 0 }}
          noWrap
          title={summaryLabel}
        >
          {summaryLabel}
        </Typography>
        {profile ? (
          <Chip
            size="small"
            label={profile.isAnonymous ? "Anonymous" : "Google"}
            color={profile.isAnonymous ? "default" : "secondary"}
          />
        ) : null}
      </AccordionSummary>
      <AccordionDetails id={detailsId} sx={{ px: 0, pt: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            Anonymous sessions work offline-first. Link Google to keep the same UID and invite collaborators safely.
          </Typography>
          {profile ? (
            <Box sx={{ p: 1.25, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" fontWeight={700}>
                  {profile.displayName || profile.email || "Signed in"}
                </Typography>
                <Chip
                  size="small"
                  label={profile.isAnonymous ? "Anonymous" : "Google"}
                  color={profile.isAnonymous ? "default" : "secondary"}
                />
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                  UID {profile.uid}
                  {profile.email ? ` · ${profile.email}` : ""}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
                  onClick={() =>
                    void navigator.clipboard.writeText(profile.uid).then(
                      () => onNotify?.("UID copied — share with a house owner to be added.", "success"),
                      () => onNotify?.("Could not copy UID.", "error")
                    )
                  }
                >
                  Copy UID
                </Button>
              </Stack>
            </Box>
          ) : null}
          {error ? <Alert severity="error" variant="outlined">{error}</Alert> : null}
          {linkPrompt ? (
            <Alert
              severity="warning"
              variant="outlined"
              action={
                <Button size="small" color="warning" disabled={busy} onClick={() => void handleGoogleSwitch()}>
                  Switch
                </Button>
              }
            >
              {linkPrompt}
            </Alert>
          ) : null}
          <FormGrid maxColumns={2} compact>
            <FormField>
              <Button
                size="small"
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <GoogleIcon />}
                disabled={busy || !cloudReady}
                onClick={() => void handleGoogleLink()}
              >
                {profile?.isAnonymous ? "Link Google" : "Google account"}
              </Button>
            </FormField>
            {!profile?.isAnonymous && profile ? (
              <FormField>
                <Button
                  size="small"
                  variant="text"
                  fullWidth
                  startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
                  disabled={busy}
                  onClick={() => void signOutUser().then(() => onNotify?.("Signed out.", "success"))}
                >
                  Sign out
                </Button>
              </FormField>
            ) : null}
          </FormGrid>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
