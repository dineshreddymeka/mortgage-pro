import { useMemo } from "react";
import { PropertyLocationCard } from "../components/PropertyLocationCard";
import { PropertyNameCard } from "../components/PropertyNameCard";
import { WidgetBoard } from "../widgets/WidgetBoard";
import type { AppPersisted } from "../storage/mortgageState";

export type PropertyTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  houseId: string;
  propertyName: string;
  cloudReady: boolean;
  onRename: (name: string) => Promise<string | null>;
};

/** Category: Property — name, address, map. */
export function PropertyTab({
  state,
  patch,
  houseId,
  propertyName,
  cloudReady,
  onRename,
}: PropertyTabProps) {
  const widgets = useMemo(
    () => [
      {
        id: "identity",
        title: "Property name",
        description: "Label used across the portfolio",
        collapsible: true,
        defaultLayout: { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 2 },
        content: (
          <PropertyNameCard
            houseId={houseId}
            name={propertyName}
            cloudReady={cloudReady}
            onSave={onRename}
          />
        ),
      },
      {
        id: "location",
        title: "Property location",
        description: "Address + map for this house",
        collapsible: true,
        defaultLayout: { x: 0, y: 5, w: 12, h: 12, minW: 4, minH: 2 },
        content: <PropertyLocationCard state={state} patch={patch} />,
      },
    ],
    [cloudReady, houseId, onRename, patch, propertyName, state]
  );

  return <WidgetBoard boardId="property" widgets={widgets} rowHeight={28} />;
}
