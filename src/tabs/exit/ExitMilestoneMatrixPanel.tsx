import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import {
  FORM_CONTAINER_NAME,
  formContainerBreakpoints,
  minOperationalFontPx,
  touchTargetCoarsePx,
} from "../../layout/formLayout";
import type { ExitYearInvestment } from "../../lib/projectionEngine";
import type { RealWealthExitSnapshot } from "../../lib/whenToSellMath";
import {
  formatEquityMultipleDisplay,
  formatGainVsCashInPct,
  formatIrrDisplay,
  formatMoney,
  plusMoney,
  signedMoney,
} from "./exitFormat";
import {
  buildMilestoneMatrixRows,
  defaultSelectedMilestoneYear,
  isMilestoneActivationKey,
  outcomeChipLabel,
  outcomeChipTone,
  selectMilestoneDetail,
  type MilestoneMatrixRow,
} from "./exitMilestoneMatrix";

const opFont = `${minOperationalFontPx}px`;

function plTextColor(theme: Theme, n: number): string {
  if (n > 0) return theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
  if (n < 0) return theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;
  return theme.palette.text.secondary;
}

export type ExitMilestoneMatrixPanelProps = {
  wealthSnapshots: RealWealthExitSnapshot[];
  exitInvestments: ExitYearInvestment[];
  showUserTermColumn: boolean;
  userTermYears: number;
  hasCashIn: boolean;
};

function DetailPathTable(props: {
  row: MilestoneMatrixRow;
  showUserTermColumn: boolean;
  userTermYears: number;
}) {
  const { row: w, showUserTermColumn: showUser, userTermYears: ty } = props;
  const g30 = w.realWealthMade30;
  const g15 = w.realWealthMade15;
  const gUser = w.realWealthMadeUserTerm;

  const rentCellSx = (n: number) => (theme: Theme) => ({
    fontVariantNumeric: "tabular-nums" as const,
    py: 0.55,
    fontSize: opFont,
    bgcolor:
      n < 0 ? alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.1) : undefined,
    color:
      n < 0
        ? theme.palette.mode === "dark"
          ? theme.palette.warning.light
          : theme.palette.warning.dark
        : undefined,
  });

  const gainCellSx = (n: number) => (theme: Theme) => ({
    verticalAlign: "top" as const,
    pt: 0.7,
    pb: 0.45,
    px: 0.65,
    borderTop: "1px solid",
    borderColor: "divider",
    bgcolor:
      n > 0
        ? alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.1)
        : n < 0
          ? alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.16 : 0.08)
          : "transparent",
  });

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, borderBottom: "none", py: 0.3, fontSize: opFont }} />
          <TableCell align="right" sx={{ fontWeight: 600, py: 0.3, fontSize: opFont }}>
            30-yr
          </TableCell>
          <TableCell align="right" sx={{ fontWeight: 600, py: 0.3, fontSize: opFont }}>
            15-yr
          </TableCell>
          {showUser ? (
            <TableCell align="right" sx={{ fontWeight: 600, py: 0.3, fontSize: opFont }}>
              {ty}-yr
            </TableCell>
          ) : null}
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell sx={{ color: "text.secondary", borderBottom: "none", py: 0.35, fontSize: opFont }}>
            Net initial cash invested
          </TableCell>
          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
            {formatMoney(w.initialCashInvested)}
          </TableCell>
          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
            {formatMoney(w.initialCashInvested)}
          </TableCell>
          {showUser ? (
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
              {formatMoney(w.initialCashInvested)}
            </TableCell>
          ) : null}
        </TableRow>
        <TableRow>
          <TableCell sx={{ color: "text.secondary", borderBottom: "none", py: 0.35, fontSize: opFont }}>
            + Rent
          </TableCell>
          <TableCell align="right" sx={rentCellSx(w.cumulativeRentalCashFlow30)}>
            {plusMoney(w.cumulativeRentalCashFlow30)}
          </TableCell>
          <TableCell align="right" sx={rentCellSx(w.cumulativeRentalCashFlow15)}>
            {plusMoney(w.cumulativeRentalCashFlow15)}
          </TableCell>
          {showUser ? (
            <TableCell align="right" sx={rentCellSx(w.cumulativeRentalCashFlowUserTerm)}>
              {plusMoney(w.cumulativeRentalCashFlowUserTerm)}
            </TableCell>
          ) : null}
        </TableRow>
        <TableRow>
          <TableCell sx={{ color: "text.secondary", borderBottom: "none", py: 0.35, fontSize: opFont }}>
            + Sale
          </TableCell>
          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
            {plusMoney(w.netProceeds30)}
          </TableCell>
          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
            {plusMoney(w.netProceeds15)}
          </TableCell>
          {showUser ? (
            <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", py: 0.35, fontSize: opFont }}>
              {plusMoney(w.netProceedsUserTerm)}
            </TableCell>
          ) : null}
        </TableRow>
        <TableRow>
          <TableCell
            sx={{
              fontWeight: 700,
              pt: 0.4,
              borderTop: "1px solid",
              borderColor: "divider",
              fontSize: opFont,
            }}
          >
            = Gain
          </TableCell>
          <TableCell align="right" sx={gainCellSx(g30)}>
            <Stack alignItems="flex-end" spacing={0.05}>
              <Typography
                sx={(theme) => ({
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  fontVariantNumeric: "tabular-nums",
                  color: plTextColor(theme, g30),
                })}
              >
                {signedMoney(g30)}
              </Typography>
              <Typography
                variant="caption"
                sx={(theme) => ({
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: opFont,
                  color: plTextColor(theme, g30),
                })}
              >
                {formatGainVsCashInPct(g30, w.initialCashInvested)}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right" sx={gainCellSx(g15)}>
            <Stack alignItems="flex-end" spacing={0.05}>
              <Typography
                sx={(theme) => ({
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  fontVariantNumeric: "tabular-nums",
                  color: plTextColor(theme, g15),
                })}
              >
                {signedMoney(g15)}
              </Typography>
              <Typography
                variant="caption"
                sx={(theme) => ({
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  fontSize: opFont,
                  color: plTextColor(theme, g15),
                })}
              >
                {formatGainVsCashInPct(g15, w.initialCashInvested)}
              </Typography>
            </Stack>
          </TableCell>
          {showUser ? (
            <TableCell align="right" sx={gainCellSx(gUser)}>
              <Stack alignItems="flex-end" spacing={0.05}>
                <Typography
                  sx={(theme) => ({
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    fontVariantNumeric: "tabular-nums",
                    color: plTextColor(theme, gUser),
                  })}
                >
                  {signedMoney(gUser)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={(theme) => ({
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    fontSize: opFont,
                    color: plTextColor(theme, gUser),
                  })}
                >
                  {formatGainVsCashInPct(gUser, w.initialCashInvested)}
                </Typography>
              </Stack>
            </TableCell>
          ) : null}
        </TableRow>
      </TableBody>
    </Table>
  );
}

