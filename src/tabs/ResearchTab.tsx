import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { TaxReferencesPanel } from "../components/TaxReferencesPanel";
import { FormField, FormGrid } from "../layout/FormGrid";
import { researchSafeHref, researchUrlFieldError } from "../lib/researchHelpers";
import { useResearchNotesBuffer } from "../lib/useResearchNotesBuffer";
import {
  newResearchId,
  parseResearchNotes,
  researchOrEmpty,
  type ResearchCompPersisted,
  type ResearchDocPersisted,
  type ResearchLinkKind,
  type ResearchLinkPersisted,
  type ResearchPersisted,
} from "../storage/researchNotes";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";
import {
  RESEARCH_BOARD_LAYOUT_REVISION,
  RESEARCH_BOARD_PRESET,
  RESEARCH_WIDGET_ORDER,
  researchWidgetLayouts,
  researchWidgetLgLayout,
  type ResearchWidgetId,
} from "./researchTabLayout";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export type ResearchTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  activePropertyId: string | null;
};

function commitResearch(
  patch: (partial: Partial<AppPersisted>) => void,
  next: ResearchPersisted
): void {
  const normalized = parseResearchNotes(next);
  patch({ research: normalized });
}

function NotesPanel({
  research,
  onChange,
  scopeKey,
}: {
  research: ResearchPersisted;
  onChange: (next: ResearchPersisted) => void;
  scopeKey: string;
}) {
  const onCommit = useCallback(
    (value: string) => onChange({ ...research, notes: value }),
    [onChange, research]
  );
  const { draft, setDraft, flush } = useResearchNotesBuffer(scopeKey, research.notes, onCommit);

  return (
    <TextField
      label="Deal notes"
      placeholder="Inspection findings, seller quirks, neighborhood context…"
      multiline
      minRows={4}
      maxRows={6}
      fullWidth
      size="small"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={flush}
      helperText="Saved with this house scenario (local + cloud)."
    />
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
  const [submitted, setSubmitted] = useState(false);

  const urlError = researchUrlFieldError(url, { required: true });
  const showUrlError = submitted && Boolean(urlError);

  function addLink() {
    setSubmitted(true);
    const href = researchSafeHref(url);
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
    setSubmitted(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addLink();
  }

  return (
    <Stack spacing={1.25}>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <FormGrid maxColumns={4} compact>
          <FormField span={2}>
            <TextField
              size="small"
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              error={showUrlError}
              helperText={showUrlError ? urlError : undefined}
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
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
            />
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              select
              label="Kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as ResearchLinkKind)}
              fullWidth
            >
              <MenuItem value="listing">Listing</MenuItem>
              <MenuItem value="comp">Comp</MenuItem>
              <MenuItem value="doc">Doc</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </FormField>
          <FormField span={1}>
            <Button
              size="small"
              variant="outlined"
              type="submit"
              startIcon={<AddOutlinedIcon />}
              disabled={!url.trim()}
              fullWidth
              sx={{ height: "100%", minHeight: 40 }}
            >
              Add
            </Button>
          </FormField>
        </FormGrid>
      </Box>
      {links.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Save listing pages, county records, and comps as you research.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {links.map((link) => {
            const href = researchSafeHref(link.url);
            return (
              <Stack
                key={link.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
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
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const urlError = url.trim() ? researchUrlFieldError(url) : null;
  const showUrlError = submitted && Boolean(urlError);

  function addComp() {
    setSubmitted(true);
    const trimmed = label.trim();
    if (!trimmed) return;
    if (url.trim() && !researchSafeHref(url)) return;
    const n = Number(price.replace(/,/g, ""));
    const href = url.trim() ? researchSafeHref(url) : null;
    const row: ResearchCompPersisted = {
      id: newResearchId(),
      label: trimmed.slice(0, 200),
      addedAt: new Date().toISOString(),
      ...(Number.isFinite(n) && n >= 0 ? { price: Math.round(n) } : {}),
      ...(address.trim() ? { address: address.trim().slice(0, 200) } : {}),
      ...(href ? { url: href } : {}),
      ...(notes.trim() ? { notes: notes.trim().slice(0, 2000) } : {}),
    };
    onChange({ ...research, comps: [row, ...comps].slice(0, 50) });
    setLabel("");
    setPrice("");
    setAddress("");
    setUrl("");
    setNotes("");
    setSubmitted(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addComp();
  }

  return (
    <Stack spacing={1.25}>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <FormGrid maxColumns={4} compact>
          <FormField span={1}>
            <TextField
              size="small"
              label="Comp label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              fullWidth
              required
            />
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              label="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
              }}
            />
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
            />
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              error={showUrlError}
              helperText={showUrlError ? urlError : undefined}
            />
          </FormField>
          <FormField span={3}>
            <TextField
              size="small"
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              placeholder="Adjustments, condition, days on market…"
            />
          </FormField>
          <FormField span={1}>
            <Button
              size="small"
              variant="outlined"
              type="submit"
              startIcon={<AddOutlinedIcon />}
              disabled={!label.trim()}
              fullWidth
              sx={{ height: "100%", minHeight: 40 }}
            >
              Add
            </Button>
          </FormField>
        </FormGrid>
      </Box>
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
              sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {comp.label}
                  {comp.price != null ? ` · ${money.format(comp.price)}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {[comp.address, comp.url].filter(Boolean).join(" · ") || "No address"}
                </Typography>
                {comp.notes ? (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {comp.notes}
                  </Typography>
                ) : null}
              </Box>
              {comp.url && researchSafeHref(comp.url) ? (
                <IconButton
                  size="small"
                  aria-label="Open comp"
                  component="a"
                  href={researchSafeHref(comp.url)!}
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
  const [submitted, setSubmitted] = useState(false);

  const urlError = url.trim() ? researchUrlFieldError(url) : null;
  const showUrlError = submitted && Boolean(urlError);

  function addDoc() {
    setSubmitted(true);
    const trimmed = title.trim();
    if (!trimmed) return;
    if (url.trim() && !researchSafeHref(url)) return;
    const href = url.trim() ? researchSafeHref(url) : null;
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
    setSubmitted(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    addDoc();
  }

  return (
    <Stack spacing={1.25}>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <FormGrid maxColumns={3} compact>
          <FormField span={1}>
            <TextField
              size="small"
              label="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />
          </FormField>
          <FormField span={1}>
            <TextField
              size="small"
              label="Link (Drive, Dropbox…)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              error={showUrlError}
              helperText={showUrlError ? urlError : undefined}
            />
          </FormField>
          <FormField span={1}>
            <Button
              size="small"
              variant="outlined"
              type="submit"
              startIcon={<AddOutlinedIcon />}
              disabled={!title.trim()}
              fullWidth
              sx={{ height: "100%", minHeight: 40 }}
            >
              Add
            </Button>
          </FormField>
          <FormField span={3}>
            <TextField
              size="small"
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              fullWidth
            />
          </FormField>
        </FormGrid>
      </Box>
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
              sx={{ p: 0.75, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {doc.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {doc.note || doc.url || "No link"}
                </Typography>
              </Box>
              {doc.url && researchSafeHref(doc.url) ? (
                <IconButton
                  size="small"
                  aria-label="Open document"
                  component="a"
                  href={researchSafeHref(doc.url)!}
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

export function ResearchTab({ state, patch, activePropertyId }: ResearchTabProps) {
  const research = researchOrEmpty(state.research);
  const onChange = useCallback(
    (next: ResearchPersisted) => commitResearch(patch, next),
    [patch]
  );

  const widgets = useMemo(() => {
    const panelById: Record<
      ResearchWidgetId,
      { title: string; description: string; content: ReactNode }
    > = {
      "tax-issues": {
        title: "Tax references",
        description: "IRS · state · county · saved links",
        content: (
          <TaxReferencesPanel
            state={state}
            research={research}
            onChange={onChange}
            focus="all"
            activePropertyId={activePropertyId}
          />
        ),
      },
      notes: {
        title: "Notes",
        description: "Freeform diligence for this house",
        content: (
          <NotesPanel
            research={research}
            onChange={onChange}
            scopeKey={activePropertyId?.trim() || "local-draft"}
          />
        ),
      },
      links: {
        title: "Links",
        description: "Listings · records · bookmarks",
        content: <LinksPanel research={research} onChange={onChange} />,
      },
      docs: {
        title: "Documents",
        description: "URL references only",
        content: <DocsPanel research={research} onChange={onChange} />,
      },
      comps: {
        title: "Comps",
        description: "Manual comparable sales",
        content: <CompsPanel research={research} onChange={onChange} />,
      },
    };

    return RESEARCH_WIDGET_ORDER.map((id) => ({
      id,
      title: panelById[id].title,
      description: panelById[id].description,
      defaultLayout: researchWidgetLgLayout(id),
      defaultLayouts: researchWidgetLayouts(id),
      // Height-aware tax list owns scrolling inside the fixed desktop cell.
      ...(id === "tax-issues" ? { scrollBody: true as const } : {}),
      content: panelById[id].content,
    }));
  }, [activePropertyId, onChange, research, state]);

  return (
    <WidgetBoard
      boardId="research"
      widgets={widgets}
      rowHeight={28}
      layoutRevision={RESEARCH_BOARD_LAYOUT_REVISION}
      preset={RESEARCH_BOARD_PRESET}
    />
  );
}
