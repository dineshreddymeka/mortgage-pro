import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FormField, FormGrid } from "../../layout/FormGrid";
import { FORM_CONTAINER_NAME, formContainerBreakpoints, minOperationalFontPx } from "../../layout/formLayout";
import type { MonthlyBreakdown } from "../../lib/mortgageMath";

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

export type RentalSharedScenarioPanelProps = {
  homePrice: number;
  interestRateApr: number;
  termYears: number;
  downPayment: number;
  closingCosts: number;
  miscInitialCash: number;
  mortgage: MonthlyBreakdown;
  onGoToFinancing?: () => void;
  onGoToUpfront?: () => void;
  /** Dense ribbon for the merged overview widget. */
  ribbon?: boolean;
};

function Stat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Stack spacing={0.1} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: `${minOperationalFontPx}px`,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "var(--pp-font-display)",
          fontWeight: emphasize ? 800 : 700,
          fontSize: emphasize ? "0.95rem" : "0.875rem",
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function EditActions(props: { onGoToFinancing?: () => void; onGoToUpfront?: () => void }) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} alignItems="center">
      <Button
        size="small"
        variant="outlined"
        onClick={() => props.onGoToFinancing?.()}
        disabled={!props.onGoToFinancing}
        aria-label="Edit financing"
      >
        Edit Financing
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => props.onGoToUpfront?.()}
        disabled={!props.onGoToUpfront}
        aria-label="Edit upfront cash"
      >
        Edit Upfront
      </Button>
    </Stack>
  );
}

/** Compact read-only financing + upfront snapshot with Edit actions to canonical tabs. */
export function RentalSharedScenarioPanel({
  homePrice,
  interestRateApr,
  termYears,
  downPayment,
  closingCosts,
  miscInitialCash,
  mortgage,
  onGoToFinancing,
  onGoToUpfront,
  ribbon = false,
}: RentalSharedScenarioPanelProps) {
  const totalCashIn = downPayment + closingCosts + miscInitialCash;
  const cq = FORM_CONTAINER_NAME;
  const bp = formContainerBreakpoints;

  if (ribbon) {
    return (
      <Box
        sx={{
          containerType: "inline-size",
          containerName: cq,
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: "grid",
            width: "100%",
            gap: 0.75,
            alignItems: "end",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            [`@container ${cq} (min-width: ${bp.twoCol}px)`]: {
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            },
            [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
              gridTemplateColumns: "repeat(5, minmax(0, 1fr)) auto",
            },
            [`@container ${cq} (min-width: ${bp.fourCol}px)`]: {
              gridTemplateColumns: "repeat(5, minmax(0, 1fr)) auto",
            },
          }}
        >
          <Stat label="Price" value={money.format(homePrice)} />
          <Stat label="Loan" value={money.format(mortgage.loanAmount)} />
          <Stat label="P&I / mo" value={moneyDec.format(mortgage.principalAndInterest)} />
          <Stat label="Cash in" value={moneyDec.format(totalCashIn)} emphasize />
          <Stat label="Rate · term" value={`${interestRateApr}% · ${termYears}y`} />
          <Box
            sx={{
              gridColumn: { xs: "1 / -1", sm: "auto" },
              [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
                gridColumn: "auto",
                justifySelf: "end",
              },
            }}
          >
            <EditActions onGoToFinancing={onGoToFinancing} onGoToUpfront={onGoToUpfront} />
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Stack spacing={1}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
      >
        Shared scenario — loan and cash-to-close edit on Financing / Upfront. Rental keeps income &amp;
        operating expenses.
      </Typography>

      <FormGrid maxColumns={4} compact>
        <FormField>
          <Stat label="Price" value={money.format(homePrice)} />
        </FormField>
        <FormField>
          <Stat label="Loan" value={money.format(mortgage.loanAmount)} />
        </FormField>
        <FormField>
          <Stat label="P&I / mo" value={moneyDec.format(mortgage.principalAndInterest)} />
        </FormField>
        <FormField>
          <Stat label="PITI+HOA / mo" value={moneyDec.format(mortgage.total)} />
        </FormField>
        <FormField>
          <Stat label="Cash in" value={moneyDec.format(totalCashIn)} emphasize />
        </FormField>
        <FormField>
          <Stat label="Down" value={money.format(downPayment)} />
        </FormField>
        <FormField>
          <Stat label="Closing + misc" value={money.format(closingCosts + miscInitialCash)} />
        </FormField>
        <FormField>
          <Stat label="Rate · term" value={`${interestRateApr}% · ${termYears}y`} />
        </FormField>
      </FormGrid>

      <EditActions onGoToFinancing={onGoToFinancing} onGoToUpfront={onGoToUpfront} />
    </Stack>
  );
}
