import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useMemo } from "react";
import { DealStrategyPanel } from "../components/DealStrategyPanel";
import { GrowthAssumptionsPanel } from "../components/GrowthAssumptionsPanel";
import { RentalExpenseComposition } from "../components/RentalExpenseComposition";
import { RentalIncomeModePanel } from "../components/RentalIncomeModePanel";
import {
  RentalMetricCard,
  formatDscrDisplay,
  formatGrmDisplay,
  formatOnePercentRuleDisplay,
} from "../components/RentalMetricCard";
import { StressTestPanel } from "../components/StressTestPanel";
import { TaxAssumptionsPanel } from "../components/TaxAssumptionsPanel";
import { deriveScenario } from "../lib/deriveScenario";
import type { MonthlyBreakdown } from "../lib/mortgageMath";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoard } from "../widgets/WidgetBoard";
import { RentalFieldRow } from "./rental/RentalFieldControls";
import { RentalOperatingExpensesPanel } from "./rental/RentalOperatingExpensesPanel";
import { RentalProFormaLedgerPanel } from "./rental/RentalProFormaLedgerPanel";
import { RentalSharedScenarioPanel } from "./rental/RentalSharedScenarioPanel";
import { pctOfEgi } from "./rental/rentalProFormaLedger";
import {
  RENTAL_BOARD_LAYOUT_REVISION,
  RENTAL_BOARD_PRESET,
  rentalWidgetLayouts,
  rentalWidgetLgLayout,
} from "./rentalTabLayout";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pct1 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

export type RentalTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  onGoToFinancing?: () => void;
  onGoToUpfront?: () => void;
  onGoToResearch?: () => void;
};

