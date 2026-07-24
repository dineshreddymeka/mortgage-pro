import { useMemo } from "react";
import { CollaborationAuthPanel } from "../components/CollaborationAuthPanel";
import { ExternalEstimateSuggestionsPanel } from "../components/ExternalEstimateSuggestionsPanel";
import { HouseCollaborationPanel } from "../components/HouseCollaborationPanel";
import { PropertyLocationCard } from "../components/PropertyLocationCard";
import { LocationCostPanel } from "../components/LocationCostPanel";
import { PropertyNameCard } from "../components/PropertyNameCard";
import { ScenarioImportPanel } from "../components/ScenarioImportPanel";
import { ShareSnapshotPanel } from "../components/ShareSnapshotPanel";
import { WidgetBoard } from "../widgets/WidgetBoard";
import type { HouseAccessRole } from "../collaboration/types";
import type { AppPersisted } from "../storage/mortgageState";
import {
  PROPERTY_BOARD_LAYOUT_REVISION,
  PROPERTY_BOARD_PRESET,
  propertyWidgetLayouts,
  propertyWidgetLgLayout,
} from "./propertyTabLayout";

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
  onReplaceScenario: (scenario: AppPersisted) => void;
  onCreateImportedHouse: (
    scenario: AppPersisted,
    suggestedName: string | null
  ) => Promise<string | null>;
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
  onReplaceScenario,
  onCreateImportedHouse,
}: PropertyTabProps) {
  // DOM order is stack order below tablet width — essentials before administration.
  const widgets = useMemo(
    () => [
      {
        id: "identity",
        title: "Property name",
        description: "Label used across the portfolio",
        defaultLayout: propertyWidgetLgLayout("identity"),
        defaultLayouts: propertyWidgetLayouts("identity"),
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
        id: "location",
        title: "Property location",
        description: "Address + map for this house",
        defaultLayout: propertyWidgetLgLayout("location"),
        defaultLayouts: propertyWidgetLayouts("location"),
        content: <PropertyLocationCard state={state} patch={patch} />,
      },
      {
        id: "location-costs",
        title: "Location cost hints",
        description: "State / postal benchmarks",
        defaultLayout: propertyWidgetLgLayout("location-costs"),
        defaultLayouts: propertyWidgetLayouts("location-costs"),
        content: <LocationCostPanel state={state} patch={patch} />,
      },
      {
        id: "external-estimates",
        title: "External estimates",
        description: "Tax, insurance, rent, value comps — explicit apply only",
        defaultLayout: propertyWidgetLgLayout("external-estimates"),
        defaultLayouts: propertyWidgetLayouts("external-estimates"),
        content: (
          <ExternalEstimateSuggestionsPanel
            state={state}
            patch={patch}
            categories={["tax", "insurance", "rent", "comps"]}
            hideTitle
            onNotify={onNotify}
          />
        ),
      },
      {
        id: "account",
        title: "Account & sign-in",
        description: "Anonymous default · link Google to keep UID",
        defaultLayout: propertyWidgetLgLayout("account"),
        defaultLayouts: propertyWidgetLayouts("account"),
        content: (
          <CollaborationAuthPanel
            cloudReady={cloudReady}
            onReloadPortfolio={onReloadPortfolio}
            onNotify={onNotify}
          />
        ),
      },
      {
        id: "scenario-import",
        title: "Scenario import",
        description: "Validate, preview, then explicitly apply JSON",
        defaultLayout: propertyWidgetLgLayout("scenario-import"),
        defaultLayouts: propertyWidgetLayouts("scenario-import"),
        content: (
          <ScenarioImportPanel
            state={state}
            houseId={houseId}
            houseName={propertyName}
            cloudReady={cloudReady}
            replaceCurrent={onReplaceScenario}
            createNew={onCreateImportedHouse}
            onNotify={onNotify}
          />
        ),
      },
      {
        id: "collaboration",
        title: "Collaborators",
        description: "Invite by UID or email hash · member edits only",
        defaultLayout: propertyWidgetLgLayout("collaboration"),
        defaultLayouts: propertyWidgetLayouts("collaboration"),
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
        id: "share-snapshots",
        title: "Share snapshots",
        description: "Immutable read-only links for this house",
        defaultLayout: propertyWidgetLgLayout("share-snapshots"),
        defaultLayouts: propertyWidgetLayouts("share-snapshots"),
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
      onReplaceScenario,
      onCreateImportedHouse,
      ownerUid,
      patch,
      propertyDocId,
      propertyName,
      state,
      viewerEmail,
    ]
  );

  return (
    <WidgetBoard
      boardId="property"
      widgets={widgets}
      rowHeight={28}
      layoutRevision={PROPERTY_BOARD_LAYOUT_REVISION}
      preset={PROPERTY_BOARD_PRESET}
    />
  );
}
