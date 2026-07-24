import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { FormField, FormGrid } from "../../layout/FormGrid";
import { minOperationalFontPx, touchTargetFinePx } from "../../layout/formLayout";
import { parseNumericInput } from "../../lib/mortgageInputSync";
import type { AppPersisted } from "../../storage/mortgageState";
import { monthlyCarryingTotal } from "./rentalProFormaLedger";
import { RentalFieldRow } from "./RentalFieldControls";

const opFont = `${minOperationalFontPx}px`;

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function formatPercentField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 100) / 100);
}

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sectionLabelSx = {
  fontWeight: 700,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  fontSize: opFont,
  color: "text.secondary",
  display: "block",
  mb: 0.65,
};

export type RentalOperatingExpensesPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  totalOpexMo: number;
  piMonthly: number;
  pmiMonthly: number;
  pctOfEgiLabel: string;
  onEditFinancing?: () => void;
};

/** Canonical Rental OpEx editor (tax / ins / HOA / mgmt / maint / CapEx). */
export function RentalOperatingExpensesPanel({
  state,
  patch,
  totalOpexMo,
  piMonthly,
  pmiMonthly,
  pctOfEgiLabel,
  onEditFinancing,
}: RentalOperatingExpensesPanelProps) {
  const monthlyCarrying = monthlyCarryingTotal(totalOpexMo, piMonthly, pmiMonthly);
  const pmiPart =
    pmiMonthly > 0.001 ? ` · PMI ${moneyDec.format(pmiMonthly)}` : "";

  return (
    <Stack spacing={0.85} id="rental-edit-carrying">
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, fontSize: opFont }}
        >
          OpEx {moneyDec.format(totalOpexMo)} + P&amp;I {moneyDec.format(piMonthly)}
          {pmiPart} · OpEx {pctOfEgiLabel} of EGI
        </Typography>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`${moneyDec.format(monthlyCarrying)}/mo total`}
          sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
        />
      </Stack>

      <Box
        id="rental-edit-debt-service"
        sx={{
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          p: 1,
        }}
      >
        <Typography variant="caption" sx={sectionLabelSx}>
          Debt service
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: opFont }}>
            P&amp;I / mo
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
          >
            {moneyDec.format(piMonthly)}
          </Typography>
        </Stack>
        {pmiMonthly > 0.001 ? (
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1} sx={{ mt: 0.35 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: opFont }}>
              PMI / mo
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
            >
              {moneyDec.format(pmiMonthly)}
            </Typography>
          </Stack>
        ) : null}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, display: "block", fontSize: opFont, mt: 0.35 }}
        >
          {state.termYears}-year loan · {state.interestRateApr}% APR
          {onEditFinancing ? (
            <>
              {" · "}
              <Typography
                component="button"
                type="button"
                variant="caption"
                onClick={onEditFinancing}
                aria-label="Edit financing on Financing tab"
                sx={{
                  cursor: "pointer",
                  border: 0,
                  bgcolor: "transparent",
                  p: 0,
                  m: 0,
                  font: "inherit",
                  fontSize: opFont,
                  color: "primary.main",
                  textDecoration: "underline",
                  minHeight: touchTargetFinePx,
                }}
              >
                Edit Financing
              </Typography>
            </>
          ) : null}
        </Typography>
      </Box>

      <Box
        id="rental-edit-monthly-taxes"
        sx={{
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          p: 1,
        }}
      >
        <Typography variant="caption" sx={sectionLabelSx}>
          Taxes, insurance, HOA
        </Typography>
        <FormGrid maxColumns={2} compact>
          <FormField>
            <TextField
              label="Property tax (yr)"
              size="small"
              fullWidth
              value={formatNumberField(state.propertyTaxAnnual)}
              onChange={(e) => {
                const n = parseNumericInput(e.target.value);
                if (n === null) return;
                const hp = state.homePrice;
                const annual = Math.max(0, n);
                patch({
                  propertyTaxAnnual: annual,
                  propertyTaxPercent: hp > 0 ? (annual / hp) * 100 : 0,
                });
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
              label="Property tax %"
              size="small"
              fullWidth
              value={formatPercentField(state.propertyTaxPercent)}
              onChange={(e) => {
                const n = parseNumericInput(e.target.value);
                if (n === null) return;
                const pct = Math.min(100, Math.max(0, n));
                const hp = state.homePrice;
                patch({
                  propertyTaxPercent: pct,
                  propertyTaxAnnual: hp > 0 ? Math.round((hp * pct) / 100) : state.propertyTaxAnnual,
                });
              }}
              slotProps={{
                input: {
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                },
              }}
            />
          </FormField>
          <FormField>
            <TextField
              label="Insurance (yr)"
              size="small"
              fullWidth
              value={formatNumberField(state.insuranceAnnual)}
              onChange={(e) => {
                const n = parseNumericInput(e.target.value);
                if (n !== null) patch({ insuranceAnnual: Math.max(0, n) });
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
              label="HOA (mo)"
              size="small"
              fullWidth
              value={formatNumberField(state.hoaMonthly)}
              onChange={(e) => {
                const n = parseNumericInput(e.target.value);
                if (n !== null) patch({ hoaMonthly: Math.max(0, n) });
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                },
              }}
            />
          </FormField>
        </FormGrid>
      </Box>

      <Box
        id="rental-edit-reserves-section"
        sx={{
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          p: 1,
        }}
      >
        <Typography variant="caption" sx={sectionLabelSx}>
          Management &amp; reserves
        </Typography>
        <Stack spacing={0.65}>
          <RentalFieldRow
            anchorId="rental-edit-mgmt"
            label="Mgmt"
            detail="% of scheduled income (0–50%)"
            valueLabel={`${state.propertyMgmtPercent.toFixed(1)}%`}
            textLabel="%"
            textValue={formatPercentField(state.propertyMgmtPercent)}
            onText={(raw) => {
              const n = Number(raw.replace(/[^0-9.]/g, ""));
              if (!Number.isFinite(n)) return;
              patch({ propertyMgmtPercent: Math.min(50, Math.max(0, n)) });
            }}
            endAdornment={<InputAdornment position="end">%</InputAdornment>}
          />
          <RentalFieldRow
            anchorId="rental-edit-maint"
            label="Maint."
            detail="% of base rent (0–50%)"
            valueLabel={`${state.maintenancePercent.toFixed(1)}%`}
            textLabel="%"
            textValue={formatPercentField(state.maintenancePercent)}
            onText={(raw) => {
              const n = Number(raw.replace(/[^0-9.]/g, ""));
              if (!Number.isFinite(n)) return;
              patch({ maintenancePercent: Math.min(50, Math.max(0, n)) });
            }}
            endAdornment={<InputAdornment position="end">%</InputAdornment>}
          />
          <RentalFieldRow
            anchorId="rental-edit-capex"
            label="CapEx"
            detail="% of base rent (0–30%)"
            valueLabel={`${state.capexPercent.toFixed(1)}%`}
            textLabel="%"
            textValue={formatPercentField(state.capexPercent)}
            onText={(raw) => {
              const n = Number(raw.replace(/[^0-9.]/g, ""));
              if (!Number.isFinite(n)) return;
              patch({ capexPercent: Math.min(30, Math.max(0, n)) });
            }}
            endAdornment={<InputAdornment position="end">%</InputAdornment>}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
