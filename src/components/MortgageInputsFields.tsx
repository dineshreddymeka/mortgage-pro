import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Box,
  Button,
  Collapse,
  InputAdornment,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import TextField from "@mui/material/TextField";
import { useId, useMemo, useRef, useState } from "react";
import { estimatePmiMonthly } from "../lib/mortgageMath";
import {
  computeMonthlyCarryingCosts,
  formatNumberField,
  parseNumericInput,
  shouldShowPmiField,
  syncDownPaymentDollarPatch,
  syncDownPaymentPercentPatch,
  syncHomePricePatch,
  syncPropertyTaxAnnualPatch,
  syncPropertyTaxPercentPatch,
} from "../lib/mortgageInputSync";
import type { AppPersisted } from "../storage/mortgageState";
import { DollarPercentField } from "./DollarPercentField";

export type MortgageInputsFieldsProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  /** Helper under purchase price (e.g. cap rate note on Mortgage tab). */
  purchasePriceHelperText?: string;
  /** Defaults to medium (Mortgage / Rental). */
  inputSize?: "small" | "medium";
  /**
   * When true (Mortgage tab): up to 4 fields per row on `md+`, smaller gaps, collapsible carrying costs.
   */
  compactGrid?: boolean;
};

/** 4 per row desktop; 2 on tablet; full width phone */
const q4 = { xs: 12 as const, sm: 6 as const, md: 3 as const };

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

type TaxesCostsSectionProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  inputSize: "small" | "medium";
  compactGrid: boolean;
  defaultExpanded?: boolean;
};

