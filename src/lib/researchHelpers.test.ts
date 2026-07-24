import { describe, expect, it } from "vitest";
import {
  RESEARCH_NOTES_DEBOUNCE_MS,
  createResearchNotesBufferState,
  researchNotesBufferApplyProps,
  researchNotesBufferBeginFlush,
  researchNotesBufferNeedsFlush,
  researchNotesBufferOnCommitted,
  researchNotesBufferOnEdit,
  researchNotesBufferOnScopeChange,
  researchSafeHref,
  researchUrlFieldError,
} from "./researchHelpers";

describe("researchHelpers", () => {
  it("exposes a short notes debounce window", () => {
    expect(RESEARCH_NOTES_DEBOUNCE_MS).toBe(400);
  });

  describe("researchSafeHref", () => {
    it("accepts http(s) URLs and adds https when missing", () => {
      expect(researchSafeHref("https://example.com/a")).toBe("https://example.com/a");
      expect(researchSafeHref("http://example.com")).toBe("http://example.com/");
      expect(researchSafeHref("example.com/listing")).toBe("https://example.com/listing");
    });

    it("rejects empty and non-http schemes", () => {
      expect(researchSafeHref("")).toBeNull();
      expect(researchSafeHref("   ")).toBeNull();
      expect(researchSafeHref("javascript:alert(1)")).toBeNull();
      expect(researchSafeHref("ftp://files.example")).toBeNull();
      expect(researchSafeHref("not a url")).toBeNull();
    });
  });

  describe("researchUrlFieldError", () => {
    it("allows empty optional URLs and requires when asked", () => {
      expect(researchUrlFieldError("")).toBeNull();
      expect(researchUrlFieldError("  ")).toBeNull();
      expect(researchUrlFieldError("", { required: true })).toBe("URL is required");
    });

    it("returns an inline error for non-empty invalid URLs", () => {
      expect(researchUrlFieldError("not a url")).toBe("Enter a valid http(s) URL");
      expect(researchUrlFieldError("https://ok.example")).toBeNull();
    });
  });

  describe("research notes buffer", () => {
    it("needs flush only when draft differs from seen committed", () => {
      const clean = createResearchNotesBufferState("p1", "hello");
      expect(researchNotesBufferNeedsFlush(clean)).toBe(false);
      const dirty = researchNotesBufferOnEdit(clean, "hello ");
      expect(researchNotesBufferNeedsFlush(dirty)).toBe(true);
    });

    it("adopts normalize/trim echo when draft is still at the flushed value", () => {
      let state = createResearchNotesBufferState("p1", "");
      state = researchNotesBufferOnEdit(state, "hello ");
      const flush = researchNotesBufferBeginFlush(state);
      expect(flush.value).toBe("hello ");
      state = flush.state;
      expect(state.pendingFlush).toBe("hello ");

      state = researchNotesBufferOnCommitted(state, "hello");
      expect(state.draft).toBe("hello");
      expect(state.seenCommitted).toBe("hello");
      expect(state.pendingFlush).toBeNull();
      expect(researchNotesBufferNeedsFlush(state)).toBe(false);
    });

    it("does not overwrite keystrokes when parent echo arrives after a later edit", () => {
      let state = createResearchNotesBufferState("p1", "");
      state = researchNotesBufferOnEdit(state, "hello ");
      state = researchNotesBufferBeginFlush(state).state;
      // User keeps typing before the normalized echo lands.
      state = researchNotesBufferOnEdit(state, "hello world");
      state = researchNotesBufferOnCommitted(state, "hello");

      expect(state.draft).toBe("hello world");
      expect(state.seenCommitted).toBe("hello");
      expect(state.pendingFlush).toBeNull();
      expect(researchNotesBufferNeedsFlush(state)).toBe(true);
    });

    it("skips duplicate flush while the same draft is already in flight", () => {
      let state = createResearchNotesBufferState("p1", "a");
      state = researchNotesBufferOnEdit(state, "ab");
      const first = researchNotesBufferBeginFlush(state);
      expect(first.value).toBe("ab");
      state = first.state;
      const second = researchNotesBufferBeginFlush(state);
      expect(second.value).toBeNull();
      expect(second.state.pendingFlush).toBe("ab");
    });

    it("flushes dirty draft when scope changes, then loads the new scope", () => {
      let state = createResearchNotesBufferState("house-a", "alpha");
      state = researchNotesBufferOnEdit(state, "alpha local");
      const switched = researchNotesBufferOnScopeChange(state, "house-b", "beta");
      expect(switched.flush).toBe("alpha local");
      expect(switched.state).toEqual(createResearchNotesBufferState("house-b", "beta"));
    });

    it("applyProps flushes previous scope and does not clobber a dirty same-scope draft", () => {
      let state = createResearchNotesBufferState("issue-1", "note");
      state = researchNotesBufferOnEdit(state, "note typing");

      const sameScope = researchNotesBufferApplyProps(state, "issue-1", "note");
      expect(sameScope.flush).toBeNull();
      expect(sameScope.state.draft).toBe("note typing");

      const crossScope = researchNotesBufferApplyProps(state, "issue-2", "other");
      expect(crossScope.flush).toBe("note typing");
      expect(crossScope.state.scopeKey).toBe("issue-2");
      expect(crossScope.state.draft).toBe("other");
    });

    it("unmount-oriented beginFlush returns dirty draft for a final write", () => {
      let state = createResearchNotesBufferState("p1", "saved");
      state = researchNotesBufferOnEdit(state, "saved + more");
      const { value } = researchNotesBufferBeginFlush(state);
      expect(value).toBe("saved + more");
    });

    it("keeps a clean buffer stable across identical committed echoes", () => {
      const state = createResearchNotesBufferState("p1", "same");
      expect(researchNotesBufferOnCommitted(state, "same")).toBe(state);
    });
  });
});
