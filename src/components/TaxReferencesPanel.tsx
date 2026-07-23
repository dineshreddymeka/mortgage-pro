import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import {
  buildTaxResourcePack,
  filterTaxResources,
  filterTaxResourcesByJurisdiction,
  focusTopicsForVariant,
  getTopicGuide,
  listTopicGuides,
  relevantTaxTopics,
  resolveRelatedResources,
  TAX_JURISDICTIONS,
  taxJurisdictionLabel,
  type TaxJurisdiction,
  type TaxResourceEntry,
  type TaxTopicGuide,
} from "../lib/taxResourcePack";
import type { AppPersisted } from "../storage/mortgageState";
import {
  isCuratedReferenceSaved,
  newResearchId,
  taxIssueFromCurated,
  taxIssueTopicLabel,
  TAX_ISSUE_TOPICS,
  type ExternalTaxResearchLinkStatus,
  type ResearchPersisted,
  type TaxIssueJurisdiction,
  type TaxIssuePersisted,
  type TaxIssueTopic,
} from "../storage/researchNotes";
import {
  collectHouseTaxResearch,
  isTaxResearchApiConfigured,
  TaxResearchClientError,
} from "../taxResearch/taxResearchClient";
import {
  collectionStatusChipColor,
  formatCollectionStatusLabel,
  formatTaxResearchFreshness,
  isMergedReferenceSaved,
  mergeExternalSnapshotIntoResearch,
  mergeTaxReferenceRows,
  taxIssueFromMergedRow,
} from "../taxResearch/mergeReferences";
import type { MergedTaxReferenceRow } from "../taxResearch/types";

function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function formatIsoDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function linkStatusLabel(status: ExternalTaxResearchLinkStatus | undefined): string | null {
  switch (status) {
    case "ok":
      return "Link OK";
    case "redirected":
      return "Redirected";
    case "broken":
      return "Broken link";
    case "unknown":
      return "Link unknown";
    default:
      return null;
  }
}

function linkStatusColor(status: ExternalTaxResearchLinkStatus | undefined): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "ok":
      return "success";
    case "redirected":
      return "warning";
    case "broken":
      return "error";
    default:
      return "default";
  }
}

export type TaxReferencesPanelProps = {
  state: AppPersisted;
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
  /** Compact embed on Rental / Exit tax panels. */
  compact?: boolean;
  focus?: "all" | "rental" | "exit";
  onOpenFullResearch?: () => void;
  /** Cloud property doc id — required for live collection in full Research tab. */
  activePropertyId?: string | null;
};

type ViewTab = "references" | "library" | "guides";

