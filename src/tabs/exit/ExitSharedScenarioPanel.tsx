import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FORM_CONTAINER_NAME, formContainerBreakpoints, minOperationalFontPx } from "../../layout/formLayout";
import type { MonthlyBreakdown } from "../../lib/mortgageMath";
import { formatMoney } from "./exitFormat";

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type ExitSharedScenarioPanelProps = {
  homePrice: number;
  interestRateApr: number;
  termYears: number;
  /** Net initial cash invested (after credits) — same formula as gain / IRR math. */
  netInitialCashInvested: number;
  monthlyRent: number;
  mortgage: MonthlyBreakdown;
  /** Navigate to Common Inputs for shared loan / cash-in fields. */
  onGoToCommonInputs?: () => void;
  onGoToRental?: () => void;
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

function EditActions(props: {
  onGoToCommonInputs?: () => void;
  onGoToRental?: () => void;
}) {
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} alignItems="center">
      <Button
        size="small"
        variant="outlined"
        onClick={() => props.onGoToCommonInputs?.()}
        disabled={!props.onGoToCommonInputs}
        aria-label="Edit common inputs"
        sx={{ fontSize: `${minOperationalFontPx}px` }}
      >
        Edit Common
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => props.onGoToRental?.()}
        disabled={!props.onGoToRental}
        aria-label="Edit rental"
        sx={{ fontSize: `${minOperationalFontPx}px` }}
      >
        Edit Rental
      </Button>
    </Stack>
  );
}

/** Compact read-only shared scenario with Edit Common / Edit Rental for canonical tabs. */
export function ExitSharedScenarioPanel({
  homePrice,
  interestRateApr,
  termYears,
  netInitialCashInvested,
  monthlyRent,
  mortgage,
  onGoToCommonInputs,
  onGoToRental,
}: ExitSharedScenarioPanelProps) {
  const cq = FORM_CONTAINER_NAME;
  const bp = formContainerBreakpoints;

  return (
    <Box
      sx={{
        containerType: "inline-size",
        containerName: cq,
        width: "100%",
      }}
      className="pp-fade-in"
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
            gridTemplateColumns: "repeat(6, minmax(0, 1fr)) auto",
          },
        }}
      >
        <Stat label="Price" value={formatMoney(homePrice)} />
        <Stat label="Loan" value={formatMoney(mortgage.loanAmount)} />
        <Stat label="P&I / mo" value={moneyDec.format(mortgage.principalAndInterest)} />
        <Stat label="Net cash invested" value={moneyDec.format(netInitialCashInvested)} emphasize />
        <Stat label="Rate · term" value={`${interestRateApr}% · ${termYears}y`} />
        <Stat label="Rent / mo" value={formatMoney(monthlyRent)} />
        <Box
          sx={{
            gridColumn: "1 / -1",
            [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
              gridColumn: "auto",
              justifySelf: "end",
            },
          }}
        >
          <EditActions onGoToCommonInputs={onGoToCommonInputs} onGoToRental={onGoToRental} />
        </Box>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 0.65, lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
      >
        Shared scenario — loan and cash-to-close edit on Common Inputs; rent on Rental. Exit keeps sale
        timing, yield inclusion, tax, and rent-vs-buy.
      </Typography>
    </Box>
  );
}