/** Milestone matrix + selected-year detail (replaces repeated cards; all values preserved). */
export function ExitMilestoneMatrixPanel({
  wealthSnapshots,
  exitInvestments,
  showUserTermColumn,
  userTermYears,
  hasCashIn,
}: ExitMilestoneMatrixPanelProps) {
  const rows = useMemo(
    () => buildMilestoneMatrixRows(wealthSnapshots, exitInvestments),
    [wealthSnapshots, exitInvestments]
  );
  const listId = useId();
  const detailId = useId();
  const cq = FORM_CONTAINER_NAME;
  const bp = formContainerBreakpoints;

  const [selectedYear, setSelectedYear] = useState<number | null>(() =>
    defaultSelectedMilestoneYear(rows.map((r) => r.year))
  );

  useEffect(() => {
    const years = rows.map((r) => r.year);
    if (!years.length) {
      setSelectedYear(null);
      return;
    }
    if (selectedYear == null || !years.includes(selectedYear)) {
      setSelectedYear(defaultSelectedMilestoneYear(years));
    }
  }, [rows, selectedYear]);

  const detail = selectMilestoneDetail(rows, selectedYear);

  function selectYear(year: number) {
    setSelectedYear(year);
  }

  function onRowKeyDown(year: number, e: KeyboardEvent) {
    if (!isMilestoneActivationKey(e.key)) return;
    e.preventDefault();
    selectYear(year);
  }

  const headCellSx = {
    fontWeight: 700,
    bgcolor: "background.paper",
    py: 0.55,
    fontSize: opFont,
  } as const;

  return (
    <Stack
      spacing={0.75}
      className="pp-fade-in"
      sx={{
        minHeight: 0,
        height: "100%",
        containerType: "inline-size",
        containerName: cq,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.35, display: "block", fontSize: opFont }}
      >
        Sale proceeds + cumulative rent − net initial cash invested · not annualized. Select a year for
        the full path breakdown.
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.5}>
        <Chip
          size="small"
          variant="outlined"
          color="success"
          label="Both gain"
          sx={{ fontWeight: 600, fontSize: opFont, height: 28 }}
        />
        <Chip
          size="small"
          variant="outlined"
          color="error"
          label="Both loss"
          sx={{ fontWeight: 600, fontSize: opFont, height: 28 }}
        />
        <Chip
          size="small"
          variant="outlined"
          color="warning"
          label="Mixed"
          sx={{ fontWeight: 600, fontSize: opFont, height: 28 }}
        />
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 0.85,
          alignItems: "stretch",
          minHeight: 0,
          flex: 1,
          gridTemplateColumns: "minmax(0, 1fr)",
          [`@container ${cq} (min-width: ${bp.threeCol}px)`]: {
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
          },
        }}
      >
        <TableContainer
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            overflowX: "auto",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            maxHeight: "100%",
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <Table
            size="small"
            stickyHeader
            aria-label="Exit milestone matrix"
            aria-describedby={detailId}
            sx={{ minWidth: 420 }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>Year</TableCell>
                <TableCell sx={headCellSx}>Outcome</TableCell>
                <TableCell align="right" sx={headCellSx}>
                  Gain 30
                </TableCell>
                <TableCell align="right" sx={headCellSx}>
                  Gain 15
                </TableCell>
                {showUserTermColumn ? (
                  <TableCell align="right" sx={headCellSx}>
                    Gain {userTermYears}y
                  </TableCell>
                ) : null}
                <TableCell align="right" sx={headCellSx}>
                  User-term IRR
                </TableCell>
                <TableCell align="right" sx={headCellSx}>
                  Equity ×
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const selected = row.year === selectedYear;
                const rowId = `${listId}-year-${row.year}`;
                return (
                  <TableRow
                    key={row.year}
                    id={rowId}
                    hover
                    selected={selected}
                    tabIndex={0}
                    aria-selected={selected}
                    aria-current={selected ? "true" : undefined}
                    aria-label={`Select exit year ${row.year}, ${outcomeChipLabel(row.outcome)}`}
                    onClick={() => selectYear(row.year)}
                    onKeyDown={(e) => onRowKeyDown(row.year, e)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                      "&:focus-visible": {
                        outline: "2px solid",
                        outlineColor: "primary.main",
                        outlineOffset: -2,
                      },
                      "& .MuiTableCell-root": {
                        fontSize: opFont,
                        minHeight: touchTargetCoarsePx,
                        py: 0,
                        height: touchTargetCoarsePx,
                        verticalAlign: "middle",
                      },
                      "@media (pointer: fine)": {
                        "& .MuiTableCell-root": {
                          minHeight: 36,
                          height: 36,
                        },
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: selected ? 700 : 500 }}>{row.year} yr</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={outcomeChipLabel(row.outcome)}
                        color={outcomeChipTone(row.outcome)}
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 24, fontSize: opFont }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={(theme) => ({
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        color: plTextColor(theme, row.realWealthMade30),
                      })}
                    >
                      {signedMoney(row.realWealthMade30)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={(theme) => ({
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        color: plTextColor(theme, row.realWealthMade15),
                      })}
                    >
                      {signedMoney(row.realWealthMade15)}
                    </TableCell>
                    {showUserTermColumn ? (
                      <TableCell
                        align="right"
                        sx={(theme) => ({
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 600,
                          color: plTextColor(theme, row.realWealthMadeUserTerm),
                        })}
                      >
                        {signedMoney(row.realWealthMadeUserTerm)}
                      </TableCell>
                    ) : null}
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                      title="Annualized IRR from projected monthly cash flows + sale proceeds (user loan term path)"
                    >
                      {hasCashIn ? formatIrrDisplay(row.irrAnnualPercent) : "—"}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                      title="(Cumulative projected cash + net sale) ÷ net initial cash invested"
                    >
                      {hasCashIn ? formatEquityMultipleDisplay(row.equityMultiple) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {detail ? (
          <Box
            id={detailId}
            role="region"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Year ${detail.year} detail`}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              px: 1,
              py: 0.75,
              minWidth: 0,
              borderLeftWidth: 3,
              borderLeftColor:
                detail.outcome === "bothGain"
                  ? "success.main"
                  : detail.outcome === "bothLoss"
                    ? "error.main"
                    : "warning.main",
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              gap={0.75}
              sx={{ mb: 0.45 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                Year {detail.year} detail
              </Typography>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontSize: opFont }}
                  >
                    User-term IRR
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
                    title="Annualized IRR from projected monthly cash flows + sale proceeds (user loan term path)"
                  >
                    {hasCashIn ? formatIrrDisplay(detail.irrAnnualPercent) : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontSize: opFont }}
                  >
                    Equity multiple
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
                  >
                    {hasCashIn ? formatEquityMultipleDisplay(detail.equityMultiple) : "—"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontSize: opFont }}
                  >
                    Est. value
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: opFont }}
                  >
                    {formatMoney(detail.futureHomeValue)}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
            {!hasCashIn ? (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: "block", mb: 0.35, fontSize: opFont }}
              >
                Add net initial cash on Upfront to compute IRR and equity multiple.
              </Typography>
            ) : null}
            <DetailPathTable
              row={detail}
              showUserTermColumn={showUserTermColumn}
              userTermYears={userTermYears}
            />
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
}
