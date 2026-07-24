/** Debounce before committing buffered freeform notes to persisted research. */
export const RESEARCH_NOTES_DEBOUNCE_MS = 400;

/**
 * True when `beforeColon` + `afterColon` look like host:port (optionally with
 * path/query/hash), not a URI scheme such as `javascript:` or `ftp://…`.
 */
function isHostPortWithoutScheme(beforeColon: string, afterColon: string): boolean {
  if (!/^\d{1,5}(?:[/?#]|$)/.test(afterColon)) return false;
  if (/^localhost$/i.test(beforeColon)) return true;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(beforeColon)) return true;
  // Hostname with a dot (example.com) — schemes never contain ".".
  return /\./.test(beforeColon);
}

/** Normalize a user-entered URL to an http(s) href, or null when invalid. */
export function researchSafeHref(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Reject explicit non-http(s) schemes before https-prepending (e.g. ftp:, javascript:),
  // but accept host:port without a scheme (example.com:8080, localhost:3000).
  if (!/^https?:\/\//i.test(trimmed)) {
    const schemeLike = /^([a-z][a-z0-9+.-]*):(.*)$/i.exec(trimmed);
    if (schemeLike) {
      const [, beforeColon, afterColon] = schemeLike;
      const isHostPort =
        !afterColon.startsWith("//") && isHostPortWithoutScheme(beforeColon, afterColon);
      if (!isHostPort) return null;
    }
  }
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Inline validation message for research URL fields.
 * Empty optional URLs are valid; non-empty invalid values get an error.
 */
export function researchUrlFieldError(
  url: string,
  options?: { required?: boolean }
): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return options?.required ? "URL is required" : null;
  }
  if (!researchSafeHref(url)) return "Enter a valid http(s) URL";
  return null;
}

/** Local buffer for freeform research notes (deal notes / library notes). */
export type ResearchNotesBufferState = {
  /** Stable scope (active property id, issue id, …). */
  scopeKey: string;
  draft: string;
  /** Last committed value acknowledged into the buffer. */
  seenCommitted: string;
  /** Draft value last sent via onCommit; null when idle / acknowledged. */
  pendingFlush: string | null;
};

export function createResearchNotesBufferState(
  scopeKey: string,
  committed: string | undefined
): ResearchNotesBufferState {
  const value = committed ?? "";
  return {
    scopeKey,
    draft: value,
    seenCommitted: value,
    pendingFlush: null,
  };
}

export function researchNotesBufferNeedsFlush(state: ResearchNotesBufferState): boolean {
  return state.draft !== state.seenCommitted;
}

export function researchNotesBufferOnEdit(
  state: ResearchNotesBufferState,
  draft: string
): ResearchNotesBufferState {
  if (draft === state.draft) return state;
  return { ...state, draft };
}

/**
 * Apply a parent committed echo / external update.
 * Never overwrites keystrokes when the draft has moved past the last flush.
 */
export function researchNotesBufferOnCommitted(
  state: ResearchNotesBufferState,
  committed: string | undefined
): ResearchNotesBufferState {
  const next = committed ?? "";
  if (next === state.seenCommitted) {
    // Exact match of what we already know — clear pending if it matched too.
    if (state.pendingFlush !== null && state.pendingFlush === next) {
      return { ...state, pendingFlush: null };
    }
    return state;
  }

  if (state.pendingFlush !== null) {
    // Treat committed change as acknowledgment of our in-flight flush (including
    // normalize/trim echoes). Only adopt into draft when the user has not typed further.
    const draftIsAtFlushPoint =
      state.draft === state.pendingFlush || state.draft === state.seenCommitted;
    if (draftIsAtFlushPoint) {
      return {
        ...state,
        draft: next,
        seenCommitted: next,
        pendingFlush: null,
      };
    }
    return {
      ...state,
      seenCommitted: next,
      pendingFlush: null,
    };
  }

  // No in-flight flush: adopt only when the local field is clean.
  if (state.draft === state.seenCommitted) {
    return {
      ...state,
      draft: next,
      seenCommitted: next,
      pendingFlush: null,
    };
  }

  // Dirty local edits win over a same-scope external overwrite.
  return { ...state, seenCommitted: next };
}

/**
 * Begin a flush. Returns the value to pass to onCommit, or null when nothing
 * new should be written (clean, or identical value already in flight).
 */
export function researchNotesBufferBeginFlush(state: ResearchNotesBufferState): {
  state: ResearchNotesBufferState;
  value: string | null;
} {
  if (!researchNotesBufferNeedsFlush(state)) {
    return { state, value: null };
  }
  if (state.pendingFlush === state.draft) {
    return { state, value: null };
  }
  return {
    state: { ...state, pendingFlush: state.draft },
    value: state.draft,
  };
}

/**
 * Switch buffer scope (e.g. active house / library issue).
 * Returns a flush value for the previous scope when its draft was dirty.
 */
export function researchNotesBufferOnScopeChange(
  state: ResearchNotesBufferState,
  scopeKey: string,
  committed: string | undefined
): { state: ResearchNotesBufferState; flush: string | null } {
  if (scopeKey === state.scopeKey) {
    return { state, flush: null };
  }
  const flush = researchNotesBufferNeedsFlush(state) ? state.draft : null;
  return {
    flush,
    state: createResearchNotesBufferState(scopeKey, committed),
  };
}

/**
 * Resolve scope + committed updates in one step (hook helper).
 * Flushes the previous scope when the key changes before adopting the new committed value.
 */
export function researchNotesBufferApplyProps(
  state: ResearchNotesBufferState,
  scopeKey: string,
  committed: string | undefined
): { state: ResearchNotesBufferState; flush: string | null } {
  if (scopeKey !== state.scopeKey) {
    return researchNotesBufferOnScopeChange(state, scopeKey, committed);
  }
  return {
    state: researchNotesBufferOnCommitted(state, committed),
    flush: null,
  };
}
