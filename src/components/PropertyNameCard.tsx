import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useState } from "react";

export type PropertyNameCardProps = {
  houseId: string;
  name: string;
  cloudReady: boolean;
  onSave: (name: string) => Promise<string | null>;
};

/** Edit the display name for the active house (stored on the property doc). */
export function PropertyNameCard({ houseId, name, cloudReady, onSave }: PropertyNameCardProps) {
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(name);
    setError(null);
  }, [name]);

  const dirty = draft.trim() !== name.trim();

  async function handleSave() {
    if (!cloudReady || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const next = await onSave(draft);
      if (next != null) setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px",
        bgcolor: (t) =>
          t.palette.mode === "light" ? alpha("#fff", 0.88) : alpha(t.palette.background.paper, 0.88),
        px: 1.5,
        py: 1.25,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
          <Typography variant="subtitle2" sx={{ fontSize: "0.8125rem", letterSpacing: "-0.015em" }}>
            Property name
          </Typography>
          <Typography
            className="pp-mono"
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 650 }}
          >
            ID {houseId}
          </Typography>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={draft}
            disabled={!cloudReady || saving}
            placeholder={`House ${houseId}`}
            helperText={
              !cloudReady
                ? "Connect Firestore to rename this property."
                : error ?? "Shown in portfolio, KPIs, and Compare."
            }
            error={Boolean(error)}
            onChange={(e) => setDraft(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSave();
              }
            }}
            inputProps={{ maxLength: 80, "aria-label": "Property name" }}
          />
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={!cloudReady || !dirty || saving}
            startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => void handleSave()}
            sx={{ minHeight: 40, flexShrink: 0, fontWeight: 700, px: 1.5 }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
