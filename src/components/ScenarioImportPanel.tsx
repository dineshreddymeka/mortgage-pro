import ContentPasteOutlinedIcon from "@mui/icons-material/ContentPasteOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useState, type ChangeEvent } from "react";
import {
  applyScenarioImport,
  MAX_SCENARIO_IMPORT_BYTES,
  parseScenarioImportText,
  type ScenarioImportMode,
  type ScenarioImportResult,
} from "../lib/scenarioImport";
import { downloadScenarioJson } from "../lib/scenarioExport";
import type { AppPersisted } from "../storage/mortgageState";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type ScenarioImportPanelProps = {
  state: AppPersisted;
  houseId: string;
  houseName: string;
  cloudReady: boolean;
  replaceCurrent: (scenario: AppPersisted) => void;
  createNew: (scenario: AppPersisted, suggestedName: string | null) => Promise<string | null>;
  onNotify?: (message: string, severity?: "success" | "error") => void;
};

function issueText(issue: { path?: string; message: string }): string {
  return issue.path ? `${issue.path}: ${issue.message}` : issue.message;
}

export function ScenarioImportPanel({
  state,
  houseId,
  houseName,
  cloudReady,
  replaceCurrent,
  createNew,
  onNotify,
}: ScenarioImportPanelProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioImportResult | null>(null);
  const [mode, setMode] = useState<ScenarioImportMode>("current");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function resetDialog() {
    setText("");
    setSourceName(null);
    setResult(null);
    setMode("current");
    setLoading(false);
    setBusy(false);
    setSuccess(null);
    setFileError(null);
  }

  function closeDialog() {
    if (busy) return;
    setOpen(false);
    resetDialog();
  }

  async function preview(payload = text) {
    setLoading(true);
    setSuccess(null);
    setFileError(null);
    setResult(null);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    setResult(parseScenarioImportText(payload, state));
    setLoading(false);
  }

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSourceName(file.name);
    setSuccess(null);
    if (file.size > MAX_SCENARIO_IMPORT_BYTES) {
      setText("");
      setResult(null);
      setFileError("That file is larger than the 5 MB safety limit.");
      return;
    }
    setLoading(true);
    setFileError(null);
    setResult(null);
    try {
      const payload = await file.text();
      setText(payload);
      setResult(parseScenarioImportText(payload, state));
    } catch {
      setFileError("The selected file could not be read.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (result?.status !== "ready") return;
    setBusy(true);
    try {
      const applied = await applyScenarioImport(
        result,
        { confirmed: true, mode },
        {
          replaceCurrent,
          createNew: async (scenario, suggestedName) => {
            const id = await createNew(scenario, suggestedName);
            if (!id) throw new Error("Cloud sync must be ready to create a new house.");
          },
        }
      );
      if (!applied) throw new Error("Import preview is no longer valid.");
      const message =
        mode === "new"
          ? `Imported ${result.preview.houseName ?? "scenario"} as a new house.`
          : `Imported scenario into ${houseName}; house identity was preserved.`;
      setSuccess(message);
      onNotify?.(message, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scenario import failed.";
      setFileError(message);
      onNotify?.(message, "error");
    } finally {
      setBusy(false);
    }
  }

  const ready = result?.status === "ready" ? result : null;
  const failed = result?.status === "error" ? result : null;

  return (
    <>
      <Stack spacing={1.25}>
        <Typography variant="body2" color="text.secondary">
          Restore a full export, raw scenario, or older house/category JSON. Nothing changes until
          validation passes and you confirm the preview.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => {
              resetDialog();
              setOpen(true);
            }}
          >
            Import scenario
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadOutlinedIcon />}
            onClick={() =>
              downloadScenarioJson(state, `house-${houseId}.json`, {
                id: houseId,
                houseId,
                name: houseName,
              })
            }
          >
            Download JSON backup
          </Button>
          <Typography variant="caption" color="text.secondary">
            Current target: {houseName} ({houseId})
          </Typography>
        </Stack>
      </Stack>

      <Dialog
        open={open}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        aria-labelledby="scenario-import-title"
        aria-describedby={success ? undefined : "scenario-import-description"}
      >
        <DialogTitle id="scenario-import-title">Import scenario safely</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {success ? (
            <Alert severity="success" variant="filled" role="status">
              {success}
            </Alert>
          ) : (
            <>
              <Typography id="scenario-import-description" variant="body2" color="text.secondary">
                Select JSON or paste it below. The current house remains unchanged while the import
                is parsed, validated, and previewed.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileOutlinedIcon />}
                  disabled={loading || busy}
                >
                  Choose JSON file
                  <input
                    hidden
                    type="file"
                    accept=".json,application/json,text/json"
                    onChange={(event) => void selectFile(event)}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                  {sourceName ?? "No file selected · maximum 5 MB"}
                </Typography>
              </Stack>

              <TextField
                label="Paste scenario JSON"
                placeholder='{ "scenario": { "v": 2, ... } }'
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setSourceName(null);
                  setResult(null);
                  setFileError(null);
                }}
                multiline
                minRows={5}
                maxRows={12}
                fullWidth
                disabled={loading || busy}
                slotProps={{ htmlInput: { spellCheck: false } }}
              />

              <Box>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <ContentPasteOutlinedIcon />
                    )
                  }
                  disabled={loading || busy || !text.trim()}
                  onClick={() => void preview()}
                >
                  {loading ? "Validating…" : "Validate and preview"}
                </Button>
              </Box>

              {!text.trim() && !loading && !fileError && !result ? (
                <Alert severity="info" variant="outlined">
                  No import data loaded yet. Choose a file or paste JSON to begin.
                </Alert>
              ) : null}

              {loading ? (
                <Stack direction="row" spacing={1} alignItems="center" role="status" sx={{ py: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2">Reading and validating scenario…</Typography>
                </Stack>
              ) : null}

              {fileError ? (
                <Alert severity="error" role="alert">
                  {fileError}
                </Alert>
              ) : null}

              {failed ? (
                <Stack spacing={1}>
                  <Alert severity="error" role="alert">
                    <Typography variant="subtitle2">Import cannot be applied</Typography>
                    <Box component="ul" sx={{ my: 0.5, pl: 2.25 }}>
                      {failed.errors.map((issue, index) => (
                        <li key={`${issue.path ?? "import"}-${index}`}>{issueText(issue)}</li>
                      ))}
                    </Box>
                  </Alert>
                  {failed.warnings.length > 0 ? (
                    <Alert severity="warning" variant="outlined">
                      <Box component="ul" sx={{ my: 0.5, pl: 2.25 }}>
                        {failed.warnings.map((warning, index) => (
                          <li key={`${warning.path ?? "warning"}-${index}`}>
                            {issueText(warning)}
                          </li>
                        ))}
                      </Box>
                    </Alert>
                  ) : null}
                </Stack>
              ) : null}

              {ready ? (
                <Stack spacing={1.5} className="pp-fade-in">
                  <Divider />
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Validated preview
                      </Typography>
                      <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                        {ready.preview.houseName ?? "Unnamed imported house"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Source house ID: {ready.preview.houseId ?? "not provided"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignContent="flex-start">
                      <Chip size="small" color="success" label="0 errors" />
                      <Chip size="small" label={ready.preview.formatLabel} />
                      <Chip size="small" label={ready.preview.versionLabel} />
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${ready.preview.knownFieldCount}/${ready.preview.fieldCount} known fields`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${ready.preview.sectionCount} sections`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${ready.preview.unknownFieldCount} unknown preserved`}
                    />
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                      gap: 1,
                    }}
                  >
                    {ready.preview.kpis.map((kpi) => {
                      const delta = kpi.after - kpi.before;
                      return (
                        <Box
                          key={kpi.id}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1.5,
                            p: 1.25,
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {kpi.label}
                          </Typography>
                          <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap">
                            <Typography className="pp-mono" variant="body2">
                              {money.format(kpi.before)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" aria-hidden="true">
                              →
                            </Typography>
                            <Typography className="pp-mono" fontWeight={700}>
                              {money.format(kpi.after)}
                            </Typography>
                            <Typography
                              className="pp-mono"
                              variant="caption"
                              color={delta === 0 ? "text.secondary" : delta > 0 ? "success.main" : "warning.main"}
                            >
                              ({delta >= 0 ? "+" : ""}
                              {money.format(delta)})
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Box>

                  {ready.warnings.length > 0 ? (
                    <Alert severity="warning" variant="outlined">
                      <Typography variant="subtitle2">
                        {ready.warnings.length} warning{ready.warnings.length === 1 ? "" : "s"}
                      </Typography>
                      <Box component="ul" sx={{ my: 0.5, pl: 2.25 }}>
                        {ready.warnings.map((warning, index) => (
                          <li key={`${warning.path ?? "warning"}-${index}`}>
                            {issueText(warning)}
                          </li>
                        ))}
                      </Box>
                    </Alert>
                  ) : (
                    <Alert severity="success" variant="outlined">
                      Validation passed without warnings.
                    </Alert>
                  )}

                  <FormControl>
                    <FormLabel id="scenario-import-target-label">Import target</FormLabel>
                    <RadioGroup
                      aria-labelledby="scenario-import-target-label"
                      value={mode}
                      onChange={(event) => setMode(event.target.value as ScenarioImportMode)}
                    >
                      <FormControlLabel
                        value="current"
                        control={<Radio />}
                        label={`Replace scenario in ${houseName} (${houseId}); preserve its ID and metadata`}
                      />
                      <FormControlLabel
                        value="new"
                        disabled={!cloudReady}
                        control={<Radio />}
                        label={
                          cloudReady
                            ? "Create a new cloud house; assign a new ID and use the imported name"
                            : "Create a new house (available when cloud sync is ready)"
                        }
                      />
                    </RadioGroup>
                  </FormControl>

                  {mode === "current" ? (
                    <Alert severity="warning">
                      Confirming replaces only the current scenario fields. The current house ID,
                      name, owner, collaborators, and other metadata stay unchanged.
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      A separate house will be created. The source ID will not overwrite an existing
                      ID.
                    </Alert>
                  )}
                </Stack>
              ) : null}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 0.5 }}>
          {success ? (
            <Button variant="contained" color="secondary" onClick={closeDialog}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={closeDialog} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color={mode === "current" ? "warning" : "secondary"}
                disabled={!ready || busy || (mode === "new" && !cloudReady)}
                startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
                onClick={() => void confirmImport()}
              >
                {busy
                  ? "Importing…"
                  : mode === "new"
                    ? "Create new house"
                    : "Replace current scenario"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
