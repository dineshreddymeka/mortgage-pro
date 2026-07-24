import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { touchTargetCoarsePx, touchTargetFinePx } from "../layout/formLayout";
import type { AppPersisted, PaymentPlanLumpSum, PaymentPlanPersisted } from "../storage/mortgageState";

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function normalizePaymentPlan(plan: PaymentPlanPersisted | undefined): PaymentPlanPersisted | undefined {
  if (!plan) return undefined;
  const lumpSums = plan.lumpSums.filter((l) => l.amount > 0);
  if (plan.frequency === "monthly" && lumpSums.length === 0) return undefined;
  return { frequency: plan.frequency, lumpSums };
}

const coarseTouchSx = {
  minHeight: touchTargetFinePx,
  "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
} as const;

const removeButtonSx = {
  minWidth: touchTargetFinePx,
  minHeight: touchTargetFinePx,
  width: touchTargetFinePx,
  height: touchTargetFinePx,
  "@media (pointer: coarse)": {
    minWidth: touchTargetCoarsePx,
    minHeight: touchTargetCoarsePx,
    width: touchTargetCoarsePx,
    height: touchTargetCoarsePx,
  },
} as const;

/** Stable Month | Amount | Remove row — does not collapse via FormGrid 360px bands. */
const lumpRowSx = {
  display: "grid",
  gridTemplateColumns: "minmax(4.75rem, 6.5rem) minmax(0, 1fr) 44px",
  columnGap: 1,
  alignItems: "center",
  width: "100%",
} as const;

export type PaymentPlanPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  scheduledPiMonthly: number;
};

/** Financing tab: pay frequency (biweekly ≈ 13th payment) and optional lump-sum principal. */
export function PaymentPlanPanel({ state, patch, scheduledPiMonthly }: PaymentPlanPanelProps) {
  const plan = state.paymentPlan;
  const frequency = plan?.frequency ?? "monthly";
  const lumpSums = plan?.lumpSums ?? [];
  const biweeklyExtra =
    frequency === "biweekly" && scheduledPiMonthly > 0 ? scheduledPiMonthly / 12 : 0;
  const hasLoan = state.homePrice > state.downPayment && state.termYears > 0;

  const setPlan = (next: PaymentPlanPersisted | undefined) => {
    patch({ paymentPlan: normalizePaymentPlan(next) });
  };

  const updateLump = (index: number, partial: Partial<PaymentPlanLumpSum>) => {
    const base = lumpSums.length ? [...lumpSums] : [];
    while (base.length <= index) base.push({ month: 12, amount: 0 });
    base[index] = { ...base[index]!, ...partial };
    setPlan({ frequency, lumpSums: base.filter((l) => l.amount > 0 || l.month > 0) });
  };

  const removeLump = (index: number) => {
    const next = lumpSums.filter((_, i) => i !== index);
    setPlan(next.length || frequency === "biweekly" ? { frequency, lumpSums: next } : undefined);
  };

  const addLump = () => {
    const next = [...lumpSums, { month: 12, amount: 1000 }];
    setPlan({ frequency, lumpSums: next });
  };

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Works with extra principal above. Biweekly adds P&amp;I ÷ 12 each month (one extra payment per
        year). Lump sums apply in the chosen loan month.
      </Typography>
      {!hasLoan ? (
        <Typography variant="caption" color="text.disabled">
          Enter purchase price, down payment, and term to model a payment plan.
        </Typography>
      ) : null}
      <TextField
        label="Pay frequency"
        size="small"
        fullWidth
        select
        disabled={!hasLoan}
        SelectProps={{ native: true }}
        value={frequency}
        onChange={(e) => {
          const f = e.target.value === "biweekly" ? "biweekly" : "monthly";
          if (f === "monthly" && lumpSums.length === 0) setPlan(undefined);
          else setPlan({ frequency: f, lumpSums });
        }}
      >
        <option value="monthly">Monthly (baseline)</option>
        <option value="biweekly">Biweekly equivalent (+1 payment/yr)</option>
      </TextField>
      {frequency === "biweekly" && scheduledPiMonthly > 0 ? (
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
          ≈ ${Math.round(biweeklyExtra).toLocaleString()}/mo extra principal (P&amp;I ÷ 12)
        </Typography>
      ) : null}
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Lump-sum principal
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={!hasLoan}
          onClick={addLump}
          sx={coarseTouchSx}
        >
          Add
        </Button>
      </Stack>
      {lumpSums.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          None — optional one-time principal payments by loan month.
        </Typography>
      ) : (
        lumpSums.map((lump, index) => (
          <Box key={`lump-${index}`} sx={lumpRowSx}>
            <TextField
              label="Month"
              size="small"
              fullWidth
              value={formatNumberField(lump.month)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                if (!Number.isFinite(n)) return;
                updateLump(index, { month: Math.min(360, Math.max(1, Math.round(n))) });
              }}
            />
            <TextField
              label="Amount"
              size="small"
              fullWidth
              value={formatNumberField(lump.amount)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n)) return;
                updateLump(index, { amount: Math.max(0, Math.round(n)) });
              }}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
              }}
            />
            <IconButton
              size="small"
              aria-label="Remove lump sum"
              onClick={() => removeLump(index)}
              sx={removeButtonSx}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
        ))
      )}
    </Stack>
  );
}
