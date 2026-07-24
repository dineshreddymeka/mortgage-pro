import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FormField, FormGrid } from "../../layout/FormGrid";
import { minOperationalFontPx } from "../../layout/formLayout";
import { formatNumberField, parseNumericInput } from "../../lib/mortgageInputSync";
import type { AppPersisted } from "../../storage/mortgageState";
import {
  patchClosingCosts,
  patchMiscInitialCash,
  type CommonCashInvestedSummary,
} from "./commonInputsHelpers";

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

export type CashInvestedPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  summary: CommonCashInvestedSummary;
};

function SummaryStat({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Stack spacing={0.15} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontSize: `${minOperationalFontPx}px`,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: "var(--pp-font-display)",
          fontWeight: emphasize ? 800 : 700,
          fontSize: emphasize ? { xs: "1.05rem", sm: "1.15rem" } : "0.95rem",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Compact closing + misc editors with derived loan / net cash summary.
 * Credits and fee modeling stay on Upfront.
 */
export function CashInvestedPanel({ state, patch, summary }: CashInvestedPanelProps) {
  return (
    <Stack spacing={1.25}>
      <FormGrid maxColumns={2} compact>
        <FormField>
          <TextField
            label="Closing costs"
            size="small"
            fullWidth
            value={formatNumberField(state.closingCosts)}
            onChange={(e) => {
              const n = parseNumericInput(e.target.value);
              if (n !== null) patch(patchClosingCosts(n));
            }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
            }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Misc. one-time"
            size="small"
            fullWidth
            value={formatNumberField(state.miscInitialCash)}
            onChange={(e) => {
              const n = parseNumericInput(e.target.value);
              if (n !== null) patch(patchMiscInitialCash(n));
            }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
            }}
          />
        </FormField>
      </FormGrid>

      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          bgcolor: "background.paper",
          px: 1,
          py: 1,
        }}
      >
        <FormGrid maxColumns={2} compact>
          <FormField>
            <SummaryStat label="Down" value={money.format(summary.downPayment)} />
          </FormField>
          <FormField>
            <SummaryStat label="Closing + misc" value={money.format(summary.closingPlusMisc)} />
          </FormField>
          <FormField>
            <SummaryStat label="Loan" value={money.format(summary.loanAmount)} />
          </FormField>
          <FormField>
            <SummaryStat label="Net cash" value={moneyDec.format(summary.netCashToClose)} emphasize />
          </FormField>
        </FormGrid>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.35 }}>
          Gross cash in {money.format(summary.grossCashIn)}. Credits &amp; fee model stay on Upfront.
        </Typography>
      </Box>
    </Stack>
  );
}
