import { describe, expect, it, vi } from "vitest";
import {
  APP_HEADER_HEIGHT_PX,
  HEADER_SECONDARY_ACTIONS,
  RESET_CONFIRM_MESSAGE,
  WORKSPACE_TABS,
  WORKSPACE_TAB_INDEX,
  clampWorkspaceTabIndex,
  confirmWorkspaceReset,
  headerSecondaryActionHandler,
  workspaceTabIndexFromKey,
} from "./workspaceShell";

describe("workspaceShell", () => {
  it("keeps a compact fixed header height and eight category tabs", () => {
    expect(APP_HEADER_HEIGHT_PX).toBe(52);
    expect(WORKSPACE_TABS.map((t) => t.id)).toEqual([
      "property",
      "research",
      "financing",
      "upfront",
      "rental",
      "exit",
      "compare",
      "common-inputs",
    ]);
    expect(WORKSPACE_TAB_INDEX.compare).toBe(6);
    expect(WORKSPACE_TAB_INDEX["common-inputs"]).toBe(7);
  });

  it("appends common-inputs after Compare without shifting existing indices", () => {
    expect(WORKSPACE_TAB_INDEX.property).toBe(0);
    expect(WORKSPACE_TAB_INDEX.research).toBe(1);
    expect(WORKSPACE_TAB_INDEX.financing).toBe(2);
    expect(WORKSPACE_TAB_INDEX.upfront).toBe(3);
    expect(WORKSPACE_TAB_INDEX.rental).toBe(4);
    expect(WORKSPACE_TAB_INDEX.exit).toBe(5);
    expect(WORKSPACE_TAB_INDEX.compare).toBe(6);
    expect(WORKSPACE_TABS[7]).toEqual({ label: "Common Inputs", id: "common-inputs" });
  });

  it("lists every secondary header action used by AppHeader overflow/inline", () => {
    expect(HEADER_SECONDARY_ACTIONS.map((a) => a.id)).toEqual([
      "report",
      "excel",
      "verify",
      "reset",
      "theme",
    ]);
    const handlers = {
      report: vi.fn(),
      excel: vi.fn(),
      verify: vi.fn(),
      reset: vi.fn(),
      theme: vi.fn(),
    };
    for (const action of HEADER_SECONDARY_ACTIONS) {
      headerSecondaryActionHandler(action.id, handlers)();
      expect(handlers[action.id]).toHaveBeenCalledOnce();
    }
  });

  it("confirms before destructive reset", () => {
    const accept = vi.fn(() => true);
    const reject = vi.fn(() => false);
    expect(confirmWorkspaceReset(accept)).toBe(true);
    expect(accept).toHaveBeenCalledWith(RESET_CONFIRM_MESSAGE);
    expect(confirmWorkspaceReset(reject)).toBe(false);
  });

  it("clamps tab indices and maps Arrow/Home/End keys", () => {
    expect(clampWorkspaceTabIndex(-2)).toBe(0);
    expect(clampWorkspaceTabIndex(99)).toBe(7);
    expect(workspaceTabIndexFromKey("ArrowRight", 7)).toBe(0);
    expect(workspaceTabIndexFromKey("ArrowLeft", 0)).toBe(7);
    expect(workspaceTabIndexFromKey("Home", 3)).toBe(0);
    expect(workspaceTabIndexFromKey("End", 1)).toBe(7);
    expect(workspaceTabIndexFromKey("Enter", 1)).toBeNull();
  });
});
