import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo } from "react";
import { applyBuyerCostLineOverrides, estimateHomeBuyingOneTimeCosts } from "../lib/buyingCostsMath";
import { FormField, FormGrid } from "../layout/FormGrid";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../layout/formLayout";
import type { AppPersisted } from "../storage/mortgageState";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const operationalFont = `${minOperationalFontPx}px`;

/** Keep fee inputs at 36/44 even when table row padding stays compact. */
const feeInputSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: touchTargetFinePx,
    "@media (pointer: coarse)": {
      minHeight: touchTargetCoarsePx,
    },
  },
  "& .MuiOutlinedInput-input": {
    px: 0.5,
    py: 0,
    fontSize: operationalFont,
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums",
    boxSizing: "border-box" as const,
    minHeight: touchTargetFinePx - 2,
    "@media (pointer: coarse)": {
      minHeight: touchTargetCoarsePx - 2,
    },
  },
};

function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export type UpfrontCashScenarioPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  loanAmount: number;
  cashToClose: number;
  closingCostMultiplier?: number;
  /** Hide the line about where to edit closing/misc (when this panel is already on the dedicated tab). */
  hideEditHint?: boolean;
};

export function UpfrontCashScenarioPanel({
  state,
  patch,
  loanAmount,
  cashToClose,
  closingCostMultiplier = 1,
  hideEditHint = false,
}: UpfrontCashScenarioPanelProps) {
  const baseEst = useMemo(
    () =>
      estimateHomeBuyingOneTimeCosts({
        homePrice: state.homePrice,
        loanAmount,
        propertyTaxAnnual: state.propertyTaxAnnual,
        insuranceAnnual: state.insuranceAnnual,
        hoaMonthly: state.hoaMonthly,
        closingCostMultiplier,
      }),
    [
      state.homePrice,
      loanAmount,
      state.propertyTaxAnnual,
      state.insuranceAnnual,
      state.hoaMonthly,
      closingCostMultiplier,
    ]
  );

  const est = useMemo(
    () => applyBuyerCostLineOverrides(baseEst, state.buyingCostLineOverrides),
    [baseEst, state.buyingCostLineOverrides]
  );

  const setLineAmount = useCallback(
    (id: string, baseAmount: number, rawInput: string) => {
      const digits = rawInput.replace(/\D/g, "");
      const prev = state.buyingCostLineOverrides;
      if (digits === "") {
        if (!prev?.[id]) return;
        const next = { ...prev };
        delete next[id];
        patch({
          buyingCostLineOverrides: Object.keys(next).length > 0 ? next : undefined,
        });
        return;
      }
      const n = Math.max(0, Math.round(Number(digits)));
      if (n === baseAmount) {
        if (!prev?.[id]) return;
        const next = { ...prev };
        delete next[id];
        patch({
          buyingCostLineOverrides: Object.keys(next).length > 0 ? next : undefined,
        });
        return;
      }
      patch({
        buyingCostLineOverrides: { ...(prev ?? {}), [id]: n },
      });
    },
    [patch, state.buyingCostLineOverrides]
  );

  const closing = Math.max(0, state.closingCosts);
  const misc = Math.max(0, state.miscInitialCash);
  const down = Math.max(0, state.downPayment);
  const delta = est.suggestedClosingTotal - closing;

  return (
    <Stack spacing={1}>
      {!hideEditHint ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.3, fontSize: operationalFont }}
        >
          Modeled lines are editable · compare to entered closing · not a Loan Estimate.
        </Typography>
      ) : (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.3, fontSize: operationalFont }}
        >
          Fee / prepaid model · editable · not a Loan Estimate.
        </Typography>
      )}

      {/* Side track / half-width: clean 2×2 — avoid 3+1 four-value layouts. */}
      <FormGrid maxColumns={2} compact>
        <FormField>
          <Stat label="Down" value={money.format(down)} />
        </FormField>
        <FormField>
          <Stat label="Closing" value={money.format(closing)} />
        </FormField>
        <FormField>
          <Stat label="Misc" value={money.format(misc)} />
        </FormField>
        <FormField>
          <Stat label="Total" value={money.format(cashToClose)} emphasized />
        </FormField>
      </FormGrid>

      {/* Horizontal overflow only on the fee model table — actions stay in normal flow. */}
      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Table size="small" padding="none" sx={{ minWidth: 280 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  py: 0.35,
                  px: 0.75,
                  fontSize: operationalFont,
                }}
              >
                Modeled line
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  py: 0.35,
                  px: 0.75,
                  fontSize: operationalFont,
                  width: "28%",
                }}
              >
                Amount
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {est.lines.map((l) => {
              const baseAmount = baseEst.lines.find((b) => b.id === l.id)?.amount ?? l.amount;
              const overridden = state.buyingCostLineOverrides?.[l.id] !== undefined;
              return (
                <TableRow key={l.id}>
                  <TableCell sx={{ py: 0.2, px: 0.75, fontSize: operationalFont, lineHeight: 1.25 }}>
                    {l.label}
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.5, fontSize: operationalFont }}
                    >
                      ({l.kind === "fee" ? "fee" : "prepaid"}
                      {overridden ? " · edited" : ""})
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.15, px: 0.5, width: "32%", maxWidth: 140 }}>
                    <TextField
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={formatNumberField(l.amount)}
                      onChange={(e) => setLineAmount(l.id, baseAmount, e.target.value)}
                      inputProps={{
                        inputMode: "numeric",
                        "aria-label": `${l.label} amount in dollars`,
                      }}
                      sx={feeInputSx}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 0.3, px: 0.75, fontSize: operationalFont }}>
                Fees subtotal
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: operationalFont, px: 0.75 }}>
                {money.format(est.feesSubtotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, py: 0.3, px: 0.75, fontSize: operationalFont }}>
                Prepaids subtotal
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: operationalFont, px: 0.75 }}>
                {money.format(est.prepaidsSubtotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, py: 0.35, px: 0.75, fontSize: operationalFont }}>
                Suggested closing bucket
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: operationalFont, px: 0.75 }}>
                {money.format(est.suggestedClosingTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", lineHeight: 1.35, fontSize: operationalFont }}
      >
        vs entered closing: {delta >= 0 ? "+" : ""}
        {money.format(delta)} ({delta >= 0 ? "model higher" : "model lower"}).
      </Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} sx={{ flexShrink: 0 }}>
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: operationalFont,
            minHeight: touchTargetFinePx,
            "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
          }}
          onClick={() => patch({ closingCosts: Math.max(0, Math.round(est.suggestedClosingTotal)) })}
        >
          Set closing to model (fees + prepaids)
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: operationalFont,
            minHeight: touchTargetFinePx,
            "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
          }}
          onClick={() => patch({ closingCosts: Math.max(0, Math.round(est.feesSubtotal)) })}
        >
          Fees only
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: operationalFont,
            minHeight: touchTargetFinePx,
            "@media (pointer: coarse)": { minHeight: touchTargetCoarsePx },
          }}
          onClick={() => patch({ buyingCostLineOverrides: undefined })}
        >
          Reset lines to formula
        </Button>
      </Stack>
    </Stack>
  );
}

function Stat({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <Stack spacing={0.1} sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.2, fontSize: operationalFont }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: emphasized ? 800 : 600, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
