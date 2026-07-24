import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { RentVsBuyPanel } from "../components/RentVsBuyPanel";
import { TaxAssumptionsPanel } from "../components/TaxAssumptionsPanel";
import { deriveScenario } from "../lib/deriveScenario";
import { cumulativeCashFlowThroughExitMonths } from "../lib/rentalMath";
import { futureHomeValue, REAL_WEALTH_MILESTONE_YEARS } from "../lib/whenToSellMath";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";
import { ExitAmortizationPanel } from "./exit/ExitAmortizationPanel";
import { ExitMilestoneMatrixPanel } from "./exit/ExitMilestoneMatrixPanel";
import { ExitRentalYieldPolicyPanel } from "./exit/ExitRentalYieldPolicyPanel";
import { ExitSaleAssumptionsPanel } from "./exit/ExitSaleAssumptionsPanel";
import { ExitSharedScenarioPanel } from "./exit/ExitSharedScenarioPanel";
import { ExitYearlyProjectionPanel } from "./exit/ExitYearlyProjectionPanel";
import {
  EXIT_BOARD_LAYOUT_REVISION,
  EXIT_BOARD_PRESET,
  exitWidgetLayouts,
  exitWidgetLgLayout,
} from "./exit/exitTabLayout";

export type WhenToSellTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  onGoToFinancing?: () => void;
  onGoToUpfront?: () => void;
  onGoToRental?: () => void;
  onGoToResearch?: () => void;
};

