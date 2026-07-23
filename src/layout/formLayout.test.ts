import { describe, expect, it } from "vitest";
import {
  FORM_CONTAINER_NAME,
  clampFormFieldSpan,
  formContainerBreakpoints,
  formFieldGridColumn,
  formFieldSpan2Col,
  formFieldSpan3Col,
  formFieldSpan4Col,
  formGridGapPx,
  minOperationalFontPx,
  resolveFormColumns,
  touchTargetCoarsePx,
  touchTargetFinePx,
  workspaceMaxWidth,
} from "./formLayout";

describe("formLayout compatibility exports", () => {
  it("keeps Grid2 span tokens and workspace width", () => {
    expect(formFieldSpan4Col).toEqual({ xs: 12, sm: 6, md: 3 });
    expect(formFieldSpan3Col).toEqual({ xs: 12, sm: 6, md: 4 });
    expect(formFieldSpan2Col).toEqual({ xs: 12, sm: 6 });
    expect(workspaceMaxWidth).toBe(1680);
  });

  it("exposes touch and type floors for theme density", () => {
    expect(touchTargetFinePx).toBe(36);
    expect(touchTargetCoarsePx).toBe(44);
    expect(minOperationalFontPx).toBe(12);
  });

  it("uses a stable named container for FormGrid queries", () => {
    expect(FORM_CONTAINER_NAME).toBe("pp-form");
  });
});

describe("resolveFormColumns", () => {
  it("returns 1 column below the two-column breakpoint", () => {
    expect(resolveFormColumns(0)).toBe(1);
    expect(resolveFormColumns(formContainerBreakpoints.twoCol - 1)).toBe(1);
  });

  it("steps 2 → 3 → 4 at container breakpoints", () => {
    expect(resolveFormColumns(formContainerBreakpoints.twoCol)).toBe(2);
    expect(resolveFormColumns(formContainerBreakpoints.threeCol)).toBe(3);
    expect(resolveFormColumns(formContainerBreakpoints.fourCol)).toBe(4);
    expect(resolveFormColumns(1200)).toBe(4);
  });

  it("respects maxColumns cap", () => {
    expect(resolveFormColumns(900, 2)).toBe(2);
    expect(resolveFormColumns(900, 3)).toBe(3);
    expect(resolveFormColumns(400, 4)).toBe(2);
    expect(resolveFormColumns(200, 4)).toBe(1);
  });

  it("treats non-finite widths as empty", () => {
    expect(resolveFormColumns(Number.NaN)).toBe(1);
    expect(resolveFormColumns(Number.POSITIVE_INFINITY, 4)).toBe(1);
  });
});

describe("clampFormFieldSpan", () => {
  it("clamps requested span to available columns", () => {
    expect(clampFormFieldSpan(4, 1)).toBe(1);
    expect(clampFormFieldSpan(4, 2)).toBe(2);
    expect(clampFormFieldSpan(4, 3)).toBe(3);
    expect(clampFormFieldSpan(4, 4)).toBe(4);
    expect(clampFormFieldSpan(2, 3)).toBe(2);
    expect(clampFormFieldSpan(1, 4)).toBe(1);
  });

  it("normalizes invalid span input", () => {
    expect(clampFormFieldSpan(0, 4)).toBe(1);
    expect(clampFormFieldSpan(-2, 2)).toBe(1);
    expect(clampFormFieldSpan(9, 3)).toBe(3);
    expect(clampFormFieldSpan(Number.NaN, 2)).toBe(1);
  });

  it("pairs with resolveFormColumns so wide containers still respect maxColumns", () => {
    const available = resolveFormColumns(1200, 2);
    expect(available).toBe(2);
    expect(clampFormFieldSpan(4, available)).toBe(2);
    expect(formFieldGridColumn(4, available)).toBe("span 2");
    expect(formFieldGridColumn(1, available)).toBe("auto");
  });

  it("produces auto for single-column bands", () => {
    const available = resolveFormColumns(200, 4);
    expect(formFieldGridColumn(3, available)).toBe("auto");
  });
});

describe("formGridGapPx", () => {
  it("uses denser gaps when compact", () => {
    expect(formGridGapPx(true)).toEqual({ row: 4, column: 6 });
    expect(formGridGapPx(false)).toEqual({ row: 8, column: 8 });
  });
});
