/**
 * Resolve WidgetFrame body overflow.
 *
 * - Natural mobile stacks stay fully visible (no nested frame scroll).
 * - Desktop + `scrollBody`: hide overflow so a height-aware child table/list owns scrolling.
 * - Desktop without `scrollBody`: keep overflow:auto so fixed-height cells cannot overlap neighbors.
 */
export function resolveWidgetBodyOverflow(
  mobileStack: boolean,
  scrollBody?: boolean
): "auto" | "visible" | "hidden" {
  if (mobileStack) return "visible";
  if (scrollBody) return "hidden";
  return "auto";
}
