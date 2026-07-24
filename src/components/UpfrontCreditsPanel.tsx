import { InputAdornment, Stack, TextField, Typography } from "@mui/material";
import type { AppPersisted, UpfrontScenarioPersisted } from "../storage/mortgageState";
import { computeNetCashToClose } from "../lib/buyingCostsMath";
import { FormField, FormGrid } from "../layout/FormGrid";
import { minOperationalFontPx } from "../layout/formLayout";
import { resolveLoanProduct, resolveUpfrontAdjustments } from "../lib/resolveLoanScenario";

function patchUpfront(
  current: UpfrontScenarioPersisted | undefined,
  key: keyof UpfrontScenarioPersisted,
  value: number
): UpfrontScenarioPersisted | undefined {
  const next = { ...(current ?? {}), [key]: value > 0 ? value : undefined };
  if (!next.earnestMoney && !next.sellerCredit && !next.lenderCredit && !next.rehabCashIn) {
    return undefined;
  }
  return {
    ...(next.earnestMoney ? { earnestMoney: next.earnestMoney } : {}),
    ...(next.sellerCredit ? { sellerCredit: next.sellerCredit } : {}),
    ...(next.lenderCredit ? { lenderCredit: next.lenderCredit } : {}),
    ...(next.rehabCashIn ? { rehabCashIn: next.rehabCashIn } : {}),
  };
}

export function UpfrontCreditsPanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (p: Partial<AppPersisted>) => void;
}) {
  const u = state.upfront;
  const net = computeNetCashToClose(
    state.downPayment,
    state.closingCosts,
    state.miscInitialCash,
    resolveUpfrontAdjustments(state, resolveLoanProduct(state).pointsUpfrontCost)
  );

  const field = (key: keyof UpfrontScenarioPersisted, label: string) => (
    <TextField
      label={label}
      size="small"
      fullWidth
      value={String(u?.[key] ?? 0)}
      onChange={(e) => {
        const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
        if (Number.isFinite(n)) {
          patch({ upfront: patchUpfront(u, key, Math.max(0, Math.round(n))) });
        }
      }}
      slotProps={{
        input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
      }}
    />
  );

  return (
    <Stack spacing={1}>
      {/* Half-width widget: 2×2 only — avoid 3+1 / four-across in a side panel. */}
      <FormGrid maxColumns={2} compact>
        <FormField>{field("earnestMoney", "Earnest money")}</FormField>
        <FormField>{field("sellerCredit", "Seller credit")}</FormField>
        <FormField>{field("lenderCredit", "Lender credit")}</FormField>
        <FormField>{field("rehabCashIn", "Rehab cash-in")}</FormField>
      </FormGrid>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: `${minOperationalFontPx}px` }}
      >
        Net cash to close: ${net.netCashToClose.toLocaleString()}
      </Typography>
    </Stack>
  );
}
