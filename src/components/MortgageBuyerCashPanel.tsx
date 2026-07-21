import ExpandMore from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AccordionSummaryMetric } from "./AccordionSummaryMetric";
import { useMemo } from "react";
import { applyBuyerCostLineOverrides, estimateHomeBuyingOneTimeCosts } from "../lib/buyingCostsMath";
import type { AppPersisted } from "../storage/mortgageState";
import { UpfrontCashScenarioPanel } from "./UpfrontCashScenarioPanel";

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type Props = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  loanAmount: number;
  cashToClose: number;
};

export function MortgageBuyerCashPanel({ state, patch, loanAmount, cashToClose }: Props) {
  const closing = Math.max(0, state.closingCosts);
  const suggestedClosing = useMemo(
    () =>
      applyBuyerCostLineOverrides(
        estimateHomeBuyingOneTimeCosts({
          homePrice: state.homePrice,
          loanAmount,
          propertyTaxAnnual: state.propertyTaxAnnual,
          insuranceAnnual: state.insuranceAnnual,
          hoaMonthly: state.hoaMonthly,
        }),
        state.buyingCostLineOverrides
      ).suggestedClosingTotal,
    [
      state.homePrice,
      loanAmount,
      state.propertyTaxAnnual,
      state.insuranceAnnual,
      state.hoaMonthly,
      state.buyingCostLineOverrides,
    ]
  );

  return (
    <Accordion
      defaultExpanded={false}
      disableGutters
      elevation={0}
      sx={{
        borderRadius: 1.5,
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
              Cash to close
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              Modeled costs vs entered closing · also on <strong>Upfront</strong>
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
            <AccordionSummaryMetric label="Total" value={moneyDec.format(cashToClose)} />
            <AccordionSummaryMetric label="Closing" value={moneyDec.format(closing)} />
            <AccordionSummaryMetric label="Model" value={moneyDec.format(Math.round(suggestedClosing))} />
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1 }}>
        <UpfrontCashScenarioPanel
          state={state}
          patch={patch}
          loanAmount={loanAmount}
          cashToClose={cashToClose}
        />
      </AccordionDetails>
    </Accordion>
  );
}
