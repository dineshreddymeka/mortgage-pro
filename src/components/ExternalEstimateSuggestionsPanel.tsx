import CheckBoxOutlineBlankOutlinedIcon from "@mui/icons-material/CheckBoxOutlineBlankOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";
import { applyExternalEstimates } from "../estimates/applyExternalEstimate";
import { fetchExternalEstimates, flattenEstimateSuggestions } from "../estimates/estimateClient";
import { isEstimateProxyConfigured } from "../estimates/providers/index";
import type { EstimateCategory, ExternalEstimateSuggestion } from "../estimates/types";
import { FormField, FormGrid } from "../layout/FormGrid";
import { FORM_CONTAINER_NAME, formContainerBreakpoints } from "../layout/formLayout";
import type { AppPersisted } from "../storage/mortgageState";

/** Bound only the suggestion list — not the whole panel form. */
const SUGGESTION_LIST_MAX_HEIGHT_PX = 280;

const selectionControlSx = {
  minWidth: 36,
  minHeight: 36,
  "@media (pointer: coarse)": { minWidth: 44, minHeight: 44 },
} as const;

const money = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toFixed(3)}%`;

function formatValue(s: ExternalEstimateSuggestion): string {
  if (s.unit.includes("%")) return pct(s.value);
  if (s.unit.toLowerCase().includes("usd")) return money.format(s.value);
  return `${s.value} ${s.unit}`;
}

function confidenceColor(confidence: ExternalEstimateSuggestion["confidence"]): "warning" | "info" | "success" {
  if (confidence === "low") return "warning";
  if (confidence === "medium") return "info";
  return "success";
}

export type ExternalEstimateSuggestionsPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  /** Limit which suggestion categories appear in this panel. */
  categories: EstimateCategory[];
  title?: string;
  /** The containing widget already supplies the section heading. */
  hideTitle?: boolean;
  onNotify?: (message: string, severity?: "success" | "error") => void;
};

export function ExternalEstimateSuggestionsPanel({
  state,
  patch,
  categories,
  title = "External estimate suggestions",
  hideTitle = false,
  onNotify,
}: ExternalEstimateSuggestionsPanelProps) {
  const categorySet = useMemo(() => new Set(categories), [categories]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(true);
  const [suggestions, setSuggestions] = useState<ExternalEstimateSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const visible = useMemo(
    () => suggestions.filter((s) => categorySet.has(s.category)),
    [categorySet, suggestions]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundles = await fetchExternalEstimates(state, {
        preferOfflineOnly: !isEstimateProxyConfigured(),
        bypassCache: false,
      });
      const flat = flattenEstimateSuggestions(bundles).filter((s) => categorySet.has(s.category));
      setSuggestions(flat);
      setOffline(bundles.every((b) => b.offline));
      setSelected(new Set());
      setLoaded(true);
      if (flat.length === 0) setError("No suggestions returned for this panel.");
    } catch (err) {
      setSuggestions([]);
      setLoaded(true);
      setError(err instanceof Error ? err.message : "Could not load suggestions");
    } finally {
      setLoading(false);
    }
  }, [categorySet, state]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmApply() {
    const picked = visible.filter((s) => selected.has(s.id));
    const { nextState, applied } = applyExternalEstimates(state, picked);
    if (applied.length > 0) patch(nextState);
    setConfirmOpen(false);
    setSelected(new Set());
    onNotify?.(
      applied.length > 0
        ? `Applied ${applied.length} suggestion${applied.length === 1 ? "" : "s"}. Review inputs before saving.`
        : "Nothing applied.",
      applied.length > 0 ? "success" : "error"
    );
  }

  const empty = loaded && !loading && !error && visible.length === 0;
  const lowConfidenceOnly = visible.length > 0 && visible.every((s) => s.confidence === "low");

  return (
    <Stack
      spacing={1.25}
      sx={{ containerType: "inline-size", containerName: FORM_CONTAINER_NAME }}
    >
      <FormGrid maxColumns={2} compact>
        {!hideTitle ? (
          <FormField>
            <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 0.5 }}>
              {title}
            </Typography>
          </FormField>
        ) : null}
        <FormField span={hideTitle ? 2 : 1}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            startIcon={loading ? <CircularProgress size={14} /> : <RefreshOutlinedIcon sx={{ fontSize: 16 }} />}
            disabled={loading || state.homePrice <= 0}
            onClick={() => void load()}
          >
            {loaded ? "Refresh suggestions" : "Fetch suggestions"}
          </Button>
        </FormField>
      </FormGrid>

      {state.homePrice <= 0 ? (
        <Alert severity="info" variant="outlined">
          Enter a purchase price to fetch external estimate suggestions.
        </Alert>
      ) : null}

      {offline && loaded && visible.length > 0 ? (
        <Alert severity="warning" icon={<CloudOffOutlinedIcon />} variant="outlined">
          <Typography variant="body2" fontWeight={700}>
            Offline stub — low confidence
          </Typography>
          <Typography variant="caption" display="block">
            Heuristic placeholders only. Nothing is applied automatically — check suggestions and confirm apply.
          </Typography>
        </Alert>
      ) : null}

      {lowConfidenceOnly && !offline ? (
        <Alert severity="warning" variant="outlined">
          All suggestions are low confidence. Verify against primary sources before applying.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" variant="outlined" action={<Button size="small" onClick={() => void load()}>Retry</Button>}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading suggestions…
          </Typography>
        </Stack>
      ) : null}

      {!loaded && !loading && !error ? (
        <Box sx={{ py: 1.5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Fetch suggestions to compare external benchmarks with your inputs.
          </Typography>
        </Box>
      ) : null}

      {empty ? (
        <Box sx={{ py: 1.5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No suggestions in {categories.join(", ")} for this scenario.
          </Typography>
        </Box>
      ) : null}

      {visible.length > 0 ? (
        <Stack
          spacing={0.75}
          role="list"
          aria-label="External estimate suggestions"
          sx={{
            maxHeight: SUGGESTION_LIST_MAX_HEIGHT_PX,
            overflow: "auto",
            pr: 0.25,
          }}
        >
          {visible.map((s) => (
            <Box
              key={s.id}
              role="listitem"
              sx={{
                px: 1,
                py: 0.75,
                borderRadius: 1.25,
                border: "1px solid",
                borderColor: selected.has(s.id) ? "secondary.main" : "divider",
                bgcolor: (t) =>
                  selected.has(s.id)
                    ? t.palette.mode === "light"
                      ? "secondary.50"
                      : "action.selected"
                    : "transparent",
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="flex-start">
                <Checkbox
                  size="small"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  inputProps={{ "aria-label": `Select ${s.label}` }}
                  sx={{ ...selectionControlSx, mt: -0.25 }}
                />
                <Stack spacing={0.35} flex={1} minWidth={0}>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={650}>
                      {s.label}
                    </Typography>
                    <Chip size="small" label={s.confidence} color={confidenceColor(s.confidence)} variant="outlined" />
                    {offline ? (
                      <Chip size="small" icon={<CloudOffOutlinedIcon />} label="offline stub" color="warning" />
                    ) : null}
                  </Stack>
                  <Typography variant="body2" className="pp-mono">
                    {formatValue(s)} · {s.source}
                  </Typography>
                  {s.rationale ? (
                    <Typography variant="caption" color="text.secondary">
                      {s.rationale}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}

      {visible.length > 0 ? (
        <Stack
          spacing={1}
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            [`@container ${FORM_CONTAINER_NAME} (min-width: ${formContainerBreakpoints.twoCol}px)`]: {
              flexDirection: "row",
              alignItems: "center",
            },
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={selected.size === visible.length && visible.length > 0}
                indeterminate={selected.size > 0 && selected.size < visible.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((s) => s.id)) : new Set())}
                sx={selectionControlSx}
              />
            }
            label={`Select all (${selected.size}/${visible.length})`}
          />
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={selected.size === 0}
            startIcon={<CheckBoxOutlineBlankOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setConfirmOpen(true)}
          >
            Apply selected ({selected.size})
          </Button>
        </Stack>
      ) : null}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Apply selected suggestions?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body2" gutterBottom>
              This will overwrite matching scenario fields. Nothing applies without this confirm.
              Offline stubs and low-confidence rows should be verified against primary sources.
            </Typography>
            <Stack component="ul" sx={{ pl: 2, m: 0 }} spacing={0.5}>
              {visible
                .filter((s) => selected.has(s.id))
                .map((s) => (
                  <Typography component="li" variant="body2" key={s.id}>
                    {s.label}: {formatValue(s)} ({s.confidence}
                    {offline ? ", offline stub" : ""})
                  </Typography>
                ))}
            </Stack>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={confirmApply}>
            Apply to scenario
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
