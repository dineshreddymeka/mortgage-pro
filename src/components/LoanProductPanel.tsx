import { FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import type { AppPersisted, LoanScenarioPersisted } from "../storage/mortgageState";
import { resolveLoanProduct } from "../lib/resolveLoanScenario";
import { FormField, FormGrid } from "../layout/FormGrid";
import { touchTargetCoarsePx, touchTargetFinePx } from "../layout/formLayout";

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
      <FormGrid maxColumns={3} compact>
        <FormField>
          <TextField label="Loan product" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.productType ?? "conventional"}
            onChange={(e) => patch({ loan: patchLoan(loan, { productType: e.target.value as LoanScenarioPersisted["productType"] }) })}>
            <option value="conventional">Conventional</option><option value="fha">FHA</option><option value="va">VA</option><option value="usda">USDA</option>
          </TextField>
        </FormField>
        <FormField>
          <TextField label="Rate type" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.rateType ?? "fixed"}
            onChange={(e) => patch({ loan: patchLoan(loan, { rateType: e.target.value === "arm" ? "arm" : "fixed" }) })}>
            <option value="fixed">Fixed</option><option value="arm">ARM</option>
          </TextField>
        </FormField>
        <FormField>
          <TextField label="Points %" size="small" fullWidth value={loan?.pointsPercent ?? 0}
            onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) patch({ loan: patchLoan(loan, { pointsPercent: Math.max(0, n) }) }); }} />
        </FormField>
        <FormField>
          <TextField label="Buydown" size="small" fullWidth select SelectProps={{ native: true }} value={loan?.buydown ?? "none"}
            onChange={(e) => patch({ loan: patchLoan(loan, { buydown: e.target.value === "none" ? undefined : e.target.value as "2-1" | "3-2-1" }) })}>
            <option value="none">None</option><option value="2-1">2-1</option><option value="3-2-1">3-2-1</option>
          </TextField>
        </FormField>
        <FormField span={2}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={loan?.financeUpfrontFees ?? false}
                onChange={(e) =>
                  patch({ loan: patchLoan(loan, { financeUpfrontFees: e.target.checked || undefined }) })
                }
              />
            }
            label={<Typography variant="caption">Finance upfront fees</Typography>}
            sx={{
              m: 0,
              width: "100%",
              alignItems: "center",
              minHeight: touchTargetFinePx,
              "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
            }}
          />
        </FormField>
      </FormGrid>
      <Typography variant="caption" color="text.secondary">Loan ${resolved.totalLoanAmount.toLocaleString()} · {resolved.miLabel} ${resolved.miMonthly}/mo</Typography>
    </Stack>
  );
}
