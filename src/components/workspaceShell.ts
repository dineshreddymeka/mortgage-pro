/**
 * App chrome helpers for the compact workspace shell (header, tabs, sticky offsets).
 */

import {
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../layout/formLayout";

/** Sticky header height — keep HouseNavBar `top` / `maxHeight` in sync. */
export const APP_HEADER_HEIGHT_PX = 52;

/** Breakpoint at which secondary header actions leave the overflow menu. */
export const HEADER_ACTIONS_INLINE_BREAKPOINT = "lg" as const;

/** Shared 36px fine / 44px coarse target for header + Compare chrome buttons. */
export const shellActionTargetSx = {
  minHeight: touchTargetFinePx,
  "@media (pointer: coarse)": {
    minHeight: touchTargetCoarsePx,
  },
} as const;

export const shellIconActionTargetSx = {
  width: touchTargetFinePx,
  height: touchTargetFinePx,
  "@media (pointer: coarse)": {
    width: touchTargetCoarsePx,
    height: touchTargetCoarsePx,
  },
} as const;

export const RESET_CONFIRM_MESSAGE =
  "Reset all tab values for this house to zero? This cannot be undone.";

/** Confirm before the destructive Reset header action. */
export function confirmWorkspaceReset(
  confirmFn: (message: string) => boolean = (message) => window.confirm(message)
): boolean {
  return confirmFn(RESET_CONFIRM_MESSAGE);
}

export type WorkspaceTabId =
  | "property"
  | "research"
  | "financing"
  | "upfront"
  | "rental"
  | "exit"
  | "compare";

export type WorkspaceTabDef = {
  label: string;
  id: WorkspaceTabId;
};

/** One tab per category — editors are not duplicated across tabs. */
export const WORKSPACE_TABS: readonly WorkspaceTabDef[] = [
  { label: "Property", id: "property" },
  { label: "Research", id: "research" },
  { label: "Financing", id: "financing" },
  { label: "Upfront", id: "upfront" },
  { label: "Rental", id: "rental" },
  { label: "Exit", id: "exit" },
  { label: "Compare", id: "compare" },
] as const;

export const WORKSPACE_TAB_INDEX: Record<WorkspaceTabId, number> = {
  property: 0,
  research: 1,
  financing: 2,
  upfront: 3,
  rental: 4,
  exit: 5,
  compare: 6,
};

export function clampWorkspaceTabIndex(index: number, tabCount = WORKSPACE_TABS.length): number {
  if (!Number.isFinite(index) || tabCount <= 0) return 0;
  return Math.min(tabCount - 1, Math.max(0, Math.floor(index)));
}

/**
 * Resolve the next tab index for keyboard navigation on a tablist.
 * MUI Tabs already implement these keys; this helper keeps behavior testable
 * and available to non-MUI callers.
 */
export function workspaceTabIndexFromKey(
  key: string,
  currentIndex: number,
  tabCount = WORKSPACE_TABS.length
): number | null {
  if (tabCount <= 0) return null;
  const current = clampWorkspaceTabIndex(currentIndex, tabCount);
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % tabCount;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + tabCount) % tabCount;
    case "Home":
      return 0;
    case "End":
      return tabCount - 1;
    default:
      return null;
  }
}

export type HeaderSecondaryActionId = "report" | "excel" | "verify" | "reset" | "theme";

export const HEADER_SECONDARY_ACTIONS: readonly {
  id: HeaderSecondaryActionId;
  label: string;
  /** Accessible name for the control (defaults to label). */
  ariaLabel?: string;
}[] = [
  { id: "report", label: "Report", ariaLabel: "Open print report" },
  { id: "excel", label: "Export Excel", ariaLabel: "Export scenario to Excel" },
  { id: "verify", label: "Verify data", ariaLabel: "Verify scenario data" },
  { id: "reset", label: "Reset", ariaLabel: "Reset all tab values to zero" },
  { id: "theme", label: "Toggle theme", ariaLabel: "toggle color mode" },
] as const;

export type HeaderSecondaryActionHandlers = {
  report: () => void;
  excel: () => void;
  verify: () => void;
  reset: () => void;
  theme: () => void;
};

/** Resolve a secondary action id to its handler (keeps menu/inline lists in sync). */
export function headerSecondaryActionHandler(
  id: HeaderSecondaryActionId,
  handlers: HeaderSecondaryActionHandlers
): () => void {
  return handlers[id];
}
