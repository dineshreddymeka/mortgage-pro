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
import useMediaQuery from "@mui/material/useMediaQuery";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { researchSafeHref, researchUrlFieldError } from "../lib/researchHelpers";
import { useResearchNotesBuffer } from "../lib/useResearchNotesBuffer";
import { FormField, FormGrid } from "../layout/FormGrid";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../layout/formLayout";
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
import { WIDGET_STACK_MAX_WIDTH_PX } from "../widgets/WidgetBoard";

const chromeFontSx = { fontSize: `${minOperationalFontPx}px` } as const;

const touchTargetSx = {
  minHeight: touchTargetFinePx,
  "@media (pointer: coarse)": {
    minHeight: touchTargetCoarsePx,
  },
} as const;

const rowActionSx = {
  minWidth: touchTargetFinePx,
  minHeight: touchTargetFinePx,
  "@media (pointer: coarse)": {
    minWidth: touchTargetCoarsePx,
    minHeight: touchTargetCoarsePx,
  },
} as const;

const accordionSummarySx = {
  ...touchTargetSx,
  px: 0.75,
  "& .MuiAccordionSummary-content": { my: 0.35 },
} as const;

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

function linkStatusColor(
  status: ExternalTaxResearchLinkStatus | undefined
): "default" | "success" | "warning" | "error" {
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
      className="pp-tax-ref-row"
      sx={{
        px: 0.75,
        py: 0.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: saved ? "action.selected" : "transparent",
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ lineHeight: 1.3, ...chromeFontSx }}
            >
              {entry.title}
            </Typography>
            <Chip
              size="small"
              label={taxJurisdictionLabel(entry.jurisdiction)}
              variant="outlined"
              sx={{ height: 20, ...chromeFontSx }}
            />
            {highlighted ? (
              <Chip
                size="small"
                label="Relevant"
                color="primary"
                variant="outlined"
                className="pp-tax-ref-extra"
                sx={{ height: 20, ...chromeFontSx }}
              />
            ) : null}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
            className="pp-tax-ref-blurb"
            sx={chromeFontSx}
          >
            {entry.source}
            <Box component="span" className="pp-tax-ref-extra">
              {` · ${entry.blurb}`}
            </Box>
          </Typography>
        </Box>
        <IconButton
          size="small"
          aria-label={saved ? "Remove from my library" : "Save to my library"}
          color={saved ? "secondary" : "default"}
          onClick={onToggleSave}
          sx={rowActionSx}
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
          sx={rowActionSx}
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
  const href = url ? researchSafeHref(url) : null;
  const published = formatIsoDate(row.external?.publishedAt);
  const retrieved = formatIsoDate(row.external?.retrievedAt ?? row.external?.publishedAt);
  const linkStatus = row.external?.linkStatus;
  const linkLabel = linkStatusLabel(linkStatus);

  return (
    <Box
      className="pp-tax-ref-row"
      sx={{
        px: 0.75,
        py: 0.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: saved ? "action.selected" : "transparent",
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ lineHeight: 1.3, ...chromeFontSx }}
            >
              {title}
            </Typography>
            <Chip
              size="small"
              label={taxJurisdictionLabel(row.jurisdiction)}
              variant="outlined"
              sx={{ height: 20, ...chromeFontSx }}
            />
            {row.external ? (
              <Chip
                size="small"
                label="Live"
                color="info"
                variant="outlined"
                className="pp-tax-ref-extra"
                sx={{ height: 20, ...chromeFontSx }}
              />
            ) : null}
            {highlighted ? (
              <Chip
                size="small"
                label="Relevant"
                color="primary"
                variant="outlined"
                className="pp-tax-ref-extra"
                sx={{ height: 20, ...chromeFontSx }}
              />
            ) : null}
            {linkLabel ? (
              <Chip
                size="small"
                label={linkLabel}
                color={linkStatusColor(linkStatus)}
                variant="outlined"
                className="pp-tax-ref-extra"
                sx={{ height: 20, ...chromeFontSx }}
                icon={linkStatus === "broken" ? <LinkOffOutlinedIcon /> : undefined}
              />
            ) : null}
          </Stack>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            noWrap
            sx={chromeFontSx}
          >
            {source}
            {blurb ? (
              <Box component="span" className="pp-tax-ref-extra">
                {` · ${blurb}`}
              </Box>
            ) : null}
          </Typography>
          {row.external ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              noWrap
              className="pp-tax-ref-extra"
              sx={chromeFontSx}
            >
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
          sx={rowActionSx}
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
            sx={rowActionSx}
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
  const onCommit = useCallback((value: string) => onUpdateNotes(value), [onUpdateNotes]);
  const { draft, setDraft, flush } = useResearchNotesBuffer(issue.id, issue.notes, onCommit);
  const href = issue.url ? researchSafeHref(issue.url) : null;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, v) => setExpanded(v)}
      disableGutters
      elevation={0}
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: "0 !important",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap sx={chromeFontSx}>
            {issue.title}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            display="block"
            sx={chromeFontSx}
          >
            {issue.jurisdiction ? `${taxJurisdictionLabel(issue.jurisdiction)} · ` : ""}
            {taxIssueTopicLabel(issue.topic)}
            {issue.source ? ` · ${issue.source}` : ""}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 0.75 }}>
        <Stack spacing={1}>
          {href ? (
            <Button
              size="small"
              variant="text"
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<OpenInNewIcon fontSize="small" />}
              sx={{ alignSelf: "flex-start", ...touchTargetSx, ...chromeFontSx }}
            >
              Open reference
            </Button>
          ) : null}
          <TextField
            size="small"
            label="Your notes"
            multiline
            minRows={2}
            maxRows={4}
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={flush}
          />
          <Button size="small" color="warning" onClick={onRemove} sx={{ ...touchTargetSx, alignSelf: "flex-start" }}>
            Remove from library
          </Button>
        </Stack>
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
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
        {guide.summary}
      </Typography>
      <Typography variant="subtitle2">Diligence checklist</Typography>
      <Stack spacing={0.25}>
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
      <Stack spacing={0}>
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
  const [manualSubmitted, setManualSubmitted] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectProgress, setCollectProgress] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isNarrowViewport = useMediaQuery(`(max-width:${WIDGET_STACK_MAX_WIDTH_PX - 0.05}px)`);
  const fillHeight = !compact && !isNarrowViewport;

  useEffect(() => {
    if (collectError) setDetailsOpen(true);
  }, [collectError]);

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
  const manualUrlError = url.trim() ? researchUrlFieldError(url) : null;
  const showManualUrlError = manualSubmitted && Boolean(manualUrlError);

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
          const rowUrl = row.curated?.url ?? row.external?.url;
          if (rowUrl && issue.url === rowUrl) return false;
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
      taxIssues: taxIssues.map((t) =>
        t.id === id ? { ...t, notes: notesText.slice(0, 2000) || undefined } : t
      ),
    });
  }

  function removeSaved(id: string) {
    onChange({ ...research, taxIssues: taxIssues.filter((t) => t.id !== id) });
  }

  function addManual() {
    setManualSubmitted(true);
    const trimmed = title.trim();
    if (!trimmed) return;
    if (url.trim() && !researchSafeHref(url)) return;
    const href = url.trim() ? researchSafeHref(url) : null;
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
    setManualSubmitted(false);
  }

  function onManualSubmit(e: FormEvent) {
    e.preventDefault();
    addManual();
  }

  const activeGuide = getTopicGuide(guideTopic);
  const referenceCount = mergedReferences.length;
  const hasProvenanceOrErrors = Boolean(
    externalSnapshot?.sourceProvenance?.sources?.length ||
      externalSnapshot?.errors?.length ||
      collectError ||
      (!apiConfigured && canCollect)
  );

  const chrome = (
    <Stack spacing={1} sx={{ flexShrink: 0 }}>
      {!compact ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, ...chromeFontSx }}>
          Reference library for bookmarks and diligence — not tax advice. Amounts: External estimates on
          Property.
        </Typography>
      ) : null}

      {canCollect ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{
            px: 0.75,
            py: 0.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            ...touchTargetSx,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ flex: 1, minWidth: 140, ...chromeFontSx }}
          >
            {hasSnapshot
              ? formatTaxResearchFreshness(externalSnapshot)
              : "Collect official federal, state, and county links for this address."}
          </Typography>
          {hasSnapshot ? (
            <Chip
              size="small"
              label={formatCollectionStatusLabel(externalSnapshot?.collectionStatus)}
              color={collectionStatusChipColor(externalSnapshot?.collectionStatus)}
              sx={{ height: 22, ...chromeFontSx }}
            />
          ) : null}
          {externalSnapshot?.sourceProvenance?.provider ? (
            <Chip
              size="small"
              variant="outlined"
              sx={{ height: 22, ...chromeFontSx }}
              label={`${externalSnapshot.sourceProvenance.provider}${
                externalSnapshot.sourceProvenance.providerVersion
                  ? ` v${externalSnapshot.sourceProvenance.providerVersion}`
                  : ""
              }`}
            />
          ) : null}
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            disabled={collecting || !apiConfigured}
            startIcon={
              collecting ? (
                <CircularProgress size={14} />
              ) : hasSnapshot ? (
                <RefreshOutlinedIcon sx={{ fontSize: 16 }} />
              ) : (
                <CloudSyncOutlinedIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={() => void runCollection(hasSnapshot)}
            sx={{ ...touchTargetSx, ...chromeFontSx }}
          >
            {hasSnapshot ? "Refresh" : "Collect"}
          </Button>
          <Typography
            component="div"
            variant="caption"
            color="text.secondary"
            aria-live="polite"
            sx={{ width: "100%", minHeight: collectProgress ? undefined : 0, ...chromeFontSx }}
          >
            {collectProgress ?? ""}
          </Typography>
        </Stack>
      ) : null}

      {!compact && !activePropertyId ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.25 }}>
          Save this house to collect live official tax references for the current address.
        </Alert>
      ) : null}

      {compact && hasSnapshot ? (
        <Typography variant="caption" color="text.secondary" sx={chromeFontSx}>
          {formatCollectionStatusLabel(externalSnapshot?.collectionStatus)} ·{" "}
          {formatTaxResearchFreshness(externalSnapshot)}
        </Typography>
      ) : null}

      {canCollect && hasProvenanceOrErrors ? (
        <Accordion
          expanded={detailsOpen}
          onChange={(_, open) => setDetailsOpen(open)}
          disableGutters
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
            <Typography variant="caption" fontWeight={600} sx={chromeFontSx}>
              Provenance & errors
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={0.75}>
              {externalSnapshot?.sourceProvenance?.sources?.length ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={chromeFontSx}>
                  Provenance: {externalSnapshot.sourceProvenance.sources.slice(0, 3).join(" · ")}
                  {externalSnapshot.sourceProvenance.sources.length > 3
                    ? ` · +${externalSnapshot.sourceProvenance.sources.length - 3} more`
                    : ""}
                </Typography>
              ) : null}

              {!apiConfigured ? (
                <Alert severity="warning" variant="outlined">
                  Configure `VITE_TAX_RESEARCH_API_BASE_URL` or `VITE_ESTIMATE_API_BASE_URL` to enable live
                  collection.
                </Alert>
              ) : null}

              {collectError ? (
                <Alert
                  severity="error"
                  variant="outlined"
                  action={
                    <Button size="small" onClick={() => void runCollection(true)} sx={touchTargetSx}>
                      Retry
                    </Button>
                  }
                >
                  {collectError}
                </Alert>
              ) : null}

              {externalSnapshot?.errors?.length ? (
                <Alert severity="warning" variant="outlined">
                  <Typography variant="body2" fontWeight={600} gutterBottom sx={chromeFontSx}>
                    Partial collection failures
                  </Typography>
                  <Stack spacing={0.35}>
                    {externalSnapshot.errors.slice(0, 5).map((err) => (
                      <Typography
                        key={`${err.code}-${err.message}`}
                        variant="caption"
                        display="block"
                        sx={chromeFontSx}
                      >
                        {err.code}: {err.message}
                        {err.source ? ` (${err.source})` : ""}
                      </Typography>
                    ))}
                  </Stack>
                </Alert>
              ) : null}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ) : null}

      <FormGrid maxColumns={3} compact>
        <FormField span={1}>
          <TextField
            size="small"
            label="Search references"
            placeholder="Title, source, or keyword"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} aria-hidden />
                  </InputAdornment>
                ),
              },
              htmlInput: {
                "aria-label": "Search references",
              },
            }}
          />
        </FormField>
        <FormField span={1}>
          <TextField
            size="small"
            select
            label="Level"
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value as TaxJurisdiction | "all")}
            fullWidth
          >
            <MenuItem value="all">All levels</MenuItem>
            {TAX_JURISDICTIONS.map((j) => (
              <MenuItem key={j} value={j}>
                {taxJurisdictionLabel(j)}
              </MenuItem>
            ))}
          </TextField>
        </FormField>
        {!compact ? (
          <FormField span={1}>
            <TextField
              size="small"
              select
              label="Topic"
              value={topicFilter}
              onChange={(e) => {
                const next = e.target.value as TaxIssueTopic | "all";
                setTopicFilter(next);
                if (next !== "all") setGuideTopic(next);
              }}
              fullWidth
            >
              <MenuItem value="all">All topics</MenuItem>
              {TAX_ISSUE_TOPICS.map((topic) => (
                <MenuItem key={topic} value={topic}>
                  {taxIssueTopicLabel(topic)}
                  {highlighted.has(topic) ? " · relevant" : ""}
                </MenuItem>
              ))}
            </TextField>
          </FormField>
        ) : null}
      </FormGrid>

      <Tabs
        value={view}
        onChange={(_, v: ViewTab) => setView(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: touchTargetFinePx,
          "& .MuiTab-root": {
            ...touchTargetSx,
            py: 0.25,
            textTransform: "none",
            ...chromeFontSx,
          },
        }}
      >
        <Tab
          value="references"
          label={`References (${referenceCount})`}
          icon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
        />
        <Tab
          value="library"
          label={`Library (${taxIssues.length})`}
          icon={<BookmarkAddedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
        />
        <Tab
          value="guides"
          label="Guides"
          icon={<MenuBookOutlinedIcon sx={{ fontSize: 15 }} />}
          iconPosition="start"
        />
      </Tabs>
    </Stack>
  );

  const results = (
    <Stack spacing={0.75} sx={{ minHeight: 0 }}>
      {view === "references" ? (
        <Stack spacing={0.75}>
          {(["county", "state", "federal"] as const).map((j) => {
            const items = groupedMerged[j];
            if (items.length === 0) return null;
            return (
              <Accordion
                key={j}
                defaultExpanded={j === "county" || (j === "state" && groupedMerged.county.length === 0)}
                disableGutters
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                  <Typography variant="subtitle2" sx={chromeFontSx}>
                    {taxJurisdictionLabel(j)} ({items.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <Stack spacing={0}>
                    {items.map((row) => (
                      <MergedReferenceCard
                        key={row.key}
                        row={row}
                        saved={isMergedReferenceSaved(taxIssues, row)}
                        highlighted={highlighted.has(
                          row.curated?.topic ?? row.external?.topic ?? "other"
                        )}
                        onToggleSave={() => toggleSaveMerged(row)}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {referenceCount === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={chromeFontSx}>
              No references match your filters
              {hasSnapshot ? "" : " — collect from official sites or adjust filters"}.
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {view === "library" ? (
        <Stack spacing={0.75}>
          {filteredSaved.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={chromeFontSx}>
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
            <Accordion
              defaultExpanded={false}
              disableGutters
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <Typography variant="subtitle2" sx={chromeFontSx}>
                  Add custom reference
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box component="form" onSubmit={onManualSubmit} noValidate>
                  <FormGrid maxColumns={3} compact>
                    <FormField span={2}>
                      <TextField
                        size="small"
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        required
                      />
                    </FormField>
                    <FormField span={1}>
                      <TextField
                        size="small"
                        select
                        label="Level"
                        value={manualJurisdiction}
                        onChange={(e) => setManualJurisdiction(e.target.value as TaxIssueJurisdiction)}
                        fullWidth
                      >
                        {TAX_JURISDICTIONS.map((j) => (
                          <MenuItem key={j} value={j}>
                            {taxJurisdictionLabel(j)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </FormField>
                    <FormField span={1}>
                      <TextField
                        size="small"
                        select
                        label="Topic"
                        value={manualTopic}
                        onChange={(e) => setManualTopic(e.target.value as TaxIssueTopic)}
                        fullWidth
                      >
                        {TAX_ISSUE_TOPICS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {taxIssueTopicLabel(t)}
                          </MenuItem>
                        ))}
                      </TextField>
                    </FormField>
                    <FormField span={1}>
                      <TextField
                        size="small"
                        label="Source"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        fullWidth
                        placeholder="IRS, county, etc."
                      />
                    </FormField>
                    <FormField span={1}>
                      <TextField
                        size="small"
                        label="URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        fullWidth
                        error={showManualUrlError}
                        helperText={showManualUrlError ? manualUrlError : undefined}
                      />
                    </FormField>
                    <FormField span={3}>
                      <TextField
                        size="small"
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={4}
                      />
                    </FormField>
                    <FormField span={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        type="submit"
                        disabled={!title.trim()}
                        fullWidth
                        sx={touchTargetSx}
                      >
                        Add
                      </Button>
                    </FormField>
                  </FormGrid>
                </Box>
              </AccordionDetails>
            </Accordion>
          ) : null}
        </Stack>
      ) : null}

      {view === "guides" ? (
        <Stack spacing={1}>
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
        <Button size="small" variant="text" onClick={onOpenFullResearch} sx={touchTargetSx}>
          Open full reference library in Research tab
        </Button>
      ) : null}
    </Stack>
  );

  return (
    <Box
      sx={{
        height: fillHeight ? "100%" : "auto",
        minHeight: fillHeight ? 0 : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        // Desktop fill: clip at the panel root; the results region owns scrolling.
        overflow: fillHeight ? "hidden" : "visible",
        containerType: "inline-size",
        containerName: "pp-tax-refs",
        // Narrow / md-width workbench: drop secondary chips + blurbs for denser rows.
        [`@container pp-tax-refs (max-width: 640px)`]: {
          "& .pp-tax-ref-extra": { display: "none" },
        },
      }}
    >
      {chrome}
      <Box
        sx={{
          flex: fillHeight ? 1 : "none",
          minHeight: fillHeight ? 0 : undefined,
          overflow: fillHeight ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {results}
      </Box>
    </Box>
  );
}
