import { useMemo } from "react";
import { PropertyLocationCard } from "../components/PropertyLocationCard";
import { WidgetBoard } from "../widgets/WidgetBoard";
import type { AppPersisted } from "../storage/mortgageState";

export type PropertyTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/** Category: Property — address + map only. */
export function PropertyTab({ state, patch }: PropertyTabProps) {
  const widgets = useMemo(
    () => [
      {
        id: "location",
        title: "Property location",
        description: "Address + map for this house",
        collapsible: true,
        defaultLayout: { x: 0, y: 0, w: 12, h: 12, minW: 4, minH: 2 },
        content: <PropertyLocationCard state={state} patch={patch} />,
      },
    ],
    [patch, state]
  );

  return <WidgetBoard boardId="property" widgets={widgets} rowHeight={28} />;
}
