import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { downloadAmortizationCsv } from "../lib/amortizationCsv";
import type { AmortizationRow } from "../lib/mortgageMath";
import { AmortizationTableCard } from "./AmortizationTableCard";

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Props = {
  schedule: AmortizationRow[];
  baselineSchedule?: AmortizationRow[] | null;
  totalInterest: number;
  totalPrincipal: number;
  homePrice: number;
  extraPrincipalMonthly?: number;
  embedded?: boolean;
};

function AmortizationMobileCards({ rows }: { rows: AmortizationRow[] }) {
  const preview = rows.slice(0, 24);
  return (
    <Stack spacing={0.65} sx={{ display: { xs: "flex", md: "none" } }}>
      {preview.map((r) => (
        <Box
          key={r.month}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            px: 1,
            py: 0.75,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            Month {r.month}
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 0.35 }}>
            <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
              Pay {money.format(r.payment)}
            </Typography>
            <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
              Prin {money.format(r.principal)}
            </Typography>
            <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
              Int {money.format(r.interest)}
            </Typography>
            <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              Bal {money.format(r.balance)}
            </Typography>
          </Stack>
        </Box>
      ))}
      {rows.length > preview.length ? (
        <Typography variant="caption" color="text.secondary" sx={{ px: 0.25 }}>
          Showing first {preview.length} of {rows.length} months — use the table on larger screens or download CSV
          for the full schedule.
        </Typography>
      ) : null}
    </Stack>
  );
}

/** Full monthly amortization with responsive table/cards and CSV export. */
export function AmortizationScheduleSection({
  schedule,
  baselineSchedule,
  totalInterest,
  totalPrincipal,
  homePrice,
  extraPrincipalMonthly = 0,
  embedded = true,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  if (schedule.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No loan balance — amortization schedule appears when there is financed principal.
      </Typography>
    );
  }

  const prepayNote =
    extraPrincipalMonthly > 0
      ? `Includes ${money.format(extraPrincipalMonthly)}/mo extra principal on top of scheduled P&I.`
      : undefined;

  const body = (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.75}>
        <Typography variant="caption" color="text.secondary">
          {schedule.length} months · P&I only
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          onClick={() =>
            downloadAmortizationCsv(
              schedule,
              "amortization-schedule.csv",
              extraPrincipalMonthly > 0 ? baselineSchedule : null
            )
          }
        >
          Download CSV
        </Button>
      </Stack>

      {isMobile ? (
        <AmortizationMobileCards rows={schedule} />
      ) : null}

      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <AmortizationTableCard
          rows={schedule}
          totalInterest={totalInterest}
          totalPrincipal={totalPrincipal}
          scheduleNote={prepayNote}
          estimatedHomeValueForEquity={homePrice > 0 ? homePrice : undefined}
          embedded={embedded}
        />
      </Box>
    </Stack>
  );

  if (embedded) return body;

  return (
    <Card>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
