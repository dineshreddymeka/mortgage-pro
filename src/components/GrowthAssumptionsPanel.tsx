import { InputAdornment, Stack, Typography } from "@mui/material";
import TextField from "@mui/material/TextField";
import type {
  AppPersisted,
  GrowthAssumptionsPersisted,
} from "../storage/mortgageState";

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

function patchGrowth(
  current: GrowthAssumptionsPersisted | undefined,
  partial: Partial<GrowthAssumptionsPersisted>
): GrowthAssumptionsPersisted | undefined {
  const rent = partial.rentGrowthPercent ?? current?.rentGrowthPercent ?? 0;
  const expense = partial.expenseGrowthPercent ?? current?.expenseGrowthPercent ?? 0;
  if (rent <= 0 && expense <= 0) return undefined;
  return {
    rentGrowthPercent: Math.max(0, rent),
    expenseGrowthPercent: Math.max(0, expense),
  };
}

export type GrowthAssumptionsPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
};

/** Annual rent / OpEx growth inputs (Rental tab). Home appreciation stays on Exit. */
export function GrowthAssumptionsPanel({ state, patch }: GrowthAssumptionsPanelProps) {
  const rentGrowth = state.growth?.rentGrowthPercent ?? 0;
  const expenseGrowth = state.growth?.expenseGrowthPercent ?? 0;
  const hasData = state.homePrice > 0 || state.monthlyRent > 0;

  return (
    <Stack spacing={0.85}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
        Compound annually from month 1. Property value appreciation is modeled on the Exit tab (
        implied / present value). Leave at 0 for flat rent and expenses.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          label="Rent growth"
          size="small"
          fullWidth
          disabled={!hasData && rentGrowth <= 0}
          helperText="Rent + other income"
          value={formatPercentField(rentGrowth)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(n)) return;
            patch({
              growth: patchGrowth(state.growth, {
                rentGrowthPercent: Math.min(30, Math.max(0, n)),
              }),
            });
          }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%/yr</InputAdornment> },
          }}
        />
        <TextField
          label="Expense growth"
          size="small"
          fullWidth
          disabled={!hasData && expenseGrowth <= 0}
          helperText="Tax, ins, HOA, mgmt, reserves"
          value={formatPercentField(expenseGrowth)}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(n)) return;
            patch({
              growth: patchGrowth(state.growth, {
                expenseGrowthPercent: Math.min(30, Math.max(0, n)),
              }),
            });
          }}
          slotProps={{
            input: { endAdornment: <InputAdornment position="end">%/yr</InputAdornment> },
          }}
        />
      </Stack>
      {!hasData ? (
        <Typography variant="caption" color="text.disabled">
          Add purchase price or rent to model forward growth.
        </Typography>
      ) : null}
    </Stack>
  );
}
