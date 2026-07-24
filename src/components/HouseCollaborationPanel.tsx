import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useId, useState } from "react";
import { acceptInvite, createEmailInvite, inviteMemberByUid, removeMember, revokeInvite } from "../collaboration/firestoreMembers";
import { loadHouseCollaborationView, loadIncomingInvites } from "../collaboration/loadCollaborationView";
import type { HouseCollaborationView, PropertyInviteRecord } from "../collaboration/types";
import { FormField, FormGrid } from "../layout/FormGrid";
import { FORM_CONTAINER_NAME, formContainerBreakpoints } from "../layout/formLayout";

export type HouseCollaborationPanelProps = {
  propertyDocId: string | null;
  viewerUid: string | null;
  viewerEmail: string | null;
  cloudReady: boolean;
  onNotify?: (message: string, severity?: "success" | "error") => void;
  onMembersChanged?: () => void;
};

function formatExpiry(invite: PropertyInviteRecord): string {
  if (invite.expiresAt == null) return "No expiry";
  const ms = invite.expiresAt - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days <= 1 ? "Expires today" : `Expires in ${days}d`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const listSx = {
  // Let the widget body own overflow: several independently scrolling
  // collaborator lists create nested scroll traps as membership grows.
  minWidth: 0,
} as const;

const inviteRowSx = {
  flexDirection: "column",
  alignItems: "stretch",
  "& > .MuiButton-root": { width: "100%" },
  [`@container ${FORM_CONTAINER_NAME} (min-width: ${formContainerBreakpoints.twoCol}px)`]: {
    flexDirection: "row",
    alignItems: "flex-start",
    "& > .MuiButton-root": { width: "auto" },
  },
} as const;

const listRowSx = {
  flexDirection: "column",
  alignItems: "stretch",
  [`@container ${FORM_CONTAINER_NAME} (min-width: ${formContainerBreakpoints.twoCol}px)`]: {
    flexDirection: "row",
    alignItems: "center",
  },
} as const;

export function HouseCollaborationPanel({
  propertyDocId,
  viewerUid,
  viewerEmail,
  cloudReady,
  onNotify,
  onMembersChanged,
}: HouseCollaborationPanelProps) {
  const [view, setView] = useState<HouseCollaborationView | null>(null);
  const [incomingInvites, setIncomingInvites] = useState<HouseCollaborationView["pendingInvites"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [memberUid, setMemberUid] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [lastInviteHint, setLastInviteHint] = useState<string | null>(null);
  const invitePanelId = useId();

  const refresh = useCallback(async () => {
    if (!cloudReady || !propertyDocId || !viewerUid) {
      setView(null);
      setIncomingInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [collab, incoming] = await Promise.all([
        loadHouseCollaborationView(propertyDocId, viewerUid),
        loadIncomingInvites(viewerUid, viewerEmail, propertyDocId),
      ]);
      setView(collab);
      setIncomingInvites(incoming);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load collaborators");
      setView(null);
    } finally {
      setLoading(false);
    }
  }, [cloudReady, propertyDocId, viewerEmail, viewerUid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      onMembersChanged?.();
      onNotify?.(success, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Collaboration action failed";
      setError(msg);
      onNotify?.(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  const isOwner = view?.accessRole === "owner";
  const googleLinked = Boolean(viewerEmail?.trim());

  return (
    <Stack
      spacing={1.25}
      sx={{ containerType: "inline-size", containerName: FORM_CONTAINER_NAME }}
    >
      <Typography variant="body2" color="text.secondary">
        Invite by Firebase UID (instant) or Google email (hash stored; no email is sent). Members edit the shared
        scenario — no rename/archive.
      </Typography>
      {viewerUid ? (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ py: 0.25 }}
          action={
            <Button
              size="small"
              startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />}
              onClick={() =>
                void copyText(viewerUid).then((ok) =>
                  onNotify?.(ok ? "Your UID copied." : "Could not copy UID.", ok ? "success" : "error")
                )
              }
            >
              Copy my UID
            </Button>
          }
        >
          Share your UID so an owner can add you instantly.
        </Alert>
      ) : null}
      {error ? (
        <Alert
          severity="error"
          variant="outlined"
          action={
            <Button size="small" onClick={() => void refresh()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading collaborators…
          </Typography>
        </Stack>
      ) : null}
      {!loading && view?.accessRole === "member" ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
          Member on house {view.houseId}. If another session saved first, use the revision dialog to reload or
          overwrite — or save a new house from Export.
        </Alert>
      ) : null}
      {!loading && incomingInvites.length > 0 ? (
        <Box sx={{ p: 1.25, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
            Invites for you ({incomingInvites.length})
          </Typography>
          <Stack spacing={1} role="list" aria-label="Incoming invites" sx={listSx}>
            {incomingInvites.map((invite) => (
              <Stack
                key={invite.id}
                role="listitem"
                spacing={1}
                sx={listRowSx}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  House {invite.houseId} · {formatExpiry(invite)}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled={busy || !viewerUid}
                  onClick={() =>
                    void run(
                      () => acceptInvite(invite, viewerUid!, viewerEmail),
                      `Joined house ${invite.houseId}.`
                    )
                  }
                >
                  Accept
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : null}
      {isOwner ? (
        <Accordion
          defaultExpanded
          disableGutters
          elevation={0}
          slotProps={{ transition: { unmountOnExit: false } }}
          sx={{ bgcolor: "transparent", border: "1px solid", borderColor: "divider", borderRadius: "12px !important" }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={invitePanelId}
            id={`${invitePanelId}-summary`}
            sx={{ "& .MuiAccordionSummary-content": { my: 0.5 } }}
          >
            <Typography variant="subtitle2">Invite collaborators</Typography>
          </AccordionSummary>
          <AccordionDetails id={invitePanelId} sx={{ pt: 0 }}>
            <Stack spacing={1}>
              <FormGrid maxColumns={2} compact>
                <FormField span={2}>
                  <Stack spacing={1} sx={inviteRowSx}>
                    <TextField
                      size="small"
                      label="Member UID"
                      value={memberUid}
                      onChange={(e) => setMemberUid(e.target.value)}
                      fullWidth
                      helperText="Ask them to copy UID from Account & sign-in"
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PersonAddOutlinedIcon sx={{ fontSize: 16 }} />}
                      disabled={busy || !memberUid.trim() || !view}
                      onClick={() =>
                        void run(async () => {
                          if (!propertyDocId || !view) return;
                          await inviteMemberByUid(propertyDocId, view.ownerUid, view.houseId, memberUid.trim());
                          setMemberUid("");
                        }, "Member added.")
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      Add UID
                    </Button>
                  </Stack>
                </FormField>
                <FormField span={2}>
                  <Stack spacing={1} sx={inviteRowSx}>
                    <TextField
                      size="small"
                      label="Invite email"
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      fullWidth
                      disabled={!googleLinked}
                      helperText={
                        googleLinked
                          ? "They must sign in with that Google email (no message is emailed)."
                          : "Link Google first — email invites require a signed-in Google account."
                      }
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy || !memberEmail.trim() || !view || !googleLinked}
                      onClick={() =>
                        void run(async () => {
                          if (!propertyDocId || !view) return;
                          const email = memberEmail.trim();
                          await createEmailInvite(propertyDocId, view.ownerUid, view.houseId, email);
                          const hint = `Tell ${email} to open Property Pro, link Google with that address, then accept the invite under Collaborators. Expires in 14 days.`;
                          setLastInviteHint(hint);
                          await copyText(hint);
                          setMemberEmail("");
                        }, "Email invite created — instructions copied when clipboard allows.")
                      }
                      sx={{ flexShrink: 0 }}
                    >
                      Invite email
                    </Button>
                  </Stack>
                </FormField>
              </FormGrid>
              {lastInviteHint ? (
                <Typography variant="caption" color="text.secondary">
                  {lastInviteHint}
                </Typography>
              ) : null}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}
      {!loading &&
      isOwner &&
      view &&
      view.memberUids.length === 0 &&
      view.pendingInvites.length === 0 ? (
        <Box sx={{ py: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No collaborators yet.
          </Typography>
        </Box>
      ) : null}
      {!loading && view && view.memberUids.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Members</Typography>
          <Stack spacing={1} role="list" aria-label="House members" sx={listSx}>
            {view.memberUids.map((uid) => (
              <Stack
                key={uid}
                role="listitem"
                spacing={1}
                sx={{
                  ...listRowSx,
                  p: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ flex: 1, wordBreak: "break-all" }}>
                  {view.members[uid]?.label || uid}
                </Typography>
                <Chip size="small" label={view.members[uid]?.via === "email" ? "Email" : "UID"} />
                {isOwner ? (
                  <Button
                    size="small"
                    color="warning"
                    variant="text"
                    startIcon={<PersonRemoveOutlinedIcon sx={{ fontSize: 16 }} />}
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        if (!propertyDocId || !view) return;
                        await removeMember(propertyDocId, view.ownerUid, uid);
                      }, "Member removed.")
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </Stack>
            ))}
          </Stack>
        </Stack>
      ) : null}
      {!loading && view && view.pendingInvites.length > 0 ? (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Pending invites</Typography>
          <Stack spacing={1} role="list" aria-label="Pending invites" sx={listSx}>
            {view.pendingInvites.map((invite) => {
              const expired = invite.expiresAt != null && invite.expiresAt < Date.now();
              return (
                <Stack
                  key={invite.id}
                  role="listitem"
                  spacing={1}
                  sx={{
                    ...listRowSx,
                    p: 1,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {invite.targetUid ? `UID ${invite.targetUid}` : "Email invite"} · {formatExpiry(invite)}
                    {invite.emailHash ? ` · #${invite.emailHash.slice(0, 8)}` : ""}
                  </Typography>
                  {expired ? <Chip size="small" color="warning" label="Expired" /> : null}
                  {isOwner ? (
                    <Button
                      size="small"
                      color="warning"
                      variant="text"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          if (!view) return;
                          await revokeInvite(invite.id, view.ownerUid);
                        }, "Invite revoked.")
                      }
                    >
                      Revoke
                    </Button>
                  ) : null}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  );
}
