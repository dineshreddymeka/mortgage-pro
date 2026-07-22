import { Grid2 as Grid, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import type { AppPersisted, BrrrrStrategyPersisted, DealStrategyPersisted, FlipStrategyPersisted } from "../storage/mortgageState";
import { deriveScenario } from "../lib/deriveScenario";
import { hasBrrrrInputs, hasFlipInputs } from "../lib/resolveDealStrategy";
import { formatUsd, parsePercentInput, parseUsdInput, StrategyPanelShell } from "./StrategyPanelShell";

function formatField(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  return String(value);
}

function patchDealStrategy(
  current: DealStrategyPersisted | undefined,
  partial: Partial<DealStrategyPersisted>
): DealStrategyPersisted | undefined {
  const next: DealStrategyPersisted = { ...(current ?? {}), ...partial };
  if (!next.brrrr && !next.flip) return undefined;
  return next;
}

function patchBrrrr(
  current: BrrrrStrategyPersisted | undefined,
  key: keyof BrrrrStrategyPersisted,
  value: number | undefined
): BrrrrStrategyPersisted | undefined {
  const next = { ...(current ?? {}), [key]: value && value > 0 ? value : undefined };
  if (!hasBrrrrInputs(next)) return undefined;
  return {
    ...(next.arv ? { arv: next.arv } : {}),
    ...(next.refiLtvPercent !== undefined ? { refiLtvPercent: next.refiLtvPercent } : {}),
    ...(next.refiClosingCosts ? { refiClosingCosts: next.refiClosingCosts } : {}),
    ...(next.holdingCostsDuringRehab ? { holdingCostsDuringRehab: next.holdingCostsDuringRehab } : {}),
  };
}

function patchFlip(
  current: FlipStrategyPersisted | undefined,
  key: keyof FlipStrategyPersisted,
  value: number | undefined
): FlipStrategyPersisted | undefined {
  const next = { ...(current ?? {}), [key]: value !== undefined && value >= 0 ? value : undefined };
  if (!hasFlipInputs(next)) return undefined;
  return {
    ...(next.salePrice ? { salePrice: next.salePrice } : {}),
    ...(next.sellingCostPercent !== undefined ? { sellingCostPercent: next.sellingCostPercent } : {}),
    ...(next.holdingCosts ? { holdingCosts: next.holdingCosts } : {}),
    ...(next.financingCosts ? { financingCosts: next.financingCosts } : {}),
    ...(next.loanPayoffAtSale ? { loanPayoffAtSale: next.loanPayoffAtSale } : {}),
  };
}

export function DealStrategyPanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
}) {
  const derived = deriveScenario(state);
  const brrrr = state.dealStrategy?.brrrr;
  const flip = state.dealStrategy?.flip;
  const brrrrSnap = derived.dealStrategy.brrrr;
  const flipSnap = derived.dealStrategy.flip;

  return (
    <Stack spacing={1}>
      <StrategyPanelShell
        title="BRRRR"
        description={
          brrrrSnap ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
              Cash left {formatUsd(brrrrSnap.cashLeftInDeal)} · cash out {formatUsd(brrrrSnap.cashOutAtRefi)} ·
              {brrrrSnap.infiniteReturn ? " infinite return" : ` equity ${formatUsd(brrrrSnap.equityCreated)}`}
            </Typography>
          ) : undefined
        }
        emptyHint="Uses purchase, down, loan, rehab, and closing from the scenario. Add ARV to model refi cash left."
        populated={hasBrrrrInputs(brrrr) && brrrrSnap != null}
      >
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="ARV"
              size="small"
              fullWidth
              value={formatField(brrrr?.arv)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    brrrr: patchBrrrr(brrrr, "arv", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Refi LTV"
              size="small"
              fullWidth
              value={formatField(brrrr?.refiLtvPercent ?? 75)}
              onChange={(e) => {
                const n = parsePercentInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    brrrr: patchBrrrr(brrrr, "refiLtvPercent", Math.min(100, Math.max(0, n))),
                  }),
                });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Refi closing"
              size="small"
              fullWidth
              value={formatField(brrrr?.refiClosingCosts)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    brrrr: patchBrrrr(brrrr, "refiClosingCosts", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Holding during rehab"
              size="small"
              fullWidth
              value={formatField(brrrr?.holdingCostsDuringRehab)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    brrrr: patchBrrrr(brrrr, "holdingCostsDuringRehab", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
        </Grid>
        {brrrrSnap ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
            <MetricPill label="Invested" value={formatUsd(brrrrSnap.totalCashInvested)} />
            <MetricPill label="Refi loan" value={formatUsd(brrrrSnap.refiLoanAmount)} />
            <MetricPill label="Cash out" value={formatUsd(brrrrSnap.cashOutAtRefi)} />
            <MetricPill label="Cash left" value={formatUsd(brrrrSnap.cashLeftInDeal)} emphasize />
          </Stack>
        ) : null}
      </StrategyPanelShell>

      <StrategyPanelShell
        title="Fix & flip"
        description={
          flipSnap ? (
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
              Net profit {formatUsd(flipSnap.netProfit)} · ROI {flipSnap.roiPercent.toFixed(1)}% · margin{" "}
              {flipSnap.profitMarginPercent.toFixed(1)}%
            </Typography>
          ) : undefined
        }
        emptyHint="Uses purchase, rehab, and buy closing from the scenario. Add sale price to model flip proceeds."
        populated={hasFlipInputs(flip) && flipSnap != null}
      >
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Sale price"
              size="small"
              fullWidth
              value={formatField(flip?.salePrice)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    flip: patchFlip(flip, "salePrice", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Selling costs"
              size="small"
              fullWidth
              value={formatField(flip?.sellingCostPercent ?? 6)}
              onChange={(e) => {
                const n = parsePercentInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    flip: patchFlip(flip, "sellingCostPercent", Math.min(100, Math.max(0, n))),
                  }),
                });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Holding"
              size="small"
              fullWidth
              value={formatField(flip?.holdingCosts)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    flip: patchFlip(flip, "holdingCosts", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Financing"
              size="small"
              fullWidth
              value={formatField(flip?.financingCosts)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    flip: patchFlip(flip, "financingCosts", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Loan payoff"
              size="small"
              fullWidth
              helperText="Defaults to modeled loan"
              value={formatField(flip?.loanPayoffAtSale)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                patch({
                  dealStrategy: patchDealStrategy(state.dealStrategy, {
                    flip: patchFlip(flip, "loanPayoffAtSale", Math.max(0, Math.round(n))),
                  }),
                });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
        </Grid>
        {flipSnap ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
            <MetricPill label="Project cost" value={formatUsd(flipSnap.totalProjectCost)} />
            <MetricPill label="Net proceeds" value={formatUsd(flipSnap.netSaleProceeds)} />
            <MetricPill label="Net profit" value={formatUsd(flipSnap.netProfit)} emphasize />
          </Stack>
        ) : null}
      </StrategyPanelShell>
    </Stack>
  );
}

function MetricPill(props: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 0.85,
        py: 0.45,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        fontWeight: props.emphasize ? 700 : 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {props.label}: {props.value}
    </Typography>
  );
}
