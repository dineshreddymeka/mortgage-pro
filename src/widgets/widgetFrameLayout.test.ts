import { describe, expect, it } from "vitest";
import { resolveWidgetBodyOverflow } from "./widgetFrameLayout";

describe("resolveWidgetBodyOverflow", () => {
  it("keeps natural mobile stacks always visible", () => {
    expect(resolveWidgetBodyOverflow(true)).toBe("visible");
    expect(resolveWidgetBodyOverflow(true, false)).toBe("visible");
    expect(resolveWidgetBodyOverflow(true, true)).toBe("visible");
  });

  it("hides desktop body overflow when scrollBody opts into child-owned scrolling", () => {
    expect(resolveWidgetBodyOverflow(false, true)).toBe("hidden");
  });

  it("keeps desktop fixed-height bodies on overflow auto when scrollBody is off", () => {
    expect(resolveWidgetBodyOverflow(false)).toBe("auto");
    expect(resolveWidgetBodyOverflow(false, false)).toBe("auto");
  });
});
