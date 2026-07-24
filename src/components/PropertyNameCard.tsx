import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { FormField, FormGrid } from "../layout/FormGrid";

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
    <Stack spacing={1}>
      <Typography
        className="pp-mono"
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 650, alignSelf: "flex-end" }}
      >
        ID {houseId}
      </Typography>

      <FormGrid maxColumns={2} compact>
        <FormField>
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
        </FormField>
        <FormField>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            fullWidth
            disabled={!cloudReady || !dirty || saving}
            startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => void handleSave()}
            sx={{ fontWeight: 700, px: 1.5 }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </FormField>
      </FormGrid>
    </Stack>
  );
}
