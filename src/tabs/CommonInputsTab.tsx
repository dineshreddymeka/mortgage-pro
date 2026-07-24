import { useMemo } from "react";
import { MortgageInputsFields } from "../components/MortgageInputsFields";
import { deriveScenario } from "../lib/deriveScenario";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";
import { CashInvestedPanel } from "./commonInputs/CashInvestedPanel";
import { summarizeCommonCashInvested } from "./commonInputs/commonInputsHelpers";
import {
  COMMON_INPUTS_BOARD_LAYOUT_REVISION,
  COMMON_INPUTS_BOARD_PRESET,
  commonInputsWidgetLayouts,
  commonInputsWidgetLgLayout,
} from "./commonInputs/commonInputsTabLayout";

export type CommonInputsTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/**
 * Canonical editor for fields shared across Financing, Upfront, Rental, and Exit.
 * Specialized tabs keep credits/fee model, rent/OpEx, and sale assumptions.
 */
export function CommonInputsTab({ state, patch }: CommonInputsTabProps) {
  const derived = useMemo(() => deriveScenario(state), [state]);
  const cashSummary = useMemo(
    () =>
      summarizeCommonCashInvested(state, {
        loanAmount: derived.loanAmount,
        netCashToClose: derived.netCashToClose,
      }),
    [derived.loanAmount, derived.netCashToClose, state]
  );

  const widgets = useMemo(
    () => [
      {
        id: "loan-carrying",
        title: "Loan & carrying",
        description: "Price · down · APR · term · tax · ins · HOA · PMI · extra",
        defaultLayout: commonInputsWidgetLgLayout("loan-carrying"),
        defaultLayouts: commonInputsWidgetLayouts("loan-carrying"),
        content: (
          <MortgageInputsFields
            state={state}
            patch={patch}
            compactGrid
            inputSize="small"
            purchasePriceHelperText="Shared purchase price for financing, rental, and exit"
          />
        ),
      },
      {
        id: "cash-invested",
        title: "Cash invested",
        description: "Closing · misc · loan & net cash",
        defaultLayout: commonInputsWidgetLgLayout("cash-invested"),
        defaultLayouts: commonInputsWidgetLayouts("cash-invested"),
        content: <CashInvestedPanel state={state} patch={patch} summary={cashSummary} />,
      },
    ],
    [cashSummary, patch, state]
  );

  return (
    <WidgetBoard
      boardId="common-inputs"
      widgets={widgets}
      rowHeight={28}
      layoutRevision={COMMON_INPUTS_BOARD_LAYOUT_REVISION}
      preset={COMMON_INPUTS_BOARD_PRESET}
    />
  );
}
