/**
 * Shared form-layout tokens for the compact UI pass.
 *
 * Viewport Grid2 spans remain for compatibility with existing callers.
 * Prefer `FormGrid` / `FormField` for container-aware 1–4 column layouts.
 *
 * Container breakpoints live here only — FormGrid interpolates them into
 * `@container` rules (CSS custom properties cannot drive container queries).
 */

/** Full width phone; half width tablet; quarter width desktop (4 fields per row). */
export const formFieldSpan4Col = { xs: 12 as const, sm: 6 as const, md: 3 as const };

/** Full width phone; half width tablet; third width desktop (3 fields per row). */
export const formFieldSpan3Col = { xs: 12 as const, sm: 6 as const, md: 4 as const };

/** Full width phone; half width tablet (2 fields per row). */
export const formFieldSpan2Col = { xs: 12 as const, sm: 6 as const };

/** Tighter Grid2 / FormGrid spacing for compact mortgage / widget forms. */
export const compactFormGridSpacing = { xs: 0.75, md: 0.5 } as const;

/** Standard Grid2 / FormGrid spacing for roomier forms. */
export const formGridSpacing = 1 as const;

/** App shell max width — uses horizontal space on wide screens without over-stretching widgets. */
export const workspaceMaxWidth = 1680;

/** Minimum operational UI text size (labels, helpers, buttons, table chrome). */
export const minOperationalFontPx = 12;

/** Fine-pointer (mouse) minimum interactive target height. */
export const touchTargetFinePx = 36;

/** Coarse-pointer (touch) minimum interactive target height. */
export const touchTargetCoarsePx = 44;

/** Named CSS container used by FormGrid (outer) / FormField queries. */
export const FORM_CONTAINER_NAME = "pp-form";

/**
 * Container-query breakpoints (px of FormGrid outer inline size) for column count.
 * Tuned so typical labeled fields stay readable (~160px+ per column).
 */
export const formContainerBreakpoints = {
  twoCol: 360,
  threeCol: 540,
  fourCol: 720,
} as const;

export type FormColumnCount = 1 | 2 | 3 | 4;

/**
 * Resolve how many columns a form should use for a measured container width.
 * Caps at `maxColumns` (default 4).
 */
export function resolveFormColumns(
  containerWidth: number,
  maxColumns: FormColumnCount = 4
): FormColumnCount {
  if (!Number.isFinite(containerWidth)) return 1;
  const width = Math.max(0, containerWidth);
  const cap = Math.min(4, Math.max(1, maxColumns)) as FormColumnCount;

  let cols: FormColumnCount = 1;
  if (width >= formContainerBreakpoints.fourCol) cols = 4;
  else if (width >= formContainerBreakpoints.threeCol) cols = 3;
  else if (width >= formContainerBreakpoints.twoCol) cols = 2;

  return Math.min(cols, cap) as FormColumnCount;
}

/**
 * Clamp a requested field span to the columns actually available so CSS Grid
 * does not create implicit tracks (`span 4` in a 2-col grid).
 */
export function clampFormFieldSpan(
  span: number,
  availableColumns: FormColumnCount
): FormColumnCount {
  const raw = Number.isFinite(span) ? Math.floor(span) : 1;
  const wanted = Math.min(4, Math.max(1, raw)) as FormColumnCount;
  const available = Math.min(4, Math.max(1, availableColumns)) as FormColumnCount;
  return Math.min(wanted, available) as FormColumnCount;
}

/** `grid-column` value for a clamped span (`auto` when single-column). */
export function formFieldGridColumn(span: number, availableColumns: FormColumnCount): string {
  const clamped = clampFormFieldSpan(span, availableColumns);
  return clamped <= 1 ? "auto" : `span ${clamped}`;
}

/** CSS gap values (px) matching MUI spacing units used by FormGrid. */
export function formGridGapPx(compact: boolean): { row: number; column: number } {
  if (compact) {
    // compactFormGridSpacing: xs 0.75 → 6px, md 0.5 → 4px — use the denser gap.
    return { row: 4, column: 6 };
  }
  // formGridSpacing: 1 → 8px
  return { row: 8, column: 8 };
}
