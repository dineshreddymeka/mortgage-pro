import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Chip, InputAdornment, Stack, Typography } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid2";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { CategoryJump } from "../components/CategoryJump";
import { GrowthAssumptionsPanel } from "../components/GrowthAssumptionsPanel";
import { StressTestPanel } from "../components/StressTestPanel";
import { TaxAssumptionsPanel } from "../components/TaxAssumptionsPanel";
import { RentalExpenseComposition } from "../components/RentalExpenseComposition";
import { RentalIncomeModePanel } from "../components/RentalIncomeModePanel";
import { DealStrategyPanel } from "../components/DealStrategyPanel";
import {
  RentalMetricCard,
  formatDscrDisplay,
  formatGrmDisplay,
  formatOnePercentRuleDisplay,
} from "../components/RentalMetricCard";
import { deriveScenario } from "../lib/deriveScenario";
import type { MonthlyBreakdown } from "../lib/mortgageMath";
import type { AppPersisted } from "../storage/mortgageState";
import { WidgetBoardFromPanels, WidgetPanel } from "../widgets/WidgetBoardFromPanels";

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

const pct0 = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function pctOfEgi(amount: number, egi: number): string {
  if (!Number.isFinite(amount) || !Number.isFinite(egi) || egi <= 0) return "—";
  const p = (amount / egi) * 100;
  if (p > 0 && p < 0.5 && p !== 0) return "<1%";
  if (p < 0 && p > -0.5) return ">−1%";
  return `${pct0.format(p)}%`;
}

/** Pro-forma P&amp;I row id (not in operatingExpenseLines). */
const PF_PI_ID = "pi";

const PF_PMI_ID = "pmi";

const rentalAccordionSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1.5,
  overflow: "hidden",
  bgcolor: "transparent",
  boxShadow: "none",
  transition: "border-color 160ms ease",
  "&:before": { display: "none" },
  "&.Mui-expanded": {
    borderColor: "secondary.main",
    boxShadow: "none",
  },
} as const;

const accordionSummarySx = {
  px: 1.25,
  py: 0.5,
  minHeight: "unset",
  alignItems: "flex-start",
  "&:hover": { bgcolor: "action.hover" },
  "& .MuiAccordionSummary-content": {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 0.35,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    my: 0,
    overflow: "visible",
  },
  "& .MuiAccordionSummary-expandIconWrapper": {
    alignSelf: "flex-start",
    mt: 0.15,
  },
} as const;

const accordionDetailsSx = { px: 1.25, pt: 0.5, pb: 0.85 } as const;

/** Pro-forma OpEx line id → scroll target (tax / ins / HOA share one block). */
const OPEX_SCROLL_ANCHOR: Record<string, string> = {
  mgmt: "rental-edit-mgmt",
  maint: "rental-edit-maint",
  capex: "rental-edit-capex",
  tax: "rental-edit-monthly-taxes",
  ins: "rental-edit-monthly-taxes",
  hoa: "rental-edit-monthly-taxes",
};

type GoToOpts = { expandFinancing?: boolean };

function ProFormaNavCell(props: { onGo: () => void; children: ReactNode; sx?: object }) {
  const activate = () => props.onGo();

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activate();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      activate();
    }
  };

  return (
    <TableCell
      role="button"
      tabIndex={0}
      title="Jump to where you edit this line"
      onClick={onClick}
      onKeyDown={onKeyDown}
      sx={{
        cursor: "pointer",
        userSelect: "none",
        "&:hover": { color: "primary.main" },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
          borderRadius: 0.5,
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </TableCell>
  );
}

function pfLineOn(toggles: Record<string, boolean>, id: string): boolean {
  return toggles[id] !== false;
}

export type RentalTabProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  onGoToFinancing?: () => void;
  onGoToUpfront?: () => void;
};

