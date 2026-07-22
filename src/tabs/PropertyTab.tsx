import { useMemo } from "react";
import { CollaborationAuthPanel } from "../components/CollaborationAuthPanel";
import { ExternalEstimateSuggestionsPanel } from "../components/ExternalEstimateSuggestionsPanel";
import { HouseCollaborationPanel } from "../components/HouseCollaborationPanel";
import { PropertyLocationCard } from "../components/PropertyLocationCard";
import { LocationCostPanel } from "../components/LocationCostPanel";
import { PropertyNameCard } from "../components/PropertyNameCard";
import { ShareSnapshotPanel } from "../components/ShareSnapshotPanel";
import { WidgetBoard } from "../widgets/WidgetBoard";
import type { HouseAccessRole } from "../collaboration/types";
import type { AppPersisted } from "../storage/mortgageState";

export type PropertyTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  houseId: string;
  propertyName: string;
  propertyDocId: string | null;
  ownerUid: string | null;
  viewerEmail: string | null;
  activeAccessRole: HouseAccessRole;
  cloudReady: boolean;
  onReloadPortfolio?: () => void;
  onNotify?: (message: string, severity?: "success" | "error") => void;
  onRename: (name: string) => Promise<string | null>;
};

export function PropertyTab({
  state,
  patch,
  houseId,
  propertyName,
  propertyDocId,
  ownerUid,
  viewerEmail,
  activeAccessRole,
  cloudReady,
  onReloadPortfolio,
  onNotify,
  onRename,
}: PropertyTabProps) {
  const widgets = useMemo(
    () => [
      {
        id: "account",
        title: "Account & sign-in",
        description: "Anonymous default · link Google to keep UID",
        collapsible: true,
        defaultLayout: { x: 0, y: 0, w: 12, h: 8, minW: 4, minH: 5 },
        content: (
          <CollaborationAuthPanel
            cloudReady={cloudReady}
            onReloadPortfolio={onReloadPortfolio}
            onNotify={onNotify}
          />
        ),
      },
      {
        id: "identity",
        title: "Property name",
        description: "Label used across the portfolio",
        collapsible: true,
        defaultLayout: { x: 0, y: 8, w: 12, h: 5, minW: 4, minH: 2 },
        content: (
          <PropertyNameCard
            houseId={houseId}
            name={propertyName}
            cloudReady={cloudReady && activeAccessRole === "owner"}
            onSave={onRename}
          />
        ),
      },
      {
        id: "collaboration",
        title: "Collaborators",
        description: "Invite by UID or email hash · member edits only",
        collapsible: true,
        defaultLayout: { x: 0, y: 13, w: 12, h: 12, minW: 4, minH: 6 },
        content: (
          <HouseCollaborationPanel
            propertyDocId={propertyDocId}
            viewerUid={ownerUid}
            viewerEmail={viewerEmail}
            cloudReady={cloudReady}
            onNotify={onNotify}
            onMembersChanged={onReloadPortfolio}
          />
        ),
      },
      {
        id: "location",
        title: "Property location",
        description: "Address + map for this house",
        collapsible: true,
        defaultLayout: { x: 0, y: 25, w: 12, h: 12, minW: 4, minH: 2 },
        content: <PropertyLocationCard state={state} patch={patch} />,
      },
      {
        id: "location-costs",
        title: "Location cost hints",
        description: "State / postal benchmarks",
        collapsible: true,
        defaultLayout: { x: 0, y: 37, w: 12, h: 8, minW: 4, minH: 5 },
        content: <LocationCostPanel state={state} patch={patch} />,
      },
      {
        id: "external-estimates",
        title: "External estimates",
        description: "Tax, insurance, rent, value comps — explicit apply only",
        collapsible: true,
        defaultLayout: { x: 0, y: 45, w: 12, h: 12, minW: 4, minH: 6 },
        content: (
          <ExternalEstimateSuggestionsPanel
            state={state}
            patch={patch}
            categories={["tax", "insurance", "rent", "comps"]}
            onNotify={onNotify}
          />
        ),
      },
      {
        id: "share-snapshots",
        title: "Share snapshots",
        description: "Immutable read-only links for this house",
        collapsible: true,
        defaultLayout: { x: 0, y: 57, w: 12, h: 12, minW: 4, minH: 6 },
        content: (
          <ShareSnapshotPanel
            state={state}
            ownerUid={ownerUid}
            houseLabel={propertyName}
            houseId={houseId}
            propertyDocId={propertyDocId}
            cloudReady={cloudReady}
            onNotify={onNotify}
          />
        ),
      },
    ],
    [
      activeAccessRole,
      cloudReady,
      houseId,
      onNotify,
      onReloadPortfolio,
      onRename,
      ownerUid,
      patch,
      propertyDocId,
      propertyName,
      state,
      viewerEmail,
    ]
  );

  return <WidgetBoard boardId="property" widgets={widgets} rowHeight={28} />;
}