/** Category: Rental — income, OpEx, pro forma. Financing/Upfront via Shared Scenario Edit actions. */
export function RentalTab({
  state,
  patch,
  onGoToFinancing,
  onGoToUpfront,
  onGoToResearch,
}: RentalTabProps) {
  const derived = useMemo(() => deriveScenario(state), [state]);
  const incomeMode = derived.rentalIncome.mode;
  const incomeLocked = incomeMode !== "simple";
  const mortgage: MonthlyBreakdown = derived.monthlyPayment;
  const r = derived.rental;
  const egi = r.effectiveGrossIncomeMonthly;
  const totalOpexMo = r.operatingExpenseLines.reduce((a, x) => a + x.amount, 0);
  const piMonthly = mortgage.principalAndInterest;
  const pmiMo = mortgage.pmi;
  const piSummaryRight =
    pmiMo > 0.001
      ? `${moneyDec.format(piMonthly)}/mo P&I · ${moneyDec.format(pmiMo)}/mo PMI · ${state.termYears}-yr`
      : `${moneyDec.format(piMonthly)}/mo P&I · ${state.termYears}-yr`;

  /**
   * If you've held longer than the loan term: same convention as When to sell gain after payoff — EGI/mo
   * (no OpEx, no P&amp;I), not pro-forma NOI.
   */
  const yearsOwnedRounded = Math.max(0, Math.round(state.yearsOwned));
  const termYearsRounded = Math.max(1, Math.round(state.termYears));
  const loanPaidOffByYearsHeld = yearsOwnedRounded > termYearsRounded;
  const mortgageFreeMonthly = r.effectiveGrossIncomeMonthly;
  const mortgageFreeAnnual = mortgageFreeMonthly * 12;

  const widgets = useMemo(
    () => [
      {
        id: "overview",
        title: "Overview",
        description: `Shared scenario · ${piSummaryRight}`,
        defaultLayout: rentalWidgetLgLayout("overview"),
        defaultLayouts: rentalWidgetLayouts("overview"),
        content: (
          <Stack spacing={0.85} className="pp-fade-in">
            <RentalSharedScenarioPanel
              ribbon
              homePrice={state.homePrice}
              interestRateApr={state.interestRateApr}
              termYears={state.termYears}
              downPayment={state.downPayment}
              closingCosts={state.closingCosts}
              miscInitialCash={state.miscInitialCash}
              mortgage={mortgage}
              onGoToFinancing={onGoToFinancing}
              onGoToUpfront={onGoToUpfront}
            />
            <Box id="rental-metrics-row">
            <Box
              sx={{
                display: "grid",
                gap: 0.65,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                  lg: "repeat(8, minmax(0, 1fr))",
                },
              }}
            >
              <RentalMetricCard
                label="Monthly cash flow"
                value={moneyDec.format(r.cashFlowMonthly)}
                detail={`Annual ${moneyDec.format(r.cashFlowAnnual)}`}
                hint="NOI − P&I"
                positive={r.cashFlowMonthly >= 0}
                title={`Monthly cash flow = NOI − P&I (${moneyDec.format(piMonthly)}/mo, ${state.termYears}-yr).`}
                note={
                  loanPaidOffByYearsHeld ? (
                    <>
                      Mortgage-free ≈ {moneyDec.format(mortgageFreeMonthly)}/mo EGI (held &gt;{" "}
                      {termYearsRounded} yr).
                    </>
                  ) : undefined
                }
              />
              <RentalMetricCard
                label="Annual cash flow"
                value={moneyDec.format(r.cashFlowAnnual)}
                detail={`Monthly ${moneyDec.format(r.cashFlowMonthly)}`}
                hint="12 × monthly cash flow"
                positive={r.cashFlowAnnual >= 0}
                note={
                  loanPaidOffByYearsHeld ? (
                    <>Mortgage-free ≈ {moneyDec.format(mortgageFreeAnnual)}/yr EGI.</>
                  ) : undefined
                }
              />
              <RentalMetricCard
                label="NOI / year"
                value={moneyDec.format(r.noiAnnual)}
                detail={`${moneyDec.format(r.noiMonthly)}/mo`}
                hint="After OpEx, before P&I"
              />
              <RentalMetricCard
                label="Cap rate"
                value={state.homePrice > 0 ? `${pct1.format(r.capRate * 100)}%` : null}
                detail={state.homePrice > 0 ? `Price ${money.format(state.homePrice)}` : undefined}
                hint="NOI ÷ purchase price"
                noDataHint="Set price"
              />
              <RentalMetricCard
                label="Cash-on-cash"
                value={r.initialCashInvested > 0 ? `${pct1.format(r.cashOnCash * 100)}%` : null}
                detail={r.initialCashInvested > 0 ? `${money.format(r.initialCashInvested)} invested` : undefined}
                hint="Annual CF ÷ cash invested"
                noDataHint="Add cash in"
              />
              <RentalMetricCard
                label="DSCR"
                value={formatDscrDisplay(r.dscr)}
                detail={r.dscr != null ? "NOI ÷ debt service" : undefined}
                hint="Annual NOI ÷ annual P&I+PMI"
                noDataHint={mortgage.loanAmount <= 0 ? "All-cash" : "—"}
                positive={r.dscr != null ? r.dscr >= 1 : undefined}
              />
              <RentalMetricCard
                label="Gross rent multiplier"
                value={formatGrmDisplay(r.grossRentMultiplier)}
                detail={r.grossRentMultiplier != null ? "Price ÷ annual GSI" : undefined}
                hint="Lower = less rent per $"
                noDataHint="Need price & rent"
              />
              <RentalMetricCard
                label="1% rule"
                value={formatOnePercentRuleDisplay(r.onePercentRuleRatio)}
                detail={
                  r.onePercentRuleRatio != null
                    ? r.onePercentRuleRatio >= 0.01
                      ? "Meets 1%"
                      : "Below 1%"
                    : undefined
                }
                hint="Monthly rent ÷ purchase price"
                noDataHint="Need price & rent"
                positive={r.onePercentRuleRatio != null ? r.onePercentRuleRatio >= 0.01 : undefined}
              />
            </Box>
            </Box>
          </Stack>
        ),
      },
      {
        id: "income",
        title: "Income",
        description: `GSI ${moneyDec.format(r.grossScheduledIncomeMonthly)} · vac −${moneyDec.format(r.vacancyLossMonthly)} → EGI ${moneyDec.format(egi)}`,
        defaultLayout: rentalWidgetLgLayout("income"),
        defaultLayouts: rentalWidgetLayouts("income"),
        content: (
          <Stack spacing={1} id="rental-edit-income">
            <RentalIncomeModePanel state={state} patch={patch} />
            <RentalFieldRow
              anchorId="rental-edit-rent"
              label="Rent"
              detail={
                incomeLocked
                  ? `Synced from ${incomeMode} mode — edit in panel above`
                  : "Any amount ≥ 0 · edit freely, saves when you leave the field"
              }
              valueLabel={money.format(state.monthlyRent)}
              textLabel="$/mo"
              textValue={formatNumberField(state.monthlyRent)}
              numericCommitOnBlur={
                incomeLocked
                  ? undefined
                  : {
                      min: 0,
                      max: 999_999,
                      committed: state.monthlyRent,
                      onCommit: (n) => patch({ monthlyRent: n }),
                    }
              }
              startAdornment={<InputAdornment position="start">$</InputAdornment>}
            />
            <RentalFieldRow
              anchorId="rental-edit-other-income"
              label="Other income"
              detail={incomeLocked ? "Synced from income mode" : "0–3k/mo"}
              valueLabel={money.format(state.otherMonthlyIncome)}
              textLabel="$/mo"
              textValue={formatNumberField(state.otherMonthlyIncome)}
              onText={
                incomeLocked
                  ? undefined
                  : (raw) => {
                      const n = Number(raw.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      patch({ otherMonthlyIncome: Math.min(3_000, Math.max(0, Math.round(n))) });
                    }
              }
              startAdornment={<InputAdornment position="start">$</InputAdornment>}
            />
            <RentalFieldRow
              anchorId="rental-edit-vacancy"
              label="Vacancy"
              detail={
                incomeLocked ? "Synced from income mode" : "0–100% · high vacancy stresses cash flow"
              }
              valueLabel={`${state.vacancyRatePercent.toFixed(1)}%`}
              textLabel="%"
              textValue={formatPercentField(state.vacancyRatePercent)}
              onText={
                incomeLocked
                  ? undefined
                  : (raw) => {
                      const n = Number(raw.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      patch({ vacancyRatePercent: Math.min(100, Math.max(0, n)) });
                    }
              }
              endAdornment={<InputAdornment position="end">%</InputAdornment>}
            />
          </Stack>
        ),
      },
      {
        id: "operating-expenses",
        title: "Operating expenses",
        description: "Canonical OpEx editor · tax / ins / HOA / reserves",
        defaultLayout: rentalWidgetLgLayout("operating-expenses"),
        defaultLayouts: rentalWidgetLayouts("operating-expenses"),
        content: (
          <RentalOperatingExpensesPanel
            state={state}
            patch={patch}
            totalOpexMo={totalOpexMo}
            piMonthly={piMonthly}
            pmiMonthly={pmiMo}
            pctOfEgiLabel={pctOfEgi(totalOpexMo, egi)}
            onEditFinancing={onGoToFinancing}
          />
        ),
      },
      {
        id: "pro-forma",
        title: "Pro-forma ledger",
        description: "Unified sequence · Pro forma & Exit yield inclusion",
        defaultLayout: rentalWidgetLgLayout("pro-forma"),
        defaultLayouts: rentalWidgetLayouts("pro-forma"),
        scrollBody: true,
        content: (
          <RentalProFormaLedgerPanel
            state={state}
            patch={patch}
            rental={r}
            onGoToFinancing={onGoToFinancing}
          />
        ),
      },
      {
        id: "composition",
        title: "Monthly obligations",
        description: `Where EGI goes · total ${moneyDec.format(totalOpexMo + piMonthly + pmiMo)}/mo`,
        defaultLayout: rentalWidgetLgLayout("composition"),
        defaultLayouts: rentalWidgetLayouts("composition"),
        content: <RentalExpenseComposition slices={r.composition} />,
      },
      {
        id: "growth",
        title: "Forward growth",
        description:
          state.growth?.rentGrowthPercent || state.growth?.expenseGrowthPercent
            ? `Rent ${(state.growth?.rentGrowthPercent ?? 0).toFixed(1)}%/yr · OpEx ${(state.growth?.expenseGrowthPercent ?? 0).toFixed(1)}%/yr`
            : "Flat baseline — set % to model rising rent or expenses",
        defaultLayout: rentalWidgetLgLayout("growth"),
        defaultLayouts: rentalWidgetLayouts("growth"),
        content: (
          <Box id="rental-edit-growth">
            <GrowthAssumptionsPanel state={state} patch={patch} />
          </Box>
        ),
      },
      {
        id: "strategies",
        title: "Deal strategies",
        description: "Optional BRRRR / flip what-ifs — inputs saved; snapshots derived at runtime",
        defaultLayout: rentalWidgetLgLayout("strategies"),
        defaultLayouts: rentalWidgetLayouts("strategies"),
        content: (
          <Box id="rental-edit-strategies">
            <DealStrategyPanel state={state} patch={patch} />
          </Box>
        ),
      },
      {
        id: "tax",
        title: "Tax modeling",
        description: derived.tax
          ? `Dep ${moneyDec.format(derived.tax.operating.depreciation.annualDepreciation)}/yr · QBI ${moneyDec.format(derived.tax.operating.qbi?.qbiDeduction ?? 0)}`
          : "Off — enable for depreciation, QBI, and after-tax cash flow estimates",
        defaultLayout: rentalWidgetLgLayout("tax"),
        defaultLayouts: rentalWidgetLayouts("tax"),
        content: (
          <Box id="rental-edit-tax">
            <TaxAssumptionsPanel
              state={state}
              patch={patch}
              derivedTax={derived.tax}
              variant="rental"
              onGoToResearch={onGoToResearch}
              taxIssueCount={state.research?.taxIssues?.length ?? 0}
            />
          </Box>
        ),
      },
      {
        id: "stress",
        title: "Stress test",
        description: "Delta what-if via deriveScenario",
        defaultLayout: rentalWidgetLgLayout("stress"),
        defaultLayouts: rentalWidgetLayouts("stress"),
        content: <StressTestPanel state={state} patch={patch} />,
      },
    ],
    [
      derived.tax,
      egi,
      incomeLocked,
      incomeMode,
      loanPaidOffByYearsHeld,
      mortgage,
      mortgageFreeAnnual,
      mortgageFreeMonthly,
      onGoToFinancing,
      onGoToResearch,
      onGoToUpfront,
      patch,
      piMonthly,
      piSummaryRight,
      pmiMo,
      r,
      state,
      termYearsRounded,
      totalOpexMo,
    ]
  );

  return (
    <Stack spacing={0.75}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.35, fontSize: "12px" }}
      >
        Category: <strong>Rental</strong> — edit rent &amp; expenses here. Loan and cash-to-close via
        Shared scenario Edit actions.
      </Typography>
      <WidgetBoard
        boardId="rental"
        widgets={widgets}
        rowHeight={28}
        layoutRevision={RENTAL_BOARD_LAYOUT_REVISION}
        preset={RENTAL_BOARD_PRESET}
      />
    </Stack>
  );
}