/** Category: Exit — sale timing & gain. Shared Financing/Upfront/Rental via Edit actions. */
export function WhenToSellTab({
  state,
  patch,
  onGoToFinancing,
  onGoToUpfront,
  onGoToRental,
  onGoToResearch,
}: WhenToSellTabProps) {
  const derived = useMemo(() => deriveScenario(state), [state]);
  const loanAmount = derived.loanAmount;
  const apr = state.interestRateApr;
  const basePrice = derived.purchasePrice;

  /** Sale / net-proceeds detail row follows Mortgage tab loan term (clamped 1–30 yr). */
  const exitHorizonYears = derived.termYears;

  const appreciationPct = state.sellAnnualAppreciationPercent;
  const sellingCostPct = state.sellClosingCostPercent;
  const yearsOwnedClamped = Math.max(1, Math.round(state.yearsOwned));
  /** Value from scenario purchase × implied compound rate × years (sanity-check vs your present value). */
  const calculatedPresentHomeValue = useMemo(
    () => futureHomeValue(basePrice, appreciationPct, yearsOwnedClamped),
    [basePrice, appreciationPct, yearsOwnedClamped]
  );

  const rental30Path = derived.rental30;
  const rental15Path = derived.rental15;
  const rentalUserTermPath = derived.rental;
  const monthly = derived.monthlyPayment;
  /** Extra columns when the Mortgage tab term is not exactly 15 or 30 (those match the comparison paths). */
  const showUserTermColumn = exitHorizonYears !== 15 && exitHorizonYears !== 30;
  const initialCashInvested = rental30Path.initialCashInvested;

  const yieldCf30Annual = derived.yieldCashFlowAnnual30;
  const yieldCf15Annual = derived.yieldCashFlowAnnual15;

  /** Cumulative rent cash in gain math: P&amp;I only while that amortization is still active (then NOI-only months). */
  const cumulativeRentByExitYear = useMemo(() => {
    const maxY = 30;
    const path30: number[] = new Array(maxY + 1).fill(0);
    const path15: number[] = new Array(maxY + 1).fill(0);
    const pathUserTerm: number[] = new Array(maxY + 1).fill(0);
    for (let y = 1; y <= maxY; y++) {
      const m = y * 12;
      path30[y] = cumulativeCashFlowThroughExitMonths(
        rental30Path,
        state.sellRentalYieldInclude,
        30,
        m
      );
      path15[y] = cumulativeCashFlowThroughExitMonths(
        rental15Path,
        state.sellRentalYieldInclude,
        15,
        m
      );
      pathUserTerm[y] = cumulativeCashFlowThroughExitMonths(
        rentalUserTermPath,
        state.sellRentalYieldInclude,
        exitHorizonYears,
        m
      );
    }
    return { path30, path15, pathUserTerm };
  }, [
    rental30Path,
    rental15Path,
    rentalUserTermPath,
    exitHorizonYears,
    state.sellRentalYieldInclude,
  ]);

  const rows = derived.sellRows;
  const wealthSnapshots = derived.realWealthSnapshots;
  const milestoneYearsLabel = REAL_WEALTH_MILESTONE_YEARS.join(", ");

  const widgets = useMemo(
    () => [
      {
        id: "overview",
        title: "Overview",
        description: `Shared scenario · ${apr.toFixed(2)}% · ${state.termYears}y · Ln ${loanAmount > 0 ? Math.round(loanAmount).toLocaleString() : "—"}`,
        defaultLayout: exitWidgetLgLayout("overview"),
        defaultLayouts: exitWidgetLayouts("overview"),
        content: (
          <ExitSharedScenarioPanel
            homePrice={state.homePrice}
            interestRateApr={state.interestRateApr}
            termYears={state.termYears}
            netInitialCashInvested={initialCashInvested}
            monthlyRent={state.monthlyRent}
            mortgage={monthly}
            onGoToFinancing={onGoToFinancing}
            onGoToUpfront={onGoToUpfront}
            onGoToRental={onGoToRental}
          />
        ),
      },
      {
        id: "sale-assumptions",
        title: "Sale assumptions",
        description: `${Number.isFinite(appreciationPct) ? appreciationPct.toFixed(2) : "0"}% implied · present $${Math.round(state.currentHomeValue).toLocaleString()} · ${sellingCostPct}% close`,
        defaultLayout: exitWidgetLgLayout("sale-assumptions"),
        defaultLayouts: exitWidgetLayouts("sale-assumptions"),
        content: (
          <ExitSaleAssumptionsPanel
            state={state}
            patch={patch}
            appreciationPct={appreciationPct}
            sellingCostPct={sellingCostPct}
            yearsOwnedClamped={yearsOwnedClamped}
            calculatedPresentHomeValue={calculatedPresentHomeValue}
          />
        ),
      },
      {
        id: "rental-yield",
        title: "Rental-yield policy",
        description: `What counts in gain · CF ${Math.round(yieldCf30Annual / 12).toLocaleString()}/mo (30)`,
        defaultLayout: exitWidgetLgLayout("rental-yield"),
        defaultLayouts: exitWidgetLayouts("rental-yield"),
        content: (
          <ExitRentalYieldPolicyPanel
            state={state}
            patch={patch}
            rental30Path={rental30Path}
            rental15Path={rental15Path}
            yieldCf30Annual={yieldCf30Annual}
            yieldCf15Annual={yieldCf15Annual}
            onGoToRental={onGoToRental}
          />
        ),
      },
      {
        id: "milestones",
        title: "Exit milestones",
        description: `Years ${milestoneYearsLabel} · matrix + selected-year detail`,
        defaultLayout: exitWidgetLgLayout("milestones"),
        defaultLayouts: exitWidgetLayouts("milestones"),
        scrollBody: true,
        content: (
          <ExitMilestoneMatrixPanel
            wealthSnapshots={wealthSnapshots}
            exitInvestments={derived.exitInvestments}
            showUserTermColumn={showUserTermColumn}
            userTermYears={exitHorizonYears}
            hasCashIn={initialCashInvested > 0}
          />
        ),
      },
      {
        id: "tax",
        title: "Tax & after-tax exit",
        description: "Optional sale tax · 1031 · not tax advice",
        defaultLayout: exitWidgetLgLayout("tax"),
        defaultLayouts: exitWidgetLayouts("tax"),
        content: (
          <TaxAssumptionsPanel
            state={state}
            patch={patch}
            derivedTax={derived.tax}
            variant="exit"
            onGoToResearch={onGoToResearch}
            taxIssueCount={state.research?.taxIssues?.length ?? 0}
          />
        ),
      },
      {
        id: "yearly-projection",
        title: "Yearly projection",
        description: `Equity path · ${rows.length} yrs · page + term select`,
        defaultLayout: exitWidgetLgLayout("yearly-projection"),
        defaultLayouts: exitWidgetLayouts("yearly-projection"),
        scrollBody: true,
        content: (
          <ExitYearlyProjectionPanel
            rows={rows}
            cumulativeRentByExitYear={cumulativeRentByExitYear}
            initialCashInvested={initialCashInvested}
            exitHorizonYears={exitHorizonYears}
            showUserTermColumn={showUserTermColumn}
            appreciationPct={appreciationPct}
            sellingCostPct={sellingCostPct}
          />
        ),
      },
      {
        id: "amortization",
        title: "Amortization detail",
        description: "Interest & principal by exit year",
        defaultLayout: exitWidgetLgLayout("amortization"),
        defaultLayouts: exitWidgetLayouts("amortization"),
        scrollBody: true,
        content: (
          <ExitAmortizationPanel
            wealthSnapshots={wealthSnapshots}
            showUserTermColumn={showUserTermColumn}
            userTermYears={exitHorizonYears}
          />
        ),
      },
      {
        id: "rent-vs-buy",
        title: "Rent vs buy",
        description: "Hold vs rent & invest",
        defaultLayout: exitWidgetLgLayout("rent-vs-buy"),
        defaultLayouts: exitWidgetLayouts("rent-vs-buy"),
        content: <RentVsBuyPanel state={state} patch={patch} />,
      },
    ],
    [
      appreciationPct,
      apr,
      calculatedPresentHomeValue,
      cumulativeRentByExitYear,
      derived.exitInvestments,
      derived.tax,
      exitHorizonYears,
      initialCashInvested,
      loanAmount,
      milestoneYearsLabel,
      monthly,
      onGoToFinancing,
      onGoToRental,
      onGoToResearch,
      onGoToUpfront,
      patch,
      rental15Path,
      rental30Path,
      rows,
      sellingCostPct,
      showUserTermColumn,
      state,
      wealthSnapshots,
      yearsOwnedClamped,
      yieldCf15Annual,
      yieldCf30Annual,
    ]
  );

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, fontSize: "12px" }}>
        Category: <strong>Exit</strong> — sale timing &amp; gain. Loan, cash-to-close, and rent via Shared
        scenario Edit actions.
      </Typography>
      <WidgetBoard
        boardId="when-to-sell"
        widgets={widgets}
        rowHeight={28}
        layoutRevision={EXIT_BOARD_LAYOUT_REVISION}
        preset={EXIT_BOARD_PRESET}
      />
    </Stack>
  );
}