function ReferenceCard({
  entry,
  saved,
  highlighted,
  onToggleSave,
}: {
  entry: TaxResourceEntry;
  saved: boolean;
  highlighted?: boolean;
  onToggleSave: () => void;
}) {
  return (
    <Box
      sx={{
        p: 1,
        border: "1px solid",
        borderColor: saved ? "secondary.main" : "divider",
        borderRadius: 1,
        bgcolor: saved ? "action.selected" : "transparent",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              {entry.title}
            </Typography>
            <Chip size="small" label={taxJurisdictionLabel(entry.jurisdiction)} variant="outlined" />
            {highlighted ? <Chip size="small" label="Relevant" color="primary" variant="outlined" /> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            {entry.source} · {entry.blurb}
          </Typography>
        </Box>
        <IconButton
          size="small"
          aria-label={saved ? "Remove from my library" : "Save to my library"}
          color={saved ? "secondary" : "default"}
          onClick={onToggleSave}
        >
          {saved ? <BookmarkAddedIcon fontSize="small" /> : <BookmarkBorderOutlinedIcon fontSize="small" />}
        </IconButton>
        <IconButton
          size="small"
          aria-label="Open reference"
          component="a"
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

function MergedReferenceCard({
  row,
  saved,
  highlighted,
  onToggleSave,
}: {
  row: MergedTaxReferenceRow;
  saved: boolean;
  highlighted?: boolean;
  onToggleSave: () => void;
}) {
  const title = row.curated?.title ?? row.external?.title ?? "Reference";
  const source = row.external?.source ?? row.curated?.source ?? "Reference";
  const blurb = row.curated?.blurb ?? row.external?.excerpt ?? "";
  const url = row.curated?.url ?? row.external?.url;
  const href = url ? safeHref(url) : null;
  const published = formatIsoDate(row.external?.publishedAt);
  const retrieved = formatIsoDate(row.external?.retrievedAt ?? row.external?.publishedAt);
  const linkStatus = row.external?.linkStatus;
  const linkLabel = linkStatusLabel(linkStatus);

  return (
    <Box
      sx={{
        p: 1,
        border: "1px solid",
        borderColor: saved ? "secondary.main" : "divider",
        borderRadius: 1,
        bgcolor: saved ? "action.selected" : "transparent",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="body2" fontWeight={600}>
              {title}
            </Typography>
            <Chip size="small" label={taxJurisdictionLabel(row.jurisdiction)} variant="outlined" />
            {row.external ? <Chip size="small" label="Live / external" color="info" variant="outlined" /> : null}
            {highlighted ? <Chip size="small" label="Relevant" color="primary" variant="outlined" /> : null}
            {linkLabel ? (
              <Chip
                size="small"
                label={linkLabel}
                color={linkStatusColor(linkStatus)}
                variant="outlined"
                icon={linkStatus === "broken" ? <LinkOffOutlinedIcon /> : undefined}
              />
            ) : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            {source}
            {blurb ? ` · ${blurb}` : ""}
          </Typography>
          {row.external ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              {published ? `Published ${published}` : "Publication date unknown"}
              {retrieved ? ` · Retrieved ${retrieved}` : ""}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          size="small"
          aria-label={saved ? "Remove from my library" : "Save to my library"}
          color={saved ? "secondary" : "default"}
          onClick={onToggleSave}
        >
          {saved ? <BookmarkAddedIcon fontSize="small" /> : <BookmarkBorderOutlinedIcon fontSize="small" />}
        </IconButton>
        {href ? (
          <IconButton
            size="small"
            aria-label="Open reference"
            component="a"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
    </Box>
  );
}

function SavedReferenceRow({
  issue,
  onUpdateNotes,
  onRemove,
}: {
  issue: TaxIssuePersisted;
  onUpdateNotes: (notes: string) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => setExpanded(v)}
      disableGutters
      elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", borderRadius: "8px !important", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {issue.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {issue.jurisdiction ? `${taxJurisdictionLabel(issue.jurisdiction)} · ` : ""}
              {taxIssueTopicLabel(issue.topic)}
              {issue.source ? ` · ${issue.source}` : ""}
            </Typography>
          </Box>
          {issue.url && safeHref(issue.url) ? (
            <IconButton
              size="small"
              aria-label="Open saved reference"
              component="a"
              href={safeHref(issue.url)!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <TextField
          size="small"
          label="Your notes"
          multiline
          minRows={2}
          fullWidth
          value={issue.notes ?? ""}
          onChange={(e) => onUpdateNotes(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Button size="small" color="warning" onClick={onRemove}>
          Remove from library
        </Button>
      </AccordionDetails>
    </Accordion>
  );
}

function TopicGuidePanel({
  guide,
  pack,
  taxIssues,
  highlighted,
  onToggleSave,
}: {
  guide: TaxTopicGuide;
  pack: TaxResourceEntry[];
  taxIssues: TaxIssuePersisted[];
  highlighted: Set<TaxIssueTopic>;
  onToggleSave: (entry: TaxResourceEntry) => void;
}) {
  const related = resolveRelatedResources(pack, guide);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  return (
    <Stack spacing={1.25}>
      <Typography variant="body2" color="text.secondary">
        {guide.summary}
      </Typography>
      <Typography variant="subtitle2">Diligence checklist</Typography>
      <Stack spacing={0.5}>
        {guide.checklist.map((item, i) => (
          <FormControlLabel
            key={item}
            control={
              <Checkbox
                size="small"
                checked={checked.has(i)}
                onChange={(_, on) => {
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(i);
                    else next.delete(i);
                    return next;
                  });
                }}
              />
            }
            label={<Typography variant="body2">{item}</Typography>}
          />
        ))}
      </Stack>
      <Typography variant="subtitle2">Related references</Typography>
      <Stack spacing={0.75}>
        {related.map((entry) => (
          <ReferenceCard
            key={entry.id}
            entry={entry}
            saved={isCuratedReferenceSaved(taxIssues, entry)}
            highlighted={highlighted.has(entry.topic)}
            onToggleSave={() => onToggleSave(entry)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

export function TaxReferencesPanel({
  state,
  research,
  onChange,
  compact = false,
  focus = "all",
  onOpenFullResearch,
  activePropertyId = null,
}: TaxReferencesPanelProps) {
  const taxIssues = useMemo(() => research.taxIssues ?? [], [research.taxIssues]);
  const externalSnapshot = research.externalTaxResearch;
  const [view, setView] = useState<ViewTab>("references");
  const [search, setSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState<TaxJurisdiction | "all">("all");
  const [topicFilter, setTopicFilter] = useState<TaxIssueTopic | "all">("all");
  const [guideTopic, setGuideTopic] = useState<TaxIssueTopic>("property_tax");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [manualTopic, setManualTopic] = useState<TaxIssueTopic>("other");
  const [manualJurisdiction, setManualJurisdiction] = useState<TaxIssueJurisdiction>("county");
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectProgress, setCollectProgress] = useState<string | null>(null);

  const pack = useMemo(() => buildTaxResourcePack(state), [state]);
  const highlighted = useMemo(() => {
    const base = relevantTaxTopics(state);
    if (focus === "all") return base;
    const variantTopics = focusTopicsForVariant(focus);
    return new Set([...base].filter((t) => variantTopics.has(t)));
  }, [state, focus]);

  const filteredPack = useMemo(() => {
    let rows = pack;
    if (focus !== "all") {
      const variantTopics = focusTopicsForVariant(focus);
      rows = rows.filter((r) => variantTopics.has(r.topic) || r.jurisdiction !== "federal");
    }
    rows = filterTaxResourcesByJurisdiction(rows, jurisdictionFilter);
    rows = filterTaxResources(rows, topicFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q) ||
          r.blurb.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [pack, focus, jurisdictionFilter, topicFilter, search]);

  const mergedReferences = useMemo(() => {
    let rows = mergeTaxReferenceRows(filteredPack, externalSnapshot?.normalizedReferences);
    if (focus !== "all") {
      const variantTopics = focusTopicsForVariant(focus);
      rows = rows.filter(
        (row) =>
          variantTopics.has(row.curated?.topic ?? row.external?.topic ?? "other") ||
          row.jurisdiction !== "federal"
      );
    }
    if (topicFilter !== "all") {
      rows = rows.filter((row) => (row.curated?.topic ?? row.external?.topic) === topicFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) => {
        const titleText = (row.curated?.title ?? row.external?.title ?? "").toLowerCase();
        const sourceText = (row.curated?.source ?? row.external?.source ?? "").toLowerCase();
        const blurbText = (row.curated?.blurb ?? row.external?.excerpt ?? "").toLowerCase();
        return titleText.includes(q) || sourceText.includes(q) || blurbText.includes(q);
      });
    }
    return rows;
  }, [filteredPack, externalSnapshot?.normalizedReferences, focus, topicFilter, search]);

  const groupedMerged = useMemo(() => {
    const grouped: Record<TaxJurisdiction, MergedTaxReferenceRow[]> = {
      county: [],
      state: [],
      federal: [],
    };
    for (const row of mergedReferences) {
      if (jurisdictionFilter !== "all" && row.jurisdiction !== jurisdictionFilter) continue;
      grouped[row.jurisdiction].push(row);
    }
    return grouped;
  }, [mergedReferences, jurisdictionFilter]);

  const filteredSaved = useMemo(() => {
    let rows = taxIssues;
    if (jurisdictionFilter !== "all") rows = rows.filter((t) => t.jurisdiction === jurisdictionFilter);
    if (topicFilter !== "all") rows = rows.filter((t) => t.topic === topicFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.source ?? "").toLowerCase().includes(q) ||
          (t.notes ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [taxIssues, jurisdictionFilter, topicFilter, search]);

  const canCollect = !compact && Boolean(activePropertyId?.trim());
  const hasSnapshot = Boolean(externalSnapshot);
  const apiConfigured = isTaxResearchApiConfigured();

  const runCollection = useCallback(
    async (forceRefresh: boolean) => {
      if (!activePropertyId?.trim()) {
        setCollectError("Select a saved house before collecting tax references.");
        return;
      }
      if (!apiConfigured) {
        setCollectError(
          "Tax research API URL is not configured. Set VITE_TAX_RESEARCH_API_BASE_URL or VITE_ESTIMATE_API_BASE_URL."
        );
        return;
      }

      setCollecting(true);
      setCollectError(null);
      setCollectProgress(forceRefresh ? "Refreshing official tax sources…" : "Collecting from official tax sources…");
      try {
        const result = await collectHouseTaxResearch({
          state,
          propertyDocId: activePropertyId,
          forceRefresh,
          persist: true,
        });
        onChange(mergeExternalSnapshotIntoResearch(research, result.snapshot));
        setCollectProgress(
          result.cacheHit
            ? "Loaded cached official references."
            : result.snapshot.collectionStatus === "partial"
              ? "Collection finished with partial results."
              : "Official references collected."
        );
      } catch (err) {
        const message =
          err instanceof TaxResearchClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Tax research collection failed.";
        setCollectError(message);
        setCollectProgress(null);
      } finally {
        setCollecting(false);
      }
    },
    [activePropertyId, apiConfigured, onChange, research, state]
  );

  function toggleSave(entry: TaxResourceEntry) {
    if (isCuratedReferenceSaved(taxIssues, entry)) {
      onChange({
        ...research,
        taxIssues: taxIssues.filter(
          (t) => t.curatedRefId !== entry.id && !(t.url === entry.url && t.title === entry.title)
        ),
      });
      return;
    }
    onChange({
      ...research,
      taxIssues: [taxIssueFromCurated(entry), ...taxIssues].slice(0, 50),
    });
  }

  function toggleSaveMerged(row: MergedTaxReferenceRow) {
    if (isMergedReferenceSaved(taxIssues, row)) {
      onChange({
        ...research,
        taxIssues: taxIssues.filter((issue) => {
          if (row.curated && issue.curatedRefId === row.curated.id) return false;
          if (row.external?.externalRefId && issue.curatedRefId === row.external.externalRefId) return false;
          const url = row.curated?.url ?? row.external?.url;
          if (url && issue.url === url) return false;
          return true;
        }),
      });
      return;
    }
    onChange({
      ...research,
      taxIssues: [taxIssueFromMergedRow(row), ...taxIssues].slice(0, 50),
    });
  }

  function updateSavedNotes(id: string, notesText: string) {
    onChange({
      ...research,
      taxIssues: taxIssues.map((t) => (t.id === id ? { ...t, notes: notesText.slice(0, 2000) || undefined } : t)),
    });
  }

  function removeSaved(id: string) {
    onChange({ ...research, taxIssues: taxIssues.filter((t) => t.id !== id) });
  }

  function addManual() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const href = url.trim() ? safeHref(url) : null;
    onChange({
      ...research,
      taxIssues: [
        {
          id: newResearchId(),
          topic: manualTopic,
          title: trimmed.slice(0, 200),
          jurisdiction: manualJurisdiction,
          addedAt: new Date().toISOString(),
          ...(href ? { url: href } : {}),
          ...(notes.trim() ? { notes: notes.trim().slice(0, 2000) } : {}),
          ...(source.trim() ? { source: source.trim().slice(0, 80) } : {}),
        },
        ...taxIssues,
      ].slice(0, 50),
    });
    setTitle("");
    setUrl("");
    setNotes("");
    setSource("");
  }

  const activeGuide = getTopicGuide(guideTopic);
  const referenceCount = mergedReferences.length;

  return (
    <Stack spacing={1.25}>
      {!compact ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.35 }}>
          <Typography variant="caption" sx={{ lineHeight: 1.4, display: "block" }}>
            Interactive reference library — bookmark links, check diligence items, add notes. Not tax
            advice. Property tax <strong>amounts</strong>: External estimates on Property.
          </Typography>
        </Alert>
      ) : null}

      {canCollect ? (
        <Box sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">Official tax references</Typography>
              <Typography variant="caption" color="text.secondary">
                {hasSnapshot
                  ? formatTaxResearchFreshness(externalSnapshot)
                  : "Collect live links from official federal, state, and county sources for this address."}
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              disabled={collecting || !apiConfigured}
              startIcon={
                collecting ? <CircularProgress size={14} /> : hasSnapshot ? <RefreshOutlinedIcon sx={{ fontSize: 16 }} /> : <CloudSyncOutlinedIcon sx={{ fontSize: 16 }} />
              }
              onClick={() => void runCollection(hasSnapshot)}
            >
              {hasSnapshot ? "Refresh" : "Collect from official sites"}
            </Button>
          </Stack>

          {hasSnapshot ? (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip
                size="small"
                label={formatCollectionStatusLabel(externalSnapshot?.collectionStatus)}
                color={collectionStatusChipColor(externalSnapshot?.collectionStatus)}
              />
              {externalSnapshot?.sourceProvenance?.provider ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Source: ${externalSnapshot.sourceProvenance.provider}${
                    externalSnapshot.sourceProvenance.providerVersion
                      ? ` v${externalSnapshot.sourceProvenance.providerVersion}`
                      : ""
                  }`}
                />
              ) : null}
            </Stack>
          ) : null}

          {externalSnapshot?.sourceProvenance?.sources?.length ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              Provenance: {externalSnapshot.sourceProvenance.sources.slice(0, 3).join(" · ")}
              {externalSnapshot.sourceProvenance.sources.length > 3
                ? ` · +${externalSnapshot.sourceProvenance.sources.length - 3} more`
                : ""}
            </Typography>
          ) : null}

          {collectProgress ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              {collectProgress}
            </Typography>
          ) : null}

          {!apiConfigured ? (
            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
              Configure `VITE_TAX_RESEARCH_API_BASE_URL` or `VITE_ESTIMATE_API_BASE_URL` to enable live collection.
            </Alert>
          ) : null}

          {collectError ? (
            <Alert
              severity="error"
              variant="outlined"
              sx={{ mt: 1 }}
              action={
                <Button size="small" onClick={() => void runCollection(true)}>
                  Retry
                </Button>
              }
            >
              {collectError}
            </Alert>
          ) : null}

          {externalSnapshot?.errors?.length ? (
            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Partial collection failures
              </Typography>
              <Stack spacing={0.35}>
                {externalSnapshot.errors.slice(0, 5).map((err) => (
                  <Typography key={`${err.code}-${err.message}`} variant="caption" display="block">
                    {err.code}: {err.message}
                    {err.source ? ` (${err.source})` : ""}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          ) : null}
        </Box>
      ) : null}

      {!compact && !activePropertyId ? (
        <Alert severity="info" variant="outlined">
          Save this house to your cloud portfolio to collect live official tax references for the current address.
        </Alert>
      ) : null}

      {compact && hasSnapshot ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.35 }}>
          <Typography variant="caption" display="block">
            {formatCollectionStatusLabel(externalSnapshot?.collectionStatus)} · {formatTaxResearchFreshness(externalSnapshot)}
          </Typography>
        </Alert>
      ) : null}

      <TextField
        size="small"
        placeholder="Search references…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18 }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label="All levels"
          color={jurisdictionFilter === "all" ? "secondary" : "default"}
          variant={jurisdictionFilter === "all" ? "filled" : "outlined"}
          onClick={() => setJurisdictionFilter("all")}
        />
        {TAX_JURISDICTIONS.map((j) => (
          <Chip
            key={j}
            size="small"
            label={taxJurisdictionLabel(j)}
            color={jurisdictionFilter === j ? "secondary" : "default"}
            variant={jurisdictionFilter === j ? "filled" : "outlined"}
            onClick={() => setJurisdictionFilter(j)}
          />
        ))}
      </Stack>

      {!compact ? (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label="All topics"
            color={topicFilter === "all" ? "secondary" : "default"}
            variant={topicFilter === "all" ? "filled" : "outlined"}
            onClick={() => setTopicFilter("all")}
          />
          {TAX_ISSUE_TOPICS.map((topic) => (
            <Chip
              key={topic}
              size="small"
              label={taxIssueTopicLabel(topic)}
              color={topicFilter === topic ? "secondary" : highlighted.has(topic) ? "primary" : "default"}
              variant={topicFilter === topic ? "filled" : "outlined"}
              onClick={() => {
                setTopicFilter(topic);
                setGuideTopic(topic);
              }}
            />
          ))}
        </Stack>
      ) : null}

      <Tabs
        value={view}
        onChange={(_, v: ViewTab) => setView(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5, textTransform: "none" } }}
      >
        <Tab value="references" label={`References (${referenceCount})`} icon={<OpenInNewIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab value="library" label={`My library (${taxIssues.length})`} icon={<BookmarkAddedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab value="guides" label="Topic guides" icon={<MenuBookOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>

      {view === "references" ? (
        <Stack spacing={1}>
          {(["county", "state", "federal"] as const).map((j) => {
            const items = groupedMerged[j];
            if (items.length === 0) return null;
            return (
              <Accordion
                key={j}
                defaultExpanded={j === "county" || (j === "state" && groupedMerged.county.length === 0)}
                disableGutters
                elevation={0}
                sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">
                    {taxJurisdictionLabel(j)} ({items.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Stack spacing={0.75}>
                    {items.map((row) => (
                      <MergedReferenceCard
                        key={row.key}
                        row={row}
                        saved={isMergedReferenceSaved(taxIssues, row)}
                        highlighted={highlighted.has(row.curated?.topic ?? row.external?.topic ?? "other")}
                        onToggleSave={() => toggleSaveMerged(row)}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {referenceCount === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No references match your filters{hasSnapshot ? "" : " — collect from official sites or adjust filters"}.
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {view === "library" ? (
        <Stack spacing={1}>
          {filteredSaved.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No saved references — bookmark items from the References tab.
            </Typography>
          ) : (
            filteredSaved.map((issue) => (
              <SavedReferenceRow
                key={issue.id}
                issue={issue}
                onUpdateNotes={(n) => updateSavedNotes(issue.id, n)}
                onRemove={() => removeSaved(issue.id)}
              />
            ))
          )}
          {!compact ? (
            <Box sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Add custom reference
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1.2, minWidth: 140 }} />
                <TextField size="small" select label="Level" value={manualJurisdiction} onChange={(e) => setManualJurisdiction(e.target.value as TaxIssueJurisdiction)} sx={{ minWidth: 120 }}>
                  {TAX_JURISDICTIONS.map((j) => (
                    <MenuItem key={j} value={j}>{taxJurisdictionLabel(j)}</MenuItem>
                  ))}
                </TextField>
                <TextField size="small" select label="Topic" value={manualTopic} onChange={(e) => setManualTopic(e.target.value as TaxIssueTopic)} sx={{ minWidth: 130 }}>
                  {TAX_ISSUE_TOPICS.map((t) => (
                    <MenuItem key={t} value={t}>{taxIssueTopicLabel(t)}</MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="URL" value={url} onChange={(e) => setUrl(e.target.value)} sx={{ flex: 1.4, minWidth: 160 }} />
                <Button size="small" variant="outlined" disabled={!title.trim()} onClick={addManual}>Add</Button>
              </Stack>
              <TextField size="small" label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
            </Box>
          ) : null}
        </Stack>
      ) : null}

      {view === "guides" ? (
        <Stack spacing={1.25}>
          <TextField
            size="small"
            select
            label="Topic guide"
            value={guideTopic}
            onChange={(e) => setGuideTopic(e.target.value as TaxIssueTopic)}
            fullWidth
          >
            {listTopicGuides().map((g) => (
              <MenuItem key={g.topic} value={g.topic}>
                {g.title}
              </MenuItem>
            ))}
          </TextField>
          {activeGuide ? (
            <TopicGuidePanel
              guide={activeGuide}
              pack={pack}
              taxIssues={taxIssues}
              highlighted={highlighted}
              onToggleSave={toggleSave}
            />
          ) : null}
        </Stack>
      ) : null}

      {compact && onOpenFullResearch ? (
        <Button size="small" variant="text" onClick={onOpenFullResearch}>
          Open full reference library in Research tab
        </Button>
      ) : null}
    </Stack>
  );
}
