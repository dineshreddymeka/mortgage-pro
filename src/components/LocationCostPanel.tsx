import { Button, Stack, TextField, Typography } from "@mui/material";
import type { AppPersisted } from "../storage/mortgageState";
import { estimateLocationCosts, normalizePostal, normalizeStateCode } from "../lib/locationCostEstimator";
import { FormField, FormGrid } from "../layout/FormGrid";

export function LocationCostPanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (p: Partial<AppPersisted>) => void;
}) {
  const est = estimateLocationCosts(state.propertyState, state.propertyPostalCode);
  return (
    <Stack spacing={1}>
      <FormGrid maxColumns={3} compact>
        <FormField>
          <TextField
            label="State"
            size="small"
            fullWidth
            value={state.propertyState}
            onChange={(e) => patch({ propertyState: normalizeStateCode(e.target.value) })}
            inputProps={{ maxLength: 2 }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Postal / ZIP"
            size="small"
            fullWidth
            value={state.propertyPostalCode}
            onChange={(e) => patch({ propertyPostalCode: normalizePostal(e.target.value) })}
          />
        </FormField>
        <FormField span={3}>
          <Button
            size="small"
            variant="outlined"
            fullWidth
            disabled={state.homePrice <= 0}
            onClick={() =>
              patch({
                propertyTaxPercent: est.suggestedPropertyTaxPercent,
                propertyTaxAnnual: Math.round((state.homePrice * est.suggestedPropertyTaxPercent) / 100),
                insuranceAnnual: est.suggestedInsuranceAnnual,
              })
            }
          >
            Apply tax &amp; insurance hints
          </Button>
        </FormField>
      </FormGrid>
      <Typography variant="caption" color="text.secondary">
        Hint {est.suggestedPropertyTaxPercent}% tax · ${est.suggestedInsuranceAnnual} ins · closing ×
        {est.closingCostMultiplier.toFixed(2)}
      </Typography>
    </Stack>
  );
}
