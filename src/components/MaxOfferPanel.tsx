import ExpandMore from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import { InputAdornment, Stack, Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import { useMemo } from "react";
import { FormField, FormGrid } from "../layout/FormGrid";
import { touchTargetCoarsePx, touchTargetFinePx } from "../layout/formLayout";
import { AccordionSummaryMetric } from "./AccordionSummaryMetric";
import type { MaxOfferOutputs } from "../lib/offerMath";
import type { AppPersisted, OfferTargetsPersisted } from "../storage/mortgageState";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Props = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  maxOffer: MaxOfferOutputs;
  currentHomePrice: number;
};

function formatMaxPrice(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return money.format(n);
}

function formatTargetField(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return String(value);
}

function patchOfferTargets(
  current: OfferTargetsPersisted | undefined,
  partial: Partial<OfferTargetsPersisted>
): OfferTargetsPersisted | undefined {
  const merged: OfferTargetsPersisted = { ...current };
  for (const [k, v] of Object.entries(partial) as [keyof OfferTargetsPersisted, number | undefined][]) {
    if (v === undefined || v === null || !Number.isFinite(v) || v <= 0) delete merged[k];
    else merged[k] = k === "targetCashFlowMonthly" || k === "targetPaymentMonthly" ? Math.round(v) : v;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** Target-based max offer caps — persists targets only; caps derived via offerMath. */
export function MaxOfferPanel({ state, patch, maxOffer, currentHomePrice }: Props) {
  const targets = state.offerTargets;
  const hasFinancing = state.homePrice > 0 || state.interestRateApr > 0;

  const caps = useMemo(() => {
    const items: { label: string; price: string | null }[] = [];
    const dti = formatMaxPrice(maxOffer.fromDti28Pct);
    if (state.annualGrossIncome > 0 && dti) items.push({ label: "28% DTI", price: dti });
    const budget = formatMaxPrice(maxOffer.fromCustomHousingBudget);
    if (state.customHousingBudgetMonthly && budget)
      items.push({ label: "Custom budget", price: budget });
    const dscr = formatMaxPrice(maxOffer.fromTargetDscr);
    if (targets?.targetDscr && dscr) items.push({ label: "Target DSCR", price: dscr });
    const cf = formatMaxPrice(maxOffer.fromTargetCashFlow);
    if (targets?.targetCashFlowMonthly !== undefined && cf)
      items.push({ label: "Target CF", price: cf });
    const coc = formatMaxPrice(maxOffer.fromTargetCashOnCash);
    if (targets?.targetCashOnCashPercent && coc) items.push({ label: "Target CoC", price: coc });
    const pmt = formatMaxPrice(maxOffer.fromTargetPayment);
    if (targets?.targetPaymentMonthly && pmt) items.push({ label: "Target payment", price: pmt });
    return items;
  }, [maxOffer, state, targets]);

  const binding = formatMaxPrice(maxOffer.bindingCap);

  return (
    <Accordion
      defaultExpanded={false}
      disableGutters
      elevation={0}
      sx={{
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "transparent",
        boxShadow: "none",
        "&:before": { display: "none" },
        "&.Mui-expanded": { borderColor: "secondary.main" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          px: 1.25,
          minHeight: touchTargetFinePx,
          alignItems: "flex-start",
          "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
          "&:hover": { bgcolor: "action.hover" },
          "& .MuiAccordionSummary-content": { my: 0.5, width: "100%", maxWidth: "calc(100% - 36px)" },
          "& .MuiAccordionSummary-expandIconWrapper": {
            minWidth: touchTargetFinePx,
            minHeight: touchTargetFinePx,
            alignItems: "center",
            justifyContent: "center",
            "@media (pointer: coarse)": {
              minWidth: touchTargetCoarsePx,
              minHeight: touchTargetCoarsePx,
            },
          },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={0.75}
          alignItems={{ sm: "flex-end" }}
          justifyContent="space-between"
          sx={{ width: "100%", gap: 0.75 }}
        >
          <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Max offer
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              Target-based caps · targets saved · results derived
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
            <AccordionSummaryMetric
              label="Modeled price"
              value={currentHomePrice > 0 ? money.format(currentHomePrice) : "—"}
            />
            <AccordionSummaryMetric label="Binding cap" value={binding ?? "—"} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.85, lineHeight: 1.35 }}>
          Set optional targets below. Max prices are binary-searched from current financing and rental
          assumptions — never written to storage.
        </Typography>

        <FormGrid maxColumns={4} compact sx={{ mb: 1 }}>
          <FormField>
            <TextField
              label="Target DSCR"
              size="small"
              fullWidth
              disabled={!hasFinancing}
              value={formatTargetField(targets?.targetDscr)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                patch({
                  offerTargets: patchOfferTargets(targets, {
                    targetDscr: Number.isFinite(n) && n > 0 ? n : undefined,
                  }),
                });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">×</InputAdornment> } }}
            />
          </FormField>
          <FormField>
            <TextField
              label="Target cash flow"
              size="small"
              fullWidth
              disabled={!hasFinancing}
              value={formatTargetField(targets?.targetCashFlowMonthly)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                patch({
                  offerTargets: patchOfferTargets(targets, {
                    targetCashFlowMonthly: Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined,
                  }),
                });
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/mo</InputAdornment>,
                },
              }}
            />
          </FormField>
          <FormField>
            <TextField
              label="Target CoC"
              size="small"
              fullWidth
              disabled={!hasFinancing}
              value={formatTargetField(targets?.targetCashOnCashPercent)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                patch({
                  offerTargets: patchOfferTargets(targets, {
                    targetCashOnCashPercent: Number.isFinite(n) && n > 0 ? n : undefined,
                  }),
                });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </FormField>
          <FormField>
            <TextField
              label="Target payment"
              size="small"
              fullWidth
              disabled={!hasFinancing}
              value={formatTargetField(targets?.targetPaymentMonthly)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                patch({
                  offerTargets: patchOfferTargets(targets, {
                    targetPaymentMonthly: Number.isFinite(n) && n > 0 ? Math.round(n) : undefined,
                  }),
                });
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  endAdornment: <InputAdornment position="end">/mo</InputAdornment>,
                },
              }}
            />
          </FormField>
        </FormGrid>

        {!hasFinancing ? (
          <Typography variant="caption" color="text.disabled">
            Add purchase price and financing to search max-offer caps.
          </Typography>
        ) : caps.length > 0 ? (
          <Stack spacing={0.65}>
            {caps.map(({ label, price }) => (
              <Alert key={label} severity="info" variant="outlined" sx={{ py: 0.35, borderRadius: 1.5 }}>
                {label} ≈ <strong>{price}</strong>
              </Alert>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.disabled">
            Set a target or add income / budget on Affordability to see caps.
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
