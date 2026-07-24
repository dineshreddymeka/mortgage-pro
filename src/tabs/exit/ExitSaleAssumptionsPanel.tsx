import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FormField, FormGrid } from "../../layout/FormGrid";
import { minOperationalFontPx } from "../../layout/formLayout";
import type { AppPersisted } from "../../storage/mortgageState";
import { formatMoney, formatNumberField } from "./exitFormat";

export type ExitSaleAssumptionsPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  appreciationPct: number;
  sellingCostPct: number;
  yearsOwnedClamped: number;
  calculatedPresentHomeValue: number;
};

/** Exit-owned sale timing / present value / closing cost assumptions. */
export function ExitSaleAssumptionsPanel({
  state,
  patch,
  appreciationPct,
  sellingCostPct,
  yearsOwnedClamped,
  calculatedPresentHomeValue,
}: ExitSaleAssumptionsPanelProps) {
  return (
    <Stack spacing={0.85} className="pp-fade-in">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.35, fontSize: `${minOperationalFontPx}px` }}
      >
        Implied appreciation from purchase → present value over years held. Sale closing % reduces net
        proceeds.
      </Typography>
      <FormGrid maxColumns={3} compact>
        <FormField>
          <TextField
            label="Implied appreciation"
            size="small"
            fullWidth
            value={Number.isFinite(appreciationPct) ? appreciationPct.toFixed(2) : "0"}
            slotProps={{
              input: {
                readOnly: true,
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              },
            }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Years held"
            size="small"
            fullWidth
            value={String(state.yearsOwned)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
              if (Number.isFinite(n)) {
                patch({ yearsOwned: Math.min(80, Math.max(1, Math.round(n))) });
              }
            }}
            slotProps={{ input: { inputMode: "numeric" } }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Sale closing %"
            size="small"
            fullWidth
            value={String(sellingCostPct)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
              if (Number.isFinite(n)) {
                patch({ sellClosingCostPercent: Math.min(15, Math.max(0, n)) });
              }
            }}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Calculated value"
            size="small"
            fullWidth
            value={formatMoney(Math.round(calculatedPresentHomeValue))}
            helperText={`(1+${Number.isFinite(appreciationPct) ? appreciationPct.toFixed(2) : "0"}%)^${yearsOwnedClamped}`}
            slotProps={{
              input: { readOnly: true },
              formHelperText: { sx: { fontSize: `${minOperationalFontPx}px` } },
            }}
          />
        </FormField>
        <FormField>
          <TextField
            label="Present value"
            size="small"
            fullWidth
            value={formatNumberField(state.currentHomeValue)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
              if (Number.isFinite(n)) patch({ currentHomeValue: Math.max(0, Math.round(n)) });
            }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
          />
        </FormField>
      </FormGrid>
    </Stack>
  );
}
