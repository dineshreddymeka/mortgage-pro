import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import { WidgetBoard, type WidgetBoardItem } from "./WidgetBoard";
import type { WidgetBreakpointLayouts } from "./widgetLayout";

export type WidgetPanelProps = {
  id: string;
  title: string;
  description?: string;
  /** Default height in grid rows (lg). */
  h?: number;
  /** Default width in grid cols (lg, max 12). */
  w?: number;
  /** Explicit per-breakpoint defaults (optional; falls back to h/w → defaultLayout). */
  defaultLayouts?: WidgetBreakpointLayouts;
  /** Opt-in scrolling body for tables/lists inside this panel. */
  scrollBody?: boolean;
  children: ReactNode;
};

/** Marker component — only meaningful as a child of WidgetBoardFromPanels. */
export function WidgetPanel(props: WidgetPanelProps) {
  void props;
  return null;
}

function isWidgetPanel(node: ReactNode): node is ReactElement<WidgetPanelProps> {
  return isValidElement(node) && node.type === WidgetPanel;
}

export type WidgetBoardFromPanelsProps = {
  boardId: string;
  children: ReactNode;
  /** When omitted, board-specific legacy/compact defaults apply via WidgetBoard. */
  rowHeight?: number;
  /** Board-specific layout preset revision (forwarded to WidgetBoard). */
  layoutRevision?: number;
  preset?: string;
};

/** Collects `<WidgetPanel>` children into a draggable/resizable WidgetBoard. */
export function WidgetBoardFromPanels({
  boardId,
  children,
  rowHeight,
  layoutRevision,
  preset,
}: WidgetBoardFromPanelsProps) {
  const widgets: WidgetBoardItem[] = useMemo(() => {
    const panels = Children.toArray(children).filter(isWidgetPanel);
    let y = 0;
    return panels.map((panel) => {
      const {
        id,
        title,
        description,
        children: content,
        h = 12,
        w = 12,
        defaultLayouts,
        scrollBody,
      } = panel.props;
      const width = Math.min(12, Math.max(3, w));
      const height = Math.max(4, h);
      const item: WidgetBoardItem = {
        id,
        title,
        description,
        defaultLayout: { x: 0, y, w: width, h: height, minW: 3, minH: 4 },
        defaultLayouts,
        scrollBody,
        content,
      };
      y += height;
      return item;
    });
  }, [children]);

  return (
    <WidgetBoard
      boardId={boardId}
      widgets={widgets}
      rowHeight={rowHeight}
      layoutRevision={layoutRevision}
      preset={preset}
    />
  );
}
