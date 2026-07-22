import GoogleIcon from "@mui/icons-material/Google";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import {
  describeAuthUser,
  signInOrLinkGoogle,
  signInWithGoogleDirect,
  signOutUser,
  subscribeAuthUser,
  type AuthProfile,
} from "../collaboration/auth";
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

  return (
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
            <Chip size="small" label={profile.isAnonymous ? "Anonymous" : "Google"} color={profile.isAnonymous ? "default" : "secondary"} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
            UID {profile.uid}{profile.email ? ` · ${profile.email}` : ""}
          </Typography>
        </Box>
      ) : null}
      {error ? <Alert severity="error" variant="outlined">{error}</Alert> : null}
      {linkPrompt ? (
        <Alert severity="warning" variant="outlined" action={<Button size="small" color="warning" disabled={busy} onClick={() => void handleGoogleSwitch()}>Switch</Button>}>
          {linkPrompt}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button size="small" variant="contained" color="secondary" startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <GoogleIcon />} disabled={busy || !cloudReady} onClick={() => void handleGoogleLink()}>
          {profile?.isAnonymous ? "Link Google" : "Google account"}
        </Button>
        {!profile?.isAnonymous && profile ? (
          <Button size="small" variant="text" startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />} disabled={busy} onClick={() => void signOutUser().then(() => onNotify?.("Signed out.", "success"))}>
            Sign out
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
