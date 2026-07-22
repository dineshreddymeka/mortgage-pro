import { InputAdornment, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { AppPersisted, UpfrontScenarioPersisted } from "../storage/mortgageState";
import { computeNetCashToClose } from "../lib/buyingCostsMath";
import { resolveLoanProduct, resolveUpfrontAdjustments } from "../lib/resolveLoanScenario";

function patchUpfront(current: UpfrontScenarioPersisted | undefined, key: keyof UpfrontScenarioPersisted, value: number): UpfrontScenarioPersisted | undefined {
  const next = { ...(current ?? {}), [key]: value > 0 ? value : undefined };
  if (!next.earnestMoney && !next.sellerCredit && !next.lenderCredit && !next.rehabCashIn) return undefined;
  return { ...(next.earnestMoney ? { earnestMoney: next.earnestMoney } : {}), ...(next.sellerCredit ? { sellerCredit: next.sellerCredit } : {}), ...(next.lenderCredit ? { lenderCredit: next.lenderCredit } : {}), ...(next.rehabCashIn ? { rehabCashIn: next.rehabCashIn } : {}) };
}

export function UpfrontCreditsPanel({ state, patch }: { state: AppPersisted; patch: (p: Partial<AppPersisted>) => void }) {
  const u = state.upfront;
  const net = computeNetCashToClose(state.downPayment, state.closingCosts, state.miscInitialCash, resolveUpfrontAdjustments(state, resolveLoanProduct(state).pointsUpfrontCost));
  const field = (key: keyof UpfrontScenarioPersisted, label: string) => (
    <TextField label={label} size="small" fullWidth value={String(u?.[key] ?? 0)} onChange={(e) => { const n = Number(e.target.value.replace(/[^0-9.]/g, "")); if (Number.isFinite(n)) patch({ upfront: patchUpfront(u, key, Math.max(0, Math.round(n))) }); }}
      slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }} />
  );
  return (
    <Stack spacing={1}>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 6 }}>{field("earnestMoney", "Earnest money")}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{field("sellerCredit", "Seller credit")}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{field("lenderCredit", "Lender credit")}</Grid>
        <Grid size={{ xs: 12, sm: 6 }}>{field("rehabCashIn", "Rehab cash-in")}</Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">Net cash to close: ${net.netCashToClose.toLocaleString()}</Typography>
    </Stack>
  );
}
