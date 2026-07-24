import { Grid2 as Grid, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import type { AppPersisted } from "../storage/mortgageState";
import { canonicalFromStr, defaultStrIncome, patchRentalIncome } from "../lib/resolveRentalIncome";
import { formatUsd, parsePercentInput, parseUsdInput, StrategyPanelShell } from "./StrategyPanelShell";

function formatField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

export function StrIncomePanel({
  state,
  patch,
}: {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
}) {
  const str = state.rentalIncome?.str ?? defaultStrIncome();
  const populated =
    str.nightlyRate > 0 ||
    str.nightsBookedPerMonth > 0 ||
    str.cleaningFeePerStay > 0 ||
    str.staysPerMonth > 0 ||
    (str.otherMonthlyIncome ?? 0) > 0;
  const snapshot = populated ? canonicalFromStr(str).strSnapshot : null;

  const updateStr = (partial: Partial<typeof str>) => {
    const next = { ...str, ...partial };
    patch(
      patchRentalIncome(state, () => ({
        mode: "str",
        str: next,
      }))
    );
  };

  return (
    <StrategyPanelShell
      title="Short-term rental"
      description={
        snapshot ? (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
            EGI {formatUsd(snapshot.effectiveGrossIncomeMonthly, true)} · platform −{formatUsd(snapshot.platformFees, true)} ·
            vacancy −{formatUsd(snapshot.vacancyLoss, true)}
          </Typography>
        ) : undefined
      }
      emptyHint="Enter nightly rate or booked nights to model STR income through the same rental pipeline."
      populated={populated}
    >
      <Stack spacing={1}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nightly rate"
              size="small"
              fullWidth
              value={formatField(str.nightlyRate)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                updateStr({ nightlyRate: Math.max(0, n) });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Nights booked / mo"
              size="small"
              fullWidth
              value={formatField(str.nightsBookedPerMonth)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                updateStr({ nightsBookedPerMonth: Math.max(0, Math.min(31, Math.round(n))) });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Cleaning fee / stay"
              size="small"
              fullWidth
              value={formatField(str.cleaningFeePerStay)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                updateStr({ cleaningFeePerStay: Math.max(0, n) });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Stays / mo"
              size="small"
              fullWidth
              value={formatField(str.staysPerMonth)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                updateStr({ staysPerMonth: Math.max(0, Math.round(n)) });
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Platform fee"
              size="small"
              fullWidth
              value={formatField(str.platformFeePercent ?? 3)}
              onChange={(e) => {
                const n = parsePercentInput(e.target.value);
                if (n == null) return;
                updateStr({ platformFeePercent: Math.min(100, Math.max(0, n)) });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Other income"
              size="small"
              fullWidth
              value={formatField(str.otherMonthlyIncome ?? 0)}
              onChange={(e) => {
                const n = parseUsdInput(e.target.value);
                if (n == null) return;
                updateStr({ otherMonthlyIncome: Math.max(0, n) });
              }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              label="Vacancy"
              size="small"
              fullWidth
              value={formatField(str.vacancyRatePercent ?? 5)}
              onChange={(e) => {
                const n = parsePercentInput(e.target.value);
                if (n == null) return;
                updateStr({ vacancyRatePercent: Math.min(100, Math.max(0, n)) });
              }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
            />
          </Grid>
        </Grid>
        {snapshot ? (
          <Typography variant="caption" color="text.secondary">
            Synced canonical rent {formatUsd(canonicalFromStr(str).monthlyRent, true)}/mo · effective vacancy{" "}
            {canonicalFromStr(str).vacancyRatePercent.toFixed(1)}%
          </Typography>
        ) : null}
      </Stack>
    </StrategyPanelShell>
  );
}
