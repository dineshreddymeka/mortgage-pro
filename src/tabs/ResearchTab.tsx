import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import {
  buildTaxResourcePack,
  filterTaxResources,
  filterTaxResourcesByJurisdiction,
  relevantTaxTopics,
  TAX_JURISDICTIONS,
  taxJurisdictionLabel,
  type TaxJurisdiction,
  type TaxResourceEntry,
} from "../lib/taxResourcePack";
import {
  newResearchId,
  parseResearchNotes,
  researchOrEmpty,
  taxIssueFromCurated,
  taxIssueTopicLabel,
  TAX_ISSUE_TOPICS,
  type ResearchCompPersisted,
  type ResearchDocPersisted,
  type ResearchLinkKind,
  type ResearchLinkPersisted,
  type ResearchPersisted,
  type TaxIssuePersisted,
  type TaxIssueJurisdiction,
  type TaxIssueTopic,
} from "../storage/researchNotes";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type ResearchTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

function commitResearch(
  patch: (partial: Partial<AppPersisted>) => void,
  next: ResearchPersisted
): void {
  const normalized = parseResearchNotes(next);
  patch({ research: normalized });
}

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

function NotesPanel({
  research,
  onChange,
}: {
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
}) {
  return (
    <TextField
      label="Deal notes"
      placeholder="Inspection findings, seller quirks, neighborhood context…"
      multiline
      minRows={6}
      maxRows={16}
      fullWidth
      value={research.notes ?? ""}
      onChange={(e) => onChange({ ...research, notes: e.target.value })}
      helperText="Saved with this house scenario (local + cloud)."
    />
  );
}

