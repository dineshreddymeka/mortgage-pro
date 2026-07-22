import { FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { AppPersisted, LoanScenarioPersisted } from "../storage/mortgageState";
import { resolveLoanProduct } from "../lib/resolveLoanScenario";

function patchLoan(current: LoanScenarioPersisted | undefined, partial: Partial<LoanScenarioPersisted>): LoanScenarioPersisted | undefined {
  const merged: LoanScenarioPersisted = { productType: "conventional", ...(current ?? {}), ...partial };
  const isDefault = merged.productType === "conventional" && !merged.rateType && !merged.arm && !merged.pointsPercent && (!merged.buydown || merged.buydown === "none") && !merged.financeUpfrontFees && merged.noteApr === undefined && merged.termYears === undefined;
  return isDefault ? undefined : merged;
}

export function LoanProductPanel({ state, patch }: { state: AppPersisted; patch: (p: Partial<AppPersisted>) => void }) {
  const loan = state.loan;
  const resolved = resolveLoanProduct(state);
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">Optional product rules — legacy fields still work when empty.</Typography>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Loan product" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.productType ?? "conventional"}
            onChange={(e) => patch({ loan: patchLoan(loan, { productType: e.target.value as LoanScenarioPersisted["productType"] }) })}>
            <option value="conventional">Conventional</option><option value="fha">FHA</option><option value="va">VA</option><option value="usda">USDA</option>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Rate type" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.rateType ?? "fixed"}
            onChange={(e) => patch({ loan: patchLoan(loan, { rateType: e.target.value === "arm" ? "arm" : "fixed" }) })}>
            <option value="fixed">Fixed</option><option value="arm">ARM</option>
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="Points %" size="small" fullWidth value={loan?.pointsPercent ?? 0}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) patch({ loan: patchLoan(loan, { pointsPercent: Math.max(0, n) }) }); }} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="Buydown" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.buydown ?? "none"}
            onChange={(e) => patch({ loan: patchLoan(loan, { buydown: e.target.value === "none" ? undefined : e.target.value as "2-1" | "3-2-1" }) })}>
            <option value="none">None</option><option value="2-1">2-1</option><option value="3-2-1">3-2-1</option>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormControlLabel control={<Switch size="small" checked={loan?.financeUpfrontFees ?? false} onChange={(e) => patch({ loan: patchLoan(loan, { financeUpfrontFees: e.target.checked || undefined }) })} />} label={<Typography variant="caption">Finance upfront fees</Typography>} />
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">Loan ${resolved.totalLoanAmount.toLocaleString()} · {resolved.miLabel} ${resolved.miMonthly}/mo</Typography>
    </Stack>
  );
}
