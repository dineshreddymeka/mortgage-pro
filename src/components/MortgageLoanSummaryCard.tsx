import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import type { MonthlyBreakdown } from "../lib/mortgageMath";
import type { AppPersisted } from "../storage/mortgageState";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type PrepaySummary = {
  interestSaved: number;
  monthsSaved: number;
  payoffMo: number;
};

export type MortgageLoanSummaryCardProps = {
  state: AppPersisted;
  breakdown: MonthlyBreakdown;
  cashToClose: number;
  ltvPct: number;
  lifeInterest: number;
  lifePrincipal: number;
  extraPrincipalMonthly: number;
  prepaySummary: PrepaySummary | null;
};

function formatYearsMonthsFromMonths(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  if (m <= 0) return "—";
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y <= 0) return `${r} mo`;
  if (r === 0) return `${y} yr`;
  return `${y} yr ${r} mo`;
}

function StatTile({
  kicker,
  value,
  hint,
}: {
  kicker: string;
  value: string;
  hint?: string;
}) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: 0.75,
        height: "100%",
        borderRadius: 1.5,
        borderColor: "divider",
        bgcolor: "transparent",
        boxShadow: "none",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontSize: "0.6rem",
          color: "text.secondary",
          display: "block",
          mb: 0.15,
        }}
      >
        {kicker}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          fontSize: { xs: "0.95rem", sm: "1.05rem" },
          fontFamily: "var(--pp-font-display)",
          color: "text.primary",
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.15, lineHeight: 1.2, fontSize: "0.65rem" }}
        >
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}

function SectionTitle({ children, tightTop }: { children: ReactNode; tightTop?: boolean }) {
  return (
    <Typography
      variant="overline"
      sx={{
        display: "block",
        fontWeight: 700,
        letterSpacing: "0.07em",
        color: "text.secondary",
        mt: tightTop ? 0.25 : 0.75,
        mb: 0.25,
        fontSize: "0.6rem",
      }}
    >
      {children}
    </Typography>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      sx={(t) => ({
        py: 0.3,
        px: 0.35,
        mx: -0.35,
        borderRadius: 1,
        borderBottom: `1px solid ${alpha(t.palette.divider, 0.9)}`,
        "&:hover": { bgcolor: alpha(t.palette.secondary.main, t.palette.mode === "light" ? 0.06 : 0.1) },
      })}
    >
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2, fontSize: "0.75rem" }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          fontSize: "0.75rem",
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

export function MortgageLoanSummaryCard({
  state,
  breakdown,
  cashToClose,
  ltvPct,
  lifeInterest,
  lifePrincipal,
  extraPrincipalMonthly,
  prepaySummary,
}: MortgageLoanSummaryCardProps) {
  const hasLoan = breakdown.loanAmount > 0;

  return (
    <Card
      variant="outlined"
      elevation={0}
      sx={{
        borderRadius: 1.5,
        overflow: "hidden",
        borderColor: "divider",
        boxShadow: "none",
        bgcolor: "transparent",
      }}
    >
      <Box
        sx={{
          px: 1.25,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: "0.9rem" }}>
          Loan summary
        </Typography>
      </Box>

      <CardContent sx={{ pt: 1, pb: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
        <Grid container spacing={0.65}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatTile kicker="Loan" value={money.format(breakdown.loanAmount)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatTile
              kicker="P&amp;I / mo"
              value={hasLoan ? moneyDec.format(breakdown.principalAndInterest) : "—"}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatTile kicker="Cash to close" value={money.format(cashToClose)} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 0.65 }} />

        <SectionTitle tightTop>Purchase &amp; equity</SectionTitle>
        <Stack spacing={0}>
          <DetailRow
            label="Down payment"
            value={`${money.format(state.downPayment)} (${state.downPaymentPercent.toFixed(1)}%)`}
          />
          <DetailRow label="Cash to close" value={money.format(cashToClose)} />
        </Stack>

        {hasLoan ? (
          <>
            <SectionTitle>Loan terms</SectionTitle>
            <Stack spacing={0}>
              <DetailRow label="Term" value={`${state.termYears} years`} />
              <DetailRow label="LTV" value={`${ltvPct.toFixed(2)}%`} />
              <DetailRow label="Note rate" value={`${state.interestRateApr}% APR`} />
              <DetailRow
                label="PMI / mo"
                value={breakdown.pmi > 0.001 ? moneyDec.format(breakdown.pmi) : "$0.00"}
              />
            </Stack>

            <SectionTitle>Life of loan</SectionTitle>
            <Stack spacing={0}>
              <DetailRow label="Total interest" value={money.format(lifeInterest)} />
              <DetailRow label="Total principal" value={money.format(lifePrincipal)} />
            </Stack>

            {prepaySummary ? (
              <>
                <SectionTitle>Prepayment</SectionTitle>
                <Stack spacing={0}>
                  <DetailRow label="Extra principal" value={`${money.format(extraPrincipalMonthly)}/mo`} />
                  <DetailRow label="Payoff" value={formatYearsMonthsFromMonths(prepaySummary.payoffMo)} />
                  <DetailRow
                    label="Time saved"
                    value={
                      prepaySummary.monthsSaved > 0
                        ? `${prepaySummary.monthsSaved} mo`
                        : "Same length"
                    }
                  />
                  <DetailRow
                    label="Interest saved"
                    value={
                      prepaySummary.interestSaved > 0
                        ? money.format(prepaySummary.interestSaved)
                        : money.format(0)
                    }
                  />
                </Stack>
              </>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, lineHeight: 1.3 }}>
            Enter price and down payment to see loan terms.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