function TaxIssuesPanel({
  state,
  research,
  onChange,
}: {
  state: AppPersisted;
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
}) {
  const taxIssues = research.taxIssues ?? [];
  const [jurisdictionFilter, setJurisdictionFilter] = useState<TaxJurisdiction | "all">("all");
  const [topicFilter, setTopicFilter] = useState<TaxIssueTopic | "all">("all");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState("");
  const [manualTopic, setManualTopic] = useState<TaxIssueTopic>("other");
  const [manualJurisdiction, setManualJurisdiction] = useState<TaxIssueJurisdiction>("county");

  const curatedPack = useMemo(() => buildTaxResourcePack(state), [state]);
  const highlighted = useMemo(() => relevantTaxTopics(state), [state]);
  const filteredCurated = useMemo(() => {
    let rows = filterTaxResourcesByJurisdiction(curatedPack, jurisdictionFilter);
    rows = filterTaxResources(rows, topicFilter);
    return rows;
  }, [curatedPack, jurisdictionFilter, topicFilter]);
  const filteredSaved = useMemo(() => {
    let rows = taxIssues;
    if (jurisdictionFilter !== "all") {
      rows = rows.filter((t) => t.jurisdiction === jurisdictionFilter);
    }
    if (topicFilter !== "all") {
      rows = rows.filter((t) => t.topic === topicFilter);
    }
    return rows;
  }, [taxIssues, jurisdictionFilter, topicFilter]);

  function addCurated(entry: TaxResourceEntry) {
    const exists = taxIssues.some((t) => t.url === entry.url && t.title === entry.title);
    if (exists) return;
    onChange({
      ...research,
      taxIssues: [taxIssueFromCurated(entry), ...taxIssues].slice(0, 50),
    });
  }

  function addManual() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const href = url.trim() ? safeHref(url) : null;
    const row: TaxIssuePersisted = {
      id: newResearchId(),
      topic: manualTopic,
      title: trimmed.slice(0, 200),
      addedAt: new Date().toISOString(),
      jurisdiction: manualJurisdiction,
      ...(href ? { url: href } : {}),
      ...(notes.trim() ? { notes: notes.trim().slice(0, 2000) } : {}),
      ...(source.trim() ? { source: source.trim().slice(0, 80) } : {}),
    };
    onChange({ ...research, taxIssues: [row, ...taxIssues].slice(0, 50) });
    setTitle("");
    setUrl("");
    setNotes("");
    setSource("");
  }

  return (
    <Stack spacing={1.5}>
      <Alert severity="info" variant="outlined" sx={{ py: 0.35 }}>
        <Typography variant="caption" sx={{ lineHeight: 1.4, display: "block" }}>
          Federal (IRS), state revenue, and county/local assessor references — research only, not tax
          advice. Property tax <strong>amounts</strong> use External estimates on Property (confirm before
          apply). Set state and ZIP on Property for localized county links.
        </Typography>
      </Alert>

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
            onClick={() => setTopicFilter(topic)}
          />
        ))}
      </Stack>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
          Curated references
        </Typography>
        <Stack spacing={0.75}>
          {filteredCurated.map((entry) => {
            const saved = taxIssues.some((t) => t.url === entry.url);
            return (
              <Stack
                key={entry.id}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ sm: "center" }}
                sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.title}
                    </Typography>
                    <Chip size="small" label={taxJurisdictionLabel(entry.jurisdiction)} variant="outlined" />
                    <Chip size="small" label={taxIssueTopicLabel(entry.topic)} variant="outlined" />
                    {highlighted.has(entry.topic) ? (
                      <Chip size="small" label="Relevant" color="primary" variant="outlined" />
                    ) : null}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {entry.source} · {entry.blurb}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
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
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={saved}
                    onClick={() => addCurated(entry)}
                  >
                    {saved ? "Saved" : "Add to my list"}
                  </Button>
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
          My tax references ({taxIssues.length})
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ flex: 1.2, minWidth: 140 }}
          />
          <TextField
            size="small"
            select
            label="Level"
            value={manualJurisdiction}
            onChange={(e) => setManualJurisdiction(e.target.value as TaxIssueJurisdiction)}
            sx={{ minWidth: 130 }}
          >
            {TAX_JURISDICTIONS.map((j) => (
              <MenuItem key={j} value={j}>
                {taxJurisdictionLabel(j)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            select
            label="Topic"
            value={manualTopic}
            onChange={(e) => setManualTopic(e.target.value as TaxIssueTopic)}
            sx={{ minWidth: 140 }}
          >
            {TAX_ISSUE_TOPICS.map((t) => (
              <MenuItem key={t} value={t}>
                {taxIssueTopicLabel(t)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            sx={{ flex: 1.4, minWidth: 160 }}
          />
          <TextField
            size="small"
            label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="IRS, CPA…"
            sx={{ width: { xs: "100%", sm: 100 } }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            disabled={!title.trim()}
            onClick={addManual}
          >
            Add
          </Button>
        </Stack>
        <TextField
          size="small"
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          sx={{ mb: 1 }}
        />
        {filteredSaved.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No saved tax references yet — add from the curated pack or paste your own links.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {filteredSaved.map((issue) => (
              <Stack
                key={issue.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {issue.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {issue.jurisdiction ? `${taxJurisdictionLabel(issue.jurisdiction)} · ` : ""}
                    {taxIssueTopicLabel(issue.topic)}
                    {issue.source ? ` · ${issue.source}` : ""}
                    {issue.notes ? ` · ${issue.notes}` : ""}
                  </Typography>
                </Box>
                {issue.url && safeHref(issue.url) ? (
                  <IconButton
                    size="small"
                    aria-label="Open tax reference"
                    component="a"
                    href={safeHref(issue.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                ) : null}
                <IconButton
                  size="small"
                  aria-label="Remove tax reference"
                  onClick={() =>
                    onChange({
                      ...research,
                      taxIssues: taxIssues.filter((t) => t.id !== issue.id),
                    })
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

function LinksPanel({
  research,
  onChange,
}: {
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
}) {
  const links = research.links ?? [];
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ResearchLinkKind>("listing");

  function addLink() {
    const href = safeHref(url);
    if (!href) return;
    const row: ResearchLinkPersisted = {
      id: newResearchId(),
      url: href,
      kind,
      addedAt: new Date().toISOString(),
      ...(title.trim() ? { title: title.trim().slice(0, 200) } : {}),
    };
    onChange({ ...research, links: [row, ...links].slice(0, 50) });
    setUrl("");
    setTitle("");
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ flex: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LinkOutlinedIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          size="small"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ flex: 1.2 }}
        />
        <TextField
          size="small"
          select
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ResearchLinkKind)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="listing">Listing</MenuItem>
          <MenuItem value="comp">Comp</MenuItem>
          <MenuItem value="doc">Doc</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddOutlinedIcon />}
          disabled={!safeHref(url)}
          onClick={addLink}
        >
          Add
        </Button>
      </Stack>
      {links.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Save listing pages, county records, and comps as you research.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {links.map((link) => {
            const href = safeHref(link.url);
            return (
              <Stack
                key={link.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {link.title || link.url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {(link.kind ?? "other").toUpperCase()} · {link.url}
                  </Typography>
                </Box>
                {href ? (
                  <IconButton
                    size="small"
                    aria-label="Open link"
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                ) : null}
                <IconButton
                  size="small"
                  aria-label="Remove link"
                  onClick={() =>
                    onChange({ ...research, links: links.filter((l) => l.id !== link.id) })
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}

function CompsPanel({
  research,
  onChange,
}: {
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
}) {
  const comps = research.comps ?? [];
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");

  function addComp() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const n = Number(price.replace(/,/g, ""));
    const href = url.trim() ? safeHref(url) : null;
    const row: ResearchCompPersisted = {
      id: newResearchId(),
      label: trimmed.slice(0, 200),
      addedAt: new Date().toISOString(),
      ...(Number.isFinite(n) && n >= 0 ? { price: Math.round(n) } : {}),
      ...(address.trim() ? { address: address.trim().slice(0, 200) } : {}),
      ...(href ? { url: href } : {}),
    };
    onChange({ ...research, comps: [row, ...comps].slice(0, 50) });
    setLabel("");
    setPrice("");
    setAddress("");
    setUrl("");
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Comp label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          sx={{ flex: 1.2, minWidth: 140 }}
        />
        <TextField
          size="small"
          label="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          sx={{ width: { xs: "100%", sm: 120 } }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          }}
        />
        <TextField
          size="small"
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          sx={{ flex: 1.4, minWidth: 160 }}
        />
        <TextField
          size="small"
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ flex: 1.2, minWidth: 140 }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddOutlinedIcon />}
          disabled={!label.trim()}
          onClick={addComp}
        >
          Add
        </Button>
      </Stack>
      {comps.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Track sold / active comps manually alongside estimate suggestions.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {comps.map((comp) => (
            <Stack
              key={comp.id}
              direction={{ xs: "column", sm: "row" }}
              spacing={0.75}
              alignItems={{ sm: "center" }}
              sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {comp.label}
                  {comp.price != null ? ` · ${money.format(comp.price)}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {[comp.address, comp.url].filter(Boolean).join(" · ") || "No address"}
                </Typography>
              </Box>
              {comp.url && safeHref(comp.url) ? (
                <IconButton
                  size="small"
                  aria-label="Open comp"
                  component="a"
                  href={safeHref(comp.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              ) : null}
              <IconButton
                size="small"
                aria-label="Remove comp"
                onClick={() =>
                  onChange({ ...research, comps: comps.filter((c) => c.id !== comp.id) })
                }
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function DocsPanel({
  research,
  onChange,
}: {
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
}) {
  const docs = research.docs ?? [];
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");

  function addDoc() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const href = url.trim() ? safeHref(url) : null;
    const row: ResearchDocPersisted = {
      id: newResearchId(),
      title: trimmed.slice(0, 200),
      addedAt: new Date().toISOString(),
      ...(href ? { url: href } : {}),
      ...(note.trim() ? { note: note.trim().slice(0, 2000) } : {}),
    };
    onChange({ ...research, docs: [row, ...docs].slice(0, 50) });
    setTitle("");
    setUrl("");
    setNote("");
  }

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ flex: 1.2 }}
        />
        <TextField
          size="small"
          label="Link (Drive, Dropbox…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ flex: 1.4 }}
        />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddOutlinedIcon />}
          disabled={!title.trim()}
          onClick={addDoc}
        >
          Add
        </Button>
      </Stack>
      <TextField
        size="small"
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        fullWidth
      />
      {docs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Store URL references to disclosures, inspection PDFs, and title docs (no file upload).
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {docs.map((doc) => (
            <Stack
              key={doc.id}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {doc.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {doc.note || doc.url || "No link"}
                </Typography>
              </Box>
              {doc.url && safeHref(doc.url) ? (
                <IconButton
                  size="small"
                  aria-label="Open document"
                  component="a"
                  href={safeHref(doc.url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              ) : null}
              <IconButton
                size="small"
                aria-label="Remove document"
                onClick={() =>
                  onChange({ ...research, docs: docs.filter((d) => d.id !== doc.id) })
                }
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function ResearchTab({ state, patch }: ResearchTabProps) {
  const research = researchOrEmpty(state.research);
  const onChange = (next: ResearchPersisted) => commitResearch(patch, next);

  const widgets = [
    {
      id: "tax-issues",
      title: "Tax issues & references",
      description: "IRS · state · saved links",
      defaultLayout: { x: 0, y: 0, w: 12, h: 18, minW: 4, minH: 10 },
      content: <TaxIssuesPanel state={state} research={research} onChange={onChange} />,
    },
    {
      id: "notes",
      title: "Notes",
      description: "Freeform diligence for this house",
      defaultLayout: { x: 0, y: 18, w: 12, h: 10, minW: 4, minH: 6 },
      content: <NotesPanel research={research} onChange={onChange} />,
    },
    {
      id: "links",
      title: "Links",
      description: "Listings · records · bookmarks",
      defaultLayout: { x: 0, y: 28, w: 12, h: 12, minW: 4, minH: 6 },
      content: <LinksPanel research={research} onChange={onChange} />,
    },
    {
      id: "comps",
      title: "Comps",
      description: "Manual comparable sales",
      defaultLayout: { x: 0, y: 40, w: 12, h: 12, minW: 4, minH: 6 },
      content: <CompsPanel research={research} onChange={onChange} />,
    },
    {
      id: "docs",
      title: "Documents",
      description: "URL references only",
      defaultLayout: { x: 0, y: 52, w: 12, h: 10, minW: 4, minH: 5 },
      content: <DocsPanel research={research} onChange={onChange} />,
    },
  ];

  return <WidgetBoard boardId="research" widgets={widgets} />;
}