function TaxesCostsSection({
  state,
  patch,
  inputSize,
  compactGrid,
  defaultExpanded = false,
}: TaxesCostsSectionProps) {
  const sectionId = useId();
  const panelId = `${sectionId}-panel`;
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const costs = useMemo(() => computeMonthlyCarryingCosts(state), [state]);
  const showPmi = shouldShowPmiField(
    state.downPaymentPercent,
    state.pmiMonthly,
    state.homePrice,
    state.downPayment
  );

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) {
        window.requestAnimationFrame(() => firstFieldRef.current?.focus());
      }
      return next;
    });
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.paper",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label="Taxes and monthly costs"
        sx={{
          px: 1,
          py: 0.75,
          cursor: "pointer",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: -2,
          },
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          aria-hidden
          sx={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
        <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" component="span">
            Taxes &amp; monthly costs
          </Typography>
          <Typography variant="caption" color="text.secondary" component="span">
            Tax, ins, HOA{showPmi ? ", PMI" : ""} · {moneyDec.format(costs.totalMonthly)}/mo
          </Typography>
        </Stack>
      </Stack>
      <Collapse in={expanded}>
        <Box id={panelId} role="region" aria-label="Taxes and monthly costs" sx={{ px: 1, pb: 1 }}>
          <Grid container spacing={compactGrid ? { xs: 0.75, md: 0.5 } : 1}>
            <Grid size={q4}>
              <DollarPercentField
                label="Property tax"
                size={inputSize}
                basis={state.homePrice}
                dollarValue={state.propertyTaxAnnual}
                percentValue={state.propertyTaxPercent}
                dollarSuffix="/yr"
                percentBasisLabel="purchase price"
                inputRef={firstFieldRef}
                onDollarChange={(annual) => patch(syncPropertyTaxAnnualPatch(annual, state.homePrice))}
                onPercentChange={(pct) =>
                  patch(syncPropertyTaxPercentPatch(pct, state.homePrice, state.propertyTaxAnnual))
                }
              />
            </Grid>
            <Grid size={q4}>
              <TextField
                label="Home insurance (annual)"
                size={inputSize}
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
            </Grid>
            <Grid size={q4}>
              <TextField
                label="HOA (monthly)"
                size={inputSize}
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
            </Grid>
            {showPmi ? (
              <>
                <Grid size={q4}>
                  <TextField
                    label="PMI (monthly)"
                    size={inputSize}
                    fullWidth
                    title="Private mortgage insurance — usually $0 when down is ~20%+"
                    value={formatNumberField(state.pmiMonthly)}
                    onChange={(e) => {
                      const n = parseNumericInput(e.target.value);
                      if (n !== null) patch({ pmiMonthly: Math.max(0, Math.round(n)) });
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={q4}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size={inputSize === "small" ? "small" : "medium"}
                    fullWidth
                    sx={{ height: inputSize === "small" ? 40 : 56 }}
                    aria-label="Estimate PMI at about 0.6 percent per year"
                    onClick={() => {
                      const loan = Math.max(0, state.homePrice - state.downPayment);
                      patch({
                        pmiMonthly: Math.max(
                          0,
                          Math.round(estimatePmiMonthly(loan, state.downPaymentPercent))
                        ),
                      });
                    }}
                  >
                    ~0.6%/yr
                  </Button>
                </Grid>
              </>
            ) : null}
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}

export function MortgageInputsFields({
  state,
  patch,
  purchasePriceHelperText = "Used as property value for rental cap rate",
  inputSize = "medium",
  compactGrid = false,
}: MortgageInputsFieldsProps) {
  const g = compactGrid ? q4 : { xs: 12 as const, sm: 6 as const };
  const spacing = compactGrid ? { xs: 0.75, md: 0.5 } : 1;
  const [extraPrincipalRevealed, setExtraPrincipalRevealed] = useState(false);
  const showExtraPrincipalField =
    state.extraPrincipalMonthly > 0 || extraPrincipalRevealed || !compactGrid;

  return (
    <Stack spacing={compactGrid ? 0.75 : 1}>
      <Grid container spacing={spacing}>
        <Grid size={g}>
          <TextField
            label="Purchase price"
            size={inputSize}
            fullWidth
            helperText={compactGrid ? undefined : purchasePriceHelperText}
            title={purchasePriceHelperText}
            value={formatNumberField(state.homePrice)}
            onChange={(e) => {
              const n = parseNumericInput(e.target.value);
              if (n === null) return;
              patch(
                syncHomePricePatch(n, state.downPaymentPercent, state.propertyTaxPercent)
              );
            }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              },
            }}
          />
        </Grid>
        <Grid size={g}>
          <DollarPercentField
            label="Down payment"
            size={inputSize}
            basis={state.homePrice}
            dollarValue={state.downPayment}
            percentValue={state.downPaymentPercent}
            capDollarAtBasis
            onDollarChange={(dp) => patch(syncDownPaymentDollarPatch(dp, state.homePrice))}
            onPercentChange={(pct) =>
              patch(syncDownPaymentPercentPatch(pct, state.homePrice, state.downPayment))
            }
          />
        </Grid>
        <Grid size={g}>
          <TextField
            label="Interest rate (APR)"
            size={inputSize}
            fullWidth
            value={formatNumberField(state.interestRateApr)}
            onChange={(e) => {
              const n = parseNumericInput(e.target.value);
              if (n !== null) patch({ interestRateApr: Math.max(0, n) });
            }}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              },
            }}
          />
        </Grid>
        <Grid size={g}>
          <TextField
            label="Loan term"
            size={inputSize}
            fullWidth
            select
            SelectProps={{ native: true }}
            value={state.termYears}
            onChange={(e) => patch({ termYears: Number(e.target.value) })}
          >
            {[10, 15, 20, 25, 30].map((y) => (
              <option key={y} value={y}>
                {y} years
              </option>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {compactGrid ? (
        <TaxesCostsSection
          state={state}
          patch={patch}
          inputSize={inputSize}
          compactGrid
          defaultExpanded={
            state.propertyTaxAnnual === 0 &&
            state.insuranceAnnual === 0 &&
            state.hoaMonthly === 0 &&
            state.pmiMonthly === 0
          }
        />
      ) : (
        <TaxesCostsSection
          state={state}
          patch={patch}
          inputSize={inputSize}
          compactGrid={false}
          defaultExpanded
        />
      )}

      {showExtraPrincipalField ? (
        <TextField
          label="Extra principal (monthly)"
          size={inputSize}
          fullWidth
          helperText={
            compactGrid
              ? "Add-on principal / mo ($0 = none)"
              : "Optional P&I prepayment each month ($0 = none). Shorter payoff changes amortization, yearly detail, and loan summary totals."
          }
          title="Optional prepayment toward principal each month"
          value={formatNumberField(state.extraPrincipalMonthly)}
          onChange={(e) => {
            const n = parseNumericInput(e.target.value);
            if (n !== null) patch({ extraPrincipalMonthly: Math.max(0, Math.round(n)) });
          }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            },
          }}
        />
      ) : (
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon fontSize="small" />}
          sx={{ alignSelf: "flex-start" }}
          aria-label="Add extra principal payment field"
          onClick={() => setExtraPrincipalRevealed(true)}
        >
          Extra principal
        </Button>
      )}
    </Stack>
  );
}
