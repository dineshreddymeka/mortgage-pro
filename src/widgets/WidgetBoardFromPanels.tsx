import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import { WidgetBoard, type WidgetBoardItem } from "./WidgetBoard";

export type WidgetPanelProps = {
  id: string;
  title: string;
  description?: string;
  /** Default height in grid rows (lg). */
  h?: number;
  /** Default width in grid cols (lg, max 12). */
  w?: number;
  /** Allow collapsing this panel to a title bar. */
  collapsible?: boolean;
  children: ReactNode;
};

/** Marker component — only meaningful as a child of WidgetBoardFromPanels. */
export function WidgetPanel(_props: WidgetPanelProps) {
  return null;
}

function isWidgetPanel(node: ReactNode): node is ReactElement<WidgetPanelProps> {
  return isValidElement(node) && node.type === WidgetPanel;
}

export type WidgetBoardFromPanelsProps = {
  boardId: string;
  children: ReactNode;
  rowHeight?: number;
};

/** Collects `<WidgetPanel>` children into a draggable/resizable WidgetBoard. */
export function WidgetBoardFromPanels({
  boardId,
  children,
  rowHeight = 28,
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
        collapsible = false,
      } = panel.props;
      const width = Math.min(12, Math.max(3, w));
      const height = Math.max(4, h);
      const item: WidgetBoardItem = {
        id,
        title,
        description,
        collapsible,
        defaultLayout: {
          x: 0,
          y,
          w: width,
          h: height,
          minW: 3,
          minH: collapsible ? 2 : 4,
        },
        content,
      };
      y += height;
      return item;
    });
  }, [children]);

  return <WidgetBoard boardId={boardId} widgets={widgets} rowHeight={rowHeight} />;
}
