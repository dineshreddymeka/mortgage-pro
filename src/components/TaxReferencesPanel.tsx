import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import BookmarkBorderOutlinedIcon from "@mui/icons-material/BookmarkBorderOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
import { useMemo, useState } from "react";
import {
  buildTaxResourcePack,
  filterTaxResources,
  filterTaxResourcesByJurisdiction,
  focusTopicsForVariant,
  getTopicGuide,
  groupTaxResourcesByJurisdiction,
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
  type ResearchPersisted,
  type TaxIssueJurisdiction,
  type TaxIssuePersisted,
  type TaxIssueTopic,
} from "../storage/researchNotes";

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

export type TaxReferencesPanelProps = {
  state: AppPersisted;
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
  /** Compact embed on Rental / Exit tax panels. */
  compact?: boolean;
  focus?: "all" | "rental" | "exit";
  onOpenFullResearch?: () => void;
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
}: TaxReferencesPanelProps) {
  const taxIssues = research.taxIssues ?? [];
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

  const grouped = useMemo(() => groupTaxResourcesByJurisdiction(filteredPack), [filteredPack]);

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
        <Tab value="references" label={`References (${filteredPack.length})`} icon={<OpenInNewIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab value="library" label={`My library (${taxIssues.length})`} icon={<BookmarkAddedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
        <Tab value="guides" label="Topic guides" icon={<MenuBookOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
      </Tabs>

      {view === "references" ? (
        <Stack spacing={1}>
          {(["county", "state", "federal"] as const).map((j) => {
            const items = grouped[j];
            if (items.length === 0) return null;
            return (
              <Accordion
                key={j}
                defaultExpanded={j === "county" || (j === "state" && grouped.county.length === 0)}
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
                    {items.map((entry) => (
                      <ReferenceCard
                        key={entry.id}
                        entry={entry}
                        saved={isCuratedReferenceSaved(taxIssues, entry)}
                        highlighted={highlighted.has(entry.topic)}
                        onToggleSave={() => toggleSave(entry)}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
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
