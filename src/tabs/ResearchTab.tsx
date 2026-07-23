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
import { useState } from "react";
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
      id: "notes",
      title: "Notes",
      description: "Freeform diligence for this house",
      defaultLayout: { x: 0, y: 0, w: 12, h: 10, minW: 4, minH: 6 },
      content: <NotesPanel research={research} onChange={onChange} />,
    },
    {
      id: "links",
      title: "Links",
      description: "Listings · records · bookmarks",
      defaultLayout: { x: 0, y: 10, w: 12, h: 12, minW: 4, minH: 6 },
      content: <LinksPanel research={research} onChange={onChange} />,
    },
    {
      id: "comps",
      title: "Comps",
      description: "Manual comparable sales",
      defaultLayout: { x: 0, y: 22, w: 12, h: 12, minW: 4, minH: 6 },
      content: <CompsPanel research={research} onChange={onChange} />,
    },
    {
      id: "docs",
      title: "Documents",
      description: "URL references only",
      defaultLayout: { x: 0, y: 34, w: 12, h: 10, minW: 4, minH: 5 },
      content: <DocsPanel research={research} onChange={onChange} />,
    },
  ];

  return <WidgetBoard boardId="research" widgets={widgets} />;
}