/** Category: Rental — income, OpEx, pro forma. Financing/Upfront edited on their own tabs. */
export function RentalTab({ state, patch, onGoToFinancing, onGoToUpfront }: RentalTabProps) {
  const derived = useMemo(() => deriveScenario(state), [state]);
  const incomeMode = derived.rentalIncome.mode;
  const incomeLocked = incomeMode !== "simple";
  const mortgage: MonthlyBreakdown = derived.monthlyPayment;
  const r = derived.rental;
  const egi = r.effectiveGrossIncomeMonthly;
  const totalOpexMo = r.operatingExpenseLines.reduce((a, x) => a + x.amount, 0);
  const totalCashIn = state.downPayment + state.closingCosts + state.miscInitialCash;

  /** Pro-forma only: unchecked rows are excluded from NOI / cash flow (persisted on the house). */
  const pfToggles = useMemo(
    () => state.rentalProFormaInclude ?? {},
    [state.rentalProFormaInclude]
  );
  const [financingOpen, setFinancingOpen] = useState(false);

  const setPfIncluded = useCallback(
    (id: string, on: boolean) => {
      const excl: Record<string, boolean> = {};
      if (state.rentalProFormaInclude) {
        for (const [k, v] of Object.entries(state.rentalProFormaInclude)) {
          if (v === false) excl[k] = false;
        }
      }
      if (on) delete excl[id];
      else excl[id] = false;
      patch({ rentalProFormaInclude: Object.keys(excl).length > 0 ? excl : undefined });
    },
    [patch, state.rentalProFormaInclude]
  );

  const goToRentalField = useCallback((anchorId: string, opts?: GoToOpts) => {
    const scroll = () => {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    if (opts?.expandFinancing) {
      setFinancingOpen(true);
      window.setTimeout(scroll, 280);
    } else {
      scroll();
    }
  }, []);

  const piMonthly = mortgage.principalAndInterest;
  const pmiMo = mortgage.pmi;
  const monthlyCarrying = totalOpexMo + piMonthly + pmiMo;
  const piSummaryRight =
    pmiMo > 0.001
      ? `${moneyDec.format(piMonthly)}/mo P&I · ${moneyDec.format(pmiMo)}/mo PMI · ${state.termYears}-yr`
      : `${moneyDec.format(piMonthly)}/mo P&I · ${state.termYears}-yr`;

  const pfAdj = useMemo(() => {
    const opexIn = r.operatingExpenseLines.reduce(
      (sum, line) => sum + (pfLineOn(pfToggles, line.id) ? line.amount : 0),
      0
    );
    const noiAdj = egi - opexIn;
    const piIn = pfLineOn(pfToggles, PF_PI_ID);
    const piAmt = r.principalAndInterestMonthly;
    const piForCf = piIn ? piAmt : 0;
    const pmiIn = r.pmiMonthly > 0.0001 ? pfLineOn(pfToggles, PF_PMI_ID) : false;
    const pmiAmt = r.pmiMonthly;
    const pmiForCf = pmiIn ? pmiAmt : 0;
    const cfAdj = noiAdj - piForCf - pmiForCf;
    const ids = [
      ...r.operatingExpenseLines.map((l) => l.id),
      PF_PI_ID,
      ...(r.pmiMonthly > 0.0001 ? [PF_PMI_ID] : []),
    ];
    const hasExclusion = ids.some((id) => pfToggles[id] === false);
    const opexPartial = r.operatingExpenseLines.some((l) => pfToggles[l.id] === false);
    return { opexIn, noiAdj, piIn, piAmt, pmiIn, pmiAmt, cfAdj, hasExclusion, opexPartial };
  }, [egi, pfToggles, r]);

  /**
   * If you've held longer than the loan term: same convention as When to sell gain after payoff — EGI/mo
   * (no OpEx, no P&amp;I), not pro-forma NOI.
   */
  const yearsOwnedRounded = Math.max(0, Math.round(state.yearsOwned));
  const termYearsRounded = Math.max(1, Math.round(state.termYears));
  const loanPaidOffByYearsHeld = yearsOwnedRounded > termYearsRounded;
  const mortgageFreeMonthly = r.effectiveGrossIncomeMonthly;
  const mortgageFreeAnnual = mortgageFreeMonthly * 12;

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Category: <strong>Rental</strong> — edit rent &amp; expenses here. Loan and cash-to-close are
        edited on Financing / Upfront (summaries below).
      </Typography>

      <WidgetBoardFromPanels boardId="rental">
      <WidgetPanel id="financing" title="Financing summary" description="Edit on Financing tab" h={8}>
      <Accordion
        expanded={financingOpen}
        onChange={(_, expanded) => setFinancingOpen(expanded)}
        disableGutters
        elevation={0}
        sx={rentalAccordionSx}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary", fontSize: 20 }} />}
          aria-controls="rental-financing-panel"
          id="rental-financing-header"
          sx={accordionSummarySx}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
            Financing &amp; property
          </Typography>
          <Typography
            component="div"
            variant="caption"
            color="text.secondary"
            sx={{
              display: { xs: "block", sm: "none" },
              lineHeight: 1.35,
              fontSize: "0.7rem",
              fontVariantNumeric: "tabular-nums",
            }}
            title={`Price ${money.format(state.homePrice)} · Loan ${money.format(mortgage.loanAmount)} · ${state.interestRateApr}% APR · ${state.termYears} yr · P&I ${moneyDec.format(mortgage.principalAndInterest)}/mo · PITI+HOA ${moneyDec.format(mortgage.total)}/mo`}
          >
            {money.format(state.homePrice)} · ln {money.format(mortgage.loanAmount)} · {state.interestRateApr}% ·{" "}
            {state.termYears}y · P&amp;I {moneyDec.format(mortgage.principalAndInterest)}
          </Typography>
          <Box
            sx={{
              display: { xs: "none", sm: "grid" },
              width: "100%",
              gap: 0.65,
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            }}
          >
            <RentalSummaryStat label="Price" value={money.format(state.homePrice)} />
            <RentalSummaryStat label="Loan" value={money.format(mortgage.loanAmount)} />
            <RentalSummaryStat label={"P&I / mo"} value={moneyDec.format(mortgage.principalAndInterest)} />
            <RentalSummaryStat label="PITI+HOA / mo" value={moneyDec.format(mortgage.total)} />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={accordionDetailsSx}>
          <CategoryJump
            category="Financing"
            detail="Purchase price, down payment, rate, term, tax, insurance, HOA, and PMI are edited on the Financing tab."
            onJump={() => onGoToFinancing?.()}
          />
        </AccordionDetails>
      </Accordion>
      </WidgetPanel>

      <WidgetPanel id="upfront-cash" title="Upfront cash" description="Cash invested · edit on Upfront" h={8}>
      <Accordion defaultExpanded={false} disableGutters elevation={0} sx={rentalAccordionSx}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary", fontSize: 20 }} />}
          aria-controls="rental-initial-invest-panel"
          id="rental-initial-invest-header"
          sx={accordionSummarySx}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
            Upfront cash
          </Typography>
          <Typography
            component="div"
            variant="caption"
            color="text.secondary"
            sx={{
              display: { xs: "block", md: "none" },
              lineHeight: 1.35,
              fontSize: "0.7rem",
              fontVariantNumeric: "tabular-nums",
            }}
            title={`Total cash in ${moneyDec.format(totalCashIn)} · Down ${money.format(state.downPayment)} · Closing ${money.format(state.closingCosts)} · Misc ${money.format(state.miscInitialCash)} · Financed ${money.format(Math.max(0, state.homePrice - state.downPayment))}`}
          >
            Tot {moneyDec.format(totalCashIn)} · D {money.format(state.downPayment)} · Close{" "}
            {money.format(state.closingCosts)} · Misc {money.format(state.miscInitialCash)}
          </Typography>
          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              width: "100%",
              gap: 0.65,
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            <RentalSummaryStat label="Total cash in" value={moneyDec.format(totalCashIn)} emphasize />
            <RentalSummaryStat label="Down" value={money.format(state.downPayment)} />
            <RentalSummaryStat label="Closing" value={money.format(state.closingCosts)} />
            <RentalSummaryStat label="Misc" value={money.format(state.miscInitialCash)} />
            <RentalSummaryStat label="Financed" value={money.format(Math.max(0, state.homePrice - state.downPayment))} />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={accordionDetailsSx}>
          <CategoryJump
            category="Upfront"
            detail="Down payment, closing costs, and misc cash-in are edited on the Upfront tab."
            onJump={() => onGoToUpfront?.()}
          />
        </AccordionDetails>
      </Accordion>
      </WidgetPanel>

      <WidgetPanel id="analysis" title="Metrics & pro forma" description="Cash flow · OpEx · tables" h={28}>
      <Box id="rental-metrics-row" className="pp-fade-in">
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ mb: 0.65 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            Key metrics
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {piSummaryRight}
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gap: 0.75,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(8, minmax(0, 1fr))",
            },
          }}
        >
          <RentalMetricCard
            label="Mo CF"
            value={moneyDec.format(r.cashFlowMonthly)}
            detail={`Yr ${moneyDec.format(r.cashFlowAnnual)}`}
            hint="NOI − P&I"
            positive={r.cashFlowMonthly >= 0}
            title={`Mo cash flow = NOI − P&I (${moneyDec.format(piMonthly)}/mo, ${state.termYears}-yr).`}
            note={
              loanPaidOffByYearsHeld ? (
                <>
                  Mortgage-free ≈ {moneyDec.format(mortgageFreeMonthly)}/mo EGI (held &gt; {termYearsRounded} yr).
                </>
              ) : undefined
            }
          />
          <RentalMetricCard
            label="Yr CF"
            value={moneyDec.format(r.cashFlowAnnual)}
            detail={`Mo ${moneyDec.format(r.cashFlowMonthly)}`}
            hint="12 × mo CF"
            positive={r.cashFlowAnnual >= 0}
            note={
              loanPaidOffByYearsHeld ? (
                <>Mortgage-free ≈ {moneyDec.format(mortgageFreeAnnual)}/yr EGI.</>
              ) : undefined
            }
          />
          <RentalMetricCard
            label="NOI / yr"
            value={moneyDec.format(r.noiAnnual)}
            detail={`${moneyDec.format(r.noiMonthly)}/mo`}
            hint="After OpEx, before P&I"
          />
          <RentalMetricCard
            label="Cap rate"
            value={state.homePrice > 0 ? `${pct1.format(r.capRate * 100)}%` : null}
            detail={state.homePrice > 0 ? `Price ${money.format(state.homePrice)}` : undefined}
            hint="NOI ÷ price"
            noDataHint="Set price"
          />
          <RentalMetricCard
            label="Cash-on-cash"
            value={r.initialCashInvested > 0 ? `${pct1.format(r.cashOnCash * 100)}%` : null}
            detail={r.initialCashInvested > 0 ? `${money.format(r.initialCashInvested)} in` : undefined}
            hint="Yr CF ÷ cash in"
            noDataHint="Add cash in"
          />
          <RentalMetricCard
            label="DSCR"
            value={formatDscrDisplay(r.dscr)}
            detail={r.dscr != null ? "NOI ÷ debt svc" : undefined}
            hint="Annual NOI ÷ annual P&I+PMI"
            noDataHint={mortgage.loanAmount <= 0 ? "All-cash" : "—"}
            positive={r.dscr != null ? r.dscr >= 1 : undefined}
          />
          <RentalMetricCard
            label="GRM"
            value={formatGrmDisplay(r.grossRentMultiplier)}
            detail={r.grossRentMultiplier != null ? "Price ÷ yr GSI" : undefined}
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
            hint="Rent ÷ price"
            noDataHint="Need price & rent"
            positive={r.onePercentRuleRatio != null ? r.onePercentRuleRatio >= 0.01 : undefined}
          />
        </Box>
      </Box>

      <Grid container spacing={1}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RentalPanelCard
            panelId="rental-edit-income"
            title="Income"
            description={
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
                GSI {moneyDec.format(r.grossScheduledIncomeMonthly)} · vac −{moneyDec.format(r.vacancyLossMonthly)} →
                EGI {moneyDec.format(egi)}
              </Typography>
            }
          >
            <Stack spacing={1}>
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
                  detail={incomeLocked ? "Synced from income mode" : "0–100% · high vacancy stresses cash flow"}
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
          </RentalPanelCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <RentalPanelCard
            panelId="rental-edit-carrying"
            title="Monthly carrying cost"
            headerExtra={
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${moneyDec.format(monthlyCarrying)}/mo total`}
                sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
              />
            }
            description={
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
                OpEx {moneyDec.format(totalOpexMo)} + P&amp;I {moneyDec.format(piMonthly)} · OpEx{" "}
                {pctOfEgi(totalOpexMo, egi)} of EGI
              </Typography>
            }
          >
            <Stack spacing={0.85}>
                <RentalSubsection sectionId="rental-edit-debt-service" title="Debt service">
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      P&amp;I / mo
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {moneyDec.format(piMonthly)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
                    {state.termYears}-year loan · {state.interestRateApr}% APR
                  </Typography>
                </RentalSubsection>

                <RentalSubsection sectionId="rental-edit-monthly-taxes" title="Taxes, insurance, HOA">
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Property tax (yr)"
                        size="small"
                        fullWidth
                        value={formatNumberField(state.propertyTaxAnnual)}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                          if (!Number.isFinite(n)) return;
                          const hp = state.homePrice;
                          const annual = Math.max(0, n);
                          patch({
                            propertyTaxAnnual: annual,
                            propertyTaxPercent: hp > 0 ? (annual / hp) * 100 : 0,
                          });
                        }}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                          },
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Property tax %"
                        size="small"
                        fullWidth
                        value={formatPercentField(state.propertyTaxPercent)}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                          if (!Number.isFinite(n)) return;
                          const pct = Math.min(100, Math.max(0, n));
                          const hp = state.homePrice;
                          patch({
                            propertyTaxPercent: pct,
                            propertyTaxAnnual: hp > 0 ? Math.round((hp * pct) / 100) : state.propertyTaxAnnual,
                          });
                        }}
                        slotProps={{
                          input: {
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          },
                        }}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label="Insurance (yr)"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.insuranceAnnual)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (Number.isFinite(n)) patch({ insuranceAnnual: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                  <TextField
                    label="HOA (mo)"
                    size="small"
                    fullWidth
                    value={formatNumberField(state.hoaMonthly)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                      if (Number.isFinite(n)) patch({ hoaMonthly: Math.max(0, n) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </RentalSubsection>

                <RentalSubsection sectionId="rental-edit-reserves-section" title="Management & reserves">
                  <RentalFieldRow
                    anchorId="rental-edit-mgmt"
                    label="Mgmt"
                    detail="% of scheduled income (0–50%)"
                    valueLabel={`${state.propertyMgmtPercent.toFixed(1)}%`}
                    textLabel="%"
                    textValue={formatPercentField(state.propertyMgmtPercent)}
                    onText={(raw) => {
                      const n = Number(raw.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      patch({ propertyMgmtPercent: Math.min(50, Math.max(0, n)) });
                    }}
                    endAdornment={<InputAdornment position="end">%</InputAdornment>}
                  />
                  <RentalFieldRow
                    anchorId="rental-edit-maint"
                    label="Maint."
                    detail="% of base rent (0–50%)"
                    valueLabel={`${state.maintenancePercent.toFixed(1)}%`}
                    textLabel="%"
                    textValue={formatPercentField(state.maintenancePercent)}
                    onText={(raw) => {
                      const n = Number(raw.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      patch({ maintenancePercent: Math.min(50, Math.max(0, n)) });
                    }}
                    endAdornment={<InputAdornment position="end">%</InputAdornment>}
                  />
                  <RentalFieldRow
                    anchorId="rental-edit-capex"
                    label="CapEx"
                    detail="% of base rent (0–30%)"
                    valueLabel={`${state.capexPercent.toFixed(1)}%`}
                    textLabel="%"
                    textValue={formatPercentField(state.capexPercent)}
                    onText={(raw) => {
                      const n = Number(raw.replace(/[^0-9.]/g, ""));
                      if (!Number.isFinite(n)) return;
                      patch({ capexPercent: Math.min(30, Math.max(0, n)) });
                    }}
                    endAdornment={<InputAdornment position="end">%</InputAdornment>}
                  />
                </RentalSubsection>
              </Stack>
          </RentalPanelCard>
        </Grid>
      </Grid>

      <RentalPanelCard
        panelId="rental-edit-strategies"
        title="Deal strategies"
        description={
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
            Optional BRRRR / flip what-ifs — inputs saved; snapshots derived at runtime
          </Typography>
        }
      >
        <DealStrategyPanel state={state} patch={patch} />
      </RentalPanelCard>

      <RentalPanelCard
        panelId="rental-edit-growth"
        title="Forward growth"
        description={
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
            {state.growth?.rentGrowthPercent || state.growth?.expenseGrowthPercent
              ? `Rent ${(state.growth?.rentGrowthPercent ?? 0).toFixed(1)}%/yr · OpEx ${(state.growth?.expenseGrowthPercent ?? 0).toFixed(1)}%/yr`
              : "Flat baseline — set % to model rising rent or expenses"}
          </Typography>
        }
      >
        <GrowthAssumptionsPanel state={state} patch={patch} />
      </RentalPanelCard>

      <RentalPanelCard
        panelId="rental-edit-tax"
        title="Tax modeling"
        description={
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
            {derived.tax
              ? `Dep ${moneyDec.format(derived.tax.operating.depreciation.annualDepreciation)}/yr · QBI ${moneyDec.format(derived.tax.operating.qbi?.qbiDeduction ?? 0)}`
              : "Off — enable for depreciation, QBI, and after-tax cash flow estimates"}
          </Typography>
        }
      >
        <TaxAssumptionsPanel state={state} patch={patch} derivedTax={derived.tax} variant="rental" />
      </RentalPanelCard>

      <Accordion defaultExpanded={false} disableGutters elevation={0} sx={rentalAccordionSx}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary", fontSize: 20 }} />}
          sx={accordionSummarySx}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Monthly obligations
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            Total {moneyDec.format(monthlyCarrying)}/mo · P&amp;I + OpEx
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={accordionDetailsSx}>
          <RentalExpenseComposition slices={r.composition} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded={false} disableGutters elevation={0} sx={rentalAccordionSx}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary", fontSize: 20 }} />}
          sx={accordionSummarySx}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={0.75}
            alignItems={{ sm: "flex-end" }}
            justifyContent="space-between"
            sx={{ width: "100%", gap: 0.75 }}
          >
            <Stack spacing={0.15} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Monthly pro-forma
              </Typography>
              <Typography variant="caption" color="text.secondary">
                EGI {moneyDec.format(egi)} · toggles for NOI / CF · click item to jump
              </Typography>
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
              <RentalSummaryStat label="NOI" value={moneyDec.format(pfAdj.noiAdj)} />
              <RentalSummaryStat label="Cash flow" value={moneyDec.format(pfAdj.cfAdj)} emphasize />
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={accordionDetailsSx}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.35 }}>
            1 · Income → EGI
          </Typography>
          <TableContainer sx={{ mb: 1.25, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 0.5 }}>Item</TableCell>
                  <TableCell align="right" sx={{ py: 0.5, width: 108, fontWeight: 600 }}>
                    $ / mo
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <ProFormaNavCell onGo={() => goToRentalField("rental-edit-income")} sx={{ py: 0.35 }}>
                    Gross scheduled income
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
                      Rent + other before vacancy
                    </Typography>
                  </ProFormaNavCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, verticalAlign: "top" }}>
                    {moneyDec.format(r.grossScheduledIncomeMonthly)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <ProFormaNavCell onGo={() => goToRentalField("rental-edit-vacancy")} sx={{ pl: 1, color: "text.secondary", py: 0.35 }}>
                    Vacancy ({state.vacancyRatePercent.toFixed(1)}% of scheduled)
                  </ProFormaNavCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}>
                    −{moneyDec.format(r.vacancyLossMonthly)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <ProFormaNavCell onGo={() => goToRentalField("rental-edit-income")} sx={{ fontWeight: 600, py: 0.35 }}>
                    EGI
                  </ProFormaNavCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, py: 0.35 }}>
                    {moneyDec.format(egi)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5} sx={{ mb: 0.35 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              2 · Operating costs, loan, cash flow (% of EGI)
            </Typography>
            {pfAdj.hasExclusion ? (
              <Typography
                component="button"
                type="button"
                variant="caption"
                onClick={() => patch({ rentalProFormaInclude: undefined })}
                sx={{
                  cursor: "pointer",
                  border: 0,
                  bgcolor: "transparent",
                  p: 0,
                  m: 0,
                  font: "inherit",
                  color: "primary.main",
                  textDecoration: "underline",
                }}
              >
                Restore all lines
              </Typography>
            ) : null}
          </Stack>
          <TableContainer sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table size="small" sx={{ minWidth: { xs: 300, sm: 0 } }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 44, py: 0.5 }} aria-label="Include in totals" />
                  <TableCell sx={{ py: 0.5 }}>Item</TableCell>
                  <TableCell align="right" sx={{ py: 0.5, width: 96, fontWeight: 600 }}>
                    $ / mo
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5, width: 72, fontWeight: 600 }}>
                    % of EGI
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {r.operatingExpenseLines.map((line) => {
                  const on = pfLineOn(pfToggles, line.id);
                  return (
                    <TableRow
                      key={line.id}
                      sx={{
                        opacity: on ? 1 : 0.55,
                        bgcolor: on ? undefined : "action.hover",
                      }}
                    >
                      <TableCell padding="checkbox" sx={{ py: 0.35, verticalAlign: "middle" }}>
                        <Checkbox
                          size="small"
                          checked={on}
                          onChange={() => setPfIncluded(line.id, !pfLineOn(pfToggles, line.id))}
                          inputProps={{ "aria-label": `Include ${line.label} in pro-forma NOI and cash flow` }}
                        />
                      </TableCell>
                      <ProFormaNavCell
                        onGo={() => goToRentalField(OPEX_SCROLL_ANCHOR[line.id] ?? "rental-edit-carrying")}
                        sx={{ pl: 0.5, py: 0.35 }}
                      >
                        {line.label}
                      </ProFormaNavCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}>
                        −{moneyDec.format(line.amount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, color: "text.secondary" }}>
                        {on ? pctOfEgi(line.amount, egi) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell padding="checkbox" sx={{ py: 0.35 }} />
                  <ProFormaNavCell onGo={() => goToRentalField("rental-edit-carrying")} sx={{ fontWeight: 600, py: 0.35 }}>
                    NOI
                    {pfAdj.opexPartial ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
                        Uses checked operating costs only
                      </Typography>
                    ) : null}
                  </ProFormaNavCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, py: 0.35 }}>
                    {moneyDec.format(pfAdj.noiAdj)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, color: "text.secondary" }}>
                    {pctOfEgi(pfAdj.noiAdj, egi)}
                  </TableCell>
                </TableRow>
                <TableRow
                  sx={{
                    opacity: pfAdj.piIn ? 1 : 0.55,
                    bgcolor: pfAdj.piIn ? undefined : "action.hover",
                  }}
                >
                  <TableCell padding="checkbox" sx={{ py: 0.35, verticalAlign: "middle" }}>
                    <Checkbox
                      size="small"
                      checked={pfAdj.piIn}
                      onChange={() => setPfIncluded(PF_PI_ID, !pfLineOn(pfToggles, PF_PI_ID))}
                      inputProps={{ "aria-label": "Include principal and interest in pro-forma cash flow" }}
                    />
                  </TableCell>
                  <ProFormaNavCell
                    onGo={() => goToRentalField("rental-edit-financing", { expandFinancing: true })}
                    sx={{ pl: 0.5, py: 0.35 }}
                  >
                    P&amp;I (principal &amp; interest)
                    {!pfAdj.piIn ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.25 }}>
                        Unchecked → cash flow ignores loan payment here
                      </Typography>
                    ) : null}
                  </ProFormaNavCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}>
                    −{moneyDec.format(pfAdj.piAmt)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, color: "text.secondary" }}>
                    {pfAdj.piIn ? pctOfEgi(pfAdj.piAmt, egi) : "—"}
                  </TableCell>
                </TableRow>
                {r.pmiMonthly > 0.001 ? (
                  <TableRow
                    sx={{
                      opacity: pfAdj.pmiIn ? 1 : 0.55,
                      bgcolor: pfAdj.pmiIn ? undefined : "action.hover",
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ py: 0.35, verticalAlign: "middle" }}>
                      <Checkbox
                        size="small"
                        checked={pfAdj.pmiIn}
                        onChange={() => setPfIncluded(PF_PMI_ID, !pfLineOn(pfToggles, PF_PMI_ID))}
                        inputProps={{ "aria-label": "Include PMI in pro-forma cash flow" }}
                      />
                    </TableCell>
                    <ProFormaNavCell
                      onGo={() => goToRentalField("rental-edit-financing", { expandFinancing: true })}
                      sx={{ pl: 0.5, py: 0.35 }}
                    >
                      PMI
                    </ProFormaNavCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35 }}>
                      −{moneyDec.format(pfAdj.pmiAmt)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, color: "text.secondary" }}>
                      {pfAdj.pmiIn ? pctOfEgi(pfAdj.pmiAmt, egi) : "—"}
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow>
                  <TableCell padding="checkbox" sx={{ py: 0.35 }} />
                  <ProFormaNavCell onGo={() => goToRentalField("rental-metrics-row")} sx={{ fontWeight: 700, py: 0.35 }}>
                    Cash flow
                  </ProFormaNavCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      py: 0.35,
                      color: pfAdj.cfAdj >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {moneyDec.format(pfAdj.cfAdj)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, color: "text.secondary" }}>
                    {pctOfEgi(pfAdj.cfAdj, egi)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
      </WidgetPanel>

      <WidgetPanel id="stress-test" title="Stress test" description="Delta what-if via deriveScenario" h={16}>
        <StressTestPanel state={state} patch={patch} />
      </WidgetPanel>
      </WidgetBoardFromPanels>
    </Stack>
  );
}

function RentalPanelCard(props: {
  panelId?: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <Card
      id={props.panelId}
      variant="outlined"
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
        bgcolor: "transparent",
      }}
    >
      <Box sx={{ px: 1.25, py: 0.85, borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1} flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.02em", flex: "1 1 8rem", minWidth: 0 }}>
            {props.title}
          </Typography>
          {props.headerExtra ?? null}
        </Stack>
        <Box sx={{ mt: 0.35 }}>{props.description}</Box>
      </Box>
      <CardContent sx={{ flex: 1, pt: 1, px: 1.25, pb: 1, "&:last-child": { pb: 1 } }}>{props.children}</CardContent>
    </Card>
  );
}

function RentalSummaryStat(props: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: 0.85,
        py: 0.55,
        borderRadius: 1.5,
        bgcolor: "transparent",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.6rem", lineHeight: 1.15, display: "block", textTransform: "none" }}
      >
        {props.label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: props.emphasize ? 800 : 700,
          fontVariantNumeric: "tabular-nums",
          fontSize: props.emphasize ? "0.875rem" : "0.78rem",
          lineHeight: 1.25,
          letterSpacing: props.emphasize ? "-0.02em" : undefined,
          mt: 0.15,
        }}
      >
        {props.value}
      </Typography>
    </Box>
  );
}

function RentalSubsection(props: { sectionId?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box
      id={props.sectionId}
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        p: 1,
        bgcolor: "transparent",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontSize: "0.6rem",
          color: "text.secondary",
          display: "block",
        }}
      >
        {props.title}
      </Typography>
      {props.subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, lineHeight: 1.3 }}>
          {props.subtitle}
        </Typography>
      ) : null}
      <Stack spacing={0.65} sx={{ mt: 0.65 }}>
        {props.children}
      </Stack>
    </Box>
  );
}

function RentalFieldRow(props: {
  anchorId?: string;
  label: string;
  detail?: string;
  valueLabel: string;
  textLabel: string;
  textValue: string;
  onText?: (raw: string) => void;
  /** Digits-only while typing; clamp to [min, max] on blur (empty blur = keep saved value). */
  numericCommitOnBlur?: { min: number; max: number; committed: number; onCommit: (n: number) => void };
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}) {
  const [numericDraft, setNumericDraft] = useState<string | null>(null);
  const commit = props.numericCommitOnBlur;

  const inputValue =
    commit != null
      ? numericDraft !== null
        ? numericDraft
        : formatNumberField(commit.committed)
      : props.textValue;

  return (
    <Grid id={props.anchorId} container spacing={1} alignItems="flex-end">
      <Grid size={{ xs: 12, md: 7 }}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: "block" }}>
                {props.label}
              </Typography>
              {props.detail ? (
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.65rem", lineHeight: 1.2, display: "block" }}>
                  {props.detail}
                </Typography>
              ) : null}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
              {props.valueLabel}
            </Typography>
          </Stack>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <TextField
          label={props.textLabel}
          size="small"
          fullWidth
          value={inputValue}
          onChange={(e) => {
            if (commit != null) {
              setNumericDraft(e.target.value.replace(/[^0-9]/g, ""));
            } else {
              props.onText?.(e.target.value);
            }
          }}
          onFocus={() => {
            if (commit != null) setNumericDraft(formatNumberField(commit.committed));
          }}
          onBlur={(e) => {
            if (commit == null) return;
            const digits = e.target.value.replace(/[^0-9]/g, "");
            setNumericDraft(null);
            if (digits === "") return;
            const n = Math.round(Number(digits));
            if (!Number.isFinite(n)) return;
            commit.onCommit(Math.min(commit.max, Math.max(commit.min, n)));
          }}
          slotProps={{
            input: {
              ...(props.startAdornment ? { startAdornment: props.startAdornment } : {}),
              ...(props.endAdornment ? { endAdornment: props.endAdornment } : {}),
            },
          }}
        />
      </Grid>
    </Grid>
  );
}
