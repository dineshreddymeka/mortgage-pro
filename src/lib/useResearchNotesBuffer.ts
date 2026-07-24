import { useCallback, useEffect, useRef, useState } from "react";
import {
  RESEARCH_NOTES_DEBOUNCE_MS,
  createResearchNotesBufferState,
  researchNotesBufferApplyProps,
  researchNotesBufferBeginFlush,
  researchNotesBufferOnEdit,
  type ResearchNotesBufferState,
} from "./researchHelpers";

export type UseResearchNotesBufferResult = {
  draft: string;
  setDraft: (value: string) => void;
  /** Commit immediately (blur / explicit). */
  flush: () => void;
};

/**
 * Buffer freeform research notes locally.
 *
 * - Commits on 400ms debounce and blur
 * - Flushes dirty draft on unmount and scope change
 * - Keeps keystrokes when a parent echo arrives after a later edit
 */
export function useResearchNotesBuffer(
  scopeKey: string,
  committed: string | undefined,
  onCommit: (value: string) => void
): UseResearchNotesBufferResult {
  const [state, setState] = useState<ResearchNotesBufferState>(() =>
    createResearchNotesBufferState(scopeKey, committed)
  );
  const stateRef = useRef(state);
  const onCommitRef = useRef(onCommit);
  stateRef.current = state;
  onCommitRef.current = onCommit;

  const commitValue = useCallback((value: string) => {
    onCommitRef.current(value);
  }, []);

  const runFlush = useCallback(() => {
    const { state: next, value } = researchNotesBufferBeginFlush(stateRef.current);
    stateRef.current = next;
    setState(next);
    if (value !== null) commitValue(value);
  }, [commitValue]);

  // Scope change + committed echo / external updates.
  useEffect(() => {
    const { state: next, flush } = researchNotesBufferApplyProps(
      stateRef.current,
      scopeKey,
      committed
    );
    if (flush !== null) commitValue(flush);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
  }, [scopeKey, committed, commitValue]);

  const draft = state.draft;
  const seenCommitted = state.seenCommitted;
  const bufferScopeKey = state.scopeKey;

  // Debounced commit while dirty.
  useEffect(() => {
    if (draft === seenCommitted) return;
    const timer = window.setTimeout(() => {
      runFlush();
    }, RESEARCH_NOTES_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, seenCommitted, bufferScopeKey, runFlush]);

  // Flush dirty draft on unmount.
  useEffect(() => {
    return () => {
      const { value } = researchNotesBufferBeginFlush(stateRef.current);
      if (value !== null) onCommitRef.current(value);
    };
  }, []);

  const setDraft = useCallback((value: string) => {
    setState((prev) => {
      const next = researchNotesBufferOnEdit(prev, value);
      stateRef.current = next;
      return next;
    });
  }, []);

  return { draft: state.draft, setDraft, flush: runFlush };
}
