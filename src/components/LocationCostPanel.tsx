import { Button, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import type { AppPersisted } from "../storage/mortgageState";
import { estimateLocationCosts, normalizePostal, normalizeStateCode } from "../lib/locationCostEstimator";

export function LocationCostPanel({ state, patch }: { state: AppPersisted; patch: (p: Partial<AppPersisted>) => void }) {
  const est = estimateLocationCosts(state.propertyState, state.propertyPostalCode);
  return (
    <Stack spacing={1}>
      <Grid container spacing={1}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="State" size="small" fullWidth value={state.propertyState} onChange={(e) => patch({ propertyState: normalizeStateCode(e.target.value) })} inputProps={{ maxLength: 2 }} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <TextField label="Postal / ZIP" size="small" fullWidth value={state.propertyPostalCode} onChange={(e) => patch({ propertyPostalCode: normalizePostal(e.target.value) })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Button size="small" variant="outlined" disabled={state.homePrice <= 0} onClick={() => patch({ propertyTaxPercent: est.suggestedPropertyTaxPercent, propertyTaxAnnual: Math.round((state.homePrice * est.suggestedPropertyTaxPercent) / 100), insuranceAnnual: est.suggestedInsuranceAnnual })}>Apply tax &amp; insurance hints</Button>
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">Hint {est.suggestedPropertyTaxPercent}% tax · ${est.suggestedInsuranceAnnual} ins · closing ×{est.closingCostMultiplier.toFixed(2)}</Typography>
    </Stack>
  );
}
