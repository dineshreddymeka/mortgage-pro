import ExpandMore from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { AccordionSummaryMetric } from "./AccordionSummaryMetric";
import type { MaxOfferOutputs } from "../lib/offerMath";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type Props = {
  maxOffer: MaxOfferOutputs;
  annualGrossIncome: number;
  customHousingBudgetMonthly?: number;
  currentHomePrice: number;
};

function formatMaxPrice(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  return money.format(n);
}

/** Derived max-offer caps from DTI, custom budget, and optional target DSCR. */
export function MaxOfferPanel({
  maxOffer,
  annualGrossIncome,
  customHousingBudgetMonthly,
  currentHomePrice,
}: Props) {
  const summaryBest = useMemo(() => {
    const candidates = [
      maxOffer.fromDti28Pct,
      maxOffer.fromCustomHousingBudget,
      maxOffer.fromTargetDscr,
    ].filter((n) => n > 0);
    if (candidates.length === 0) return null;
    return Math.min(...candidates);
  }, [maxOffer]);

  const dtiPrice = formatMaxPrice(maxOffer.fromDti28Pct);
  const budgetPrice = formatMaxPrice(maxOffer.fromCustomHousingBudget);
  const dscrPrice = formatMaxPrice(maxOffer.fromTargetDscr);

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
          minHeight: 44,
          alignItems: "flex-start",
          "&:hover": { bgcolor: "action.hover" },
          "& .MuiAccordionSummary-content": { my: 0.5, width: "100%", maxWidth: "calc(100% - 36px)" },
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
              Max offer (v1)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              Derived caps · not saved with the scenario
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
            <AccordionSummaryMetric
              label="Modeled price"
              value={currentHomePrice > 0 ? money.format(currentHomePrice) : "—"}
            />
            <AccordionSummaryMetric
              label="Lowest cap"
              value={summaryBest != null ? money.format(summaryBest) : "—"}
            />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.85, lineHeight: 1.35 }}>
          Uses current rate, term, down %, taxes, insurance, HOA, PMI, and rental assumptions. Adjust inputs to
          refresh — nothing here is written to storage.
        </Typography>

        <Stack spacing={0.85}>
          {annualGrossIncome > 0 ? (
            dtiPrice ? (
              <Alert severity="info" variant="outlined" sx={{ py: 0.35, borderRadius: 1.5 }}>
                28% front-end DTI cap ≈ <strong>{dtiPrice}</strong>
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                28% DTI: no price found in search range with current financing assumptions.
              </Typography>
            )
          ) : (
            <Typography variant="caption" color="text.secondary">
              28% DTI: add annual income on Affordability to estimate a DTI-based cap.
            </Typography>
          )}

          {customHousingBudgetMonthly != null && customHousingBudgetMonthly > 0 ? (
            budgetPrice ? (
              <Alert severity="info" variant="outlined" sx={{ py: 0.35, borderRadius: 1.5 }}>
                Custom housing budget (≤ {money.format(customHousingBudgetMonthly)}/mo) ≈{" "}
                <strong>{budgetPrice}</strong>
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Custom budget: no price found — try a higher monthly cap or lower rate.
              </Typography>
            )
          ) : (
            <Typography variant="caption" color="text.secondary">
              Custom budget: set a max housing payment on Affordability to see a budget-based cap.
            </Typography>
          )}

          {maxOffer.targetDscr != null && maxOffer.targetDscr > 0 ? (
            dscrPrice ? (
              <Alert severity="info" variant="outlined" sx={{ py: 0.35, borderRadius: 1.5 }}>
                Target DSCR {maxOffer.targetDscr.toFixed(2)}× ≈ <strong>{dscrPrice}</strong>
              </Alert>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Target DSCR {maxOffer.targetDscr.toFixed(2)}×: no price meets the ratio (check rent, OpEx, or debt
                assumptions).
              </Typography>
            )
          ) : (
            <Typography variant="caption" color="text.secondary">
              Target DSCR: optional `offerTargets.targetDscr` on the scenario enables a DSCR-based cap.
            </Typography>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
