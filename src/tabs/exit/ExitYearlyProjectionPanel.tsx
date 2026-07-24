import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { minOperationalFontPx } from "../../layout/formLayout";
import type { SellYearRow } from "../../lib/whenToSellMath";
import { formatGainVsCashInPct, formatMoney, signedMoney } from "./exitFormat";
import {
  DEFAULT_PROJECTION_PAGE_SIZE,
  initialProjectionPageIndex,
  normalizeProjectionTermMode,
  paginateProjectionRows,
  projectionEmptyMessage,
  projectionTermColumns,
  type ProjectionTermMode,
} from "./exitProjectionTable";

const opFont = `${minOperationalFontPx}px`;

function plTextColor(theme: Theme, n: number): string {
  if (n > 0) return theme.palette.mode === "dark" ? theme.palette.success.light : theme.palette.success.dark;
  if (n < 0) return theme.palette.mode === "dark" ? theme.palette.error.light : theme.palette.error.dark;
  return theme.palette.text.secondary;
}

function saleProceedsCellSx(n: number) {
  return (theme: Theme) => {
    const strong = theme.palette.mode === "dark" ? 0.14 : 0.09;
    if (n <= 0)
      return {
        fontVariantNumeric: "tabular-nums" as const,
        fontWeight: 600,
        fontSize: opFont,
        bgcolor: alpha(theme.palette.error.main, strong),
        color: plTextColor(theme, -1),
      };
    return {
      fontVariantNumeric: "tabular-nums" as const,
      fontWeight: 600,
      fontSize: opFont,
      bgcolor: alpha(theme.palette.success.main, strong),
      color: plTextColor(theme, 1),
    };
  };
}

export type ExitYearlyProjectionPanelProps = {
  rows: SellYearRow[];
  cumulativeRentByExitYear: {
    path30: number[];
    path15: number[];
    pathUserTerm: number[];
  };
  initialCashInvested: number;
  exitHorizonYears: number;
  showUserTermColumn: boolean;
  appreciationPct: number;
  sellingCostPct: number;
};

/** Year-by-year equity path with page + term-column controls (avoids nested mega-scroll). */
export function ExitYearlyProjectionPanel({
  rows,
  cumulativeRentByExitYear,
  initialCashInvested,
  exitHorizonYears,
  showUserTermColumn,
  appreciationPct,
  sellingCostPct,
}: ExitYearlyProjectionPanelProps) {
  const [pageIndex, setPageIndex] = useState(() =>
    initialProjectionPageIndex(rows, exitHorizonYears, DEFAULT_PROJECTION_PAGE_SIZE)
  );
  const [userPaged, setUserPaged] = useState(false);
  const [termMode, setTermMode] = useState<ProjectionTermMode>("compare");

  const mode = normalizeProjectionTermMode(termMode, showUserTermColumn);
  const termCols = useMemo(
    () => projectionTermColumns(mode, exitHorizonYears, showUserTermColumn),
    [mode, exitHorizonYears, showUserTermColumn]
  );

  const page = useMemo(
    () => paginateProjectionRows(rows, pageIndex, DEFAULT_PROJECTION_PAGE_SIZE),
    [rows, pageIndex]
  );

  useEffect(() => {
    if (userPaged) {
      if (pageIndex !== page.pageIndex) setPageIndex(page.pageIndex);
      return;
    }
    const next = initialProjectionPageIndex(rows, exitHorizonYears, DEFAULT_PROJECTION_PAGE_SIZE);
    if (next !== pageIndex) setPageIndex(next);
  }, [rows, exitHorizonYears, userPaged, page.pageIndex, pageIndex]);

  useEffect(() => {
    if (!showUserTermColumn && termMode === "user") setTermMode("compare");
  }, [showUserTermColumn, termMode]);

  const emptyMessage = projectionEmptyMessage(rows.length);
  const headCellSx = {
    fontWeight: 700,
    bgcolor: "background.paper",
    py: 0.55,
    fontSize: opFont,
  } as const;

  return (
    <Stack spacing={0.7} className="pp-fade-in" sx={{ minHeight: 0, height: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.6}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, fontSize: opFont }}
        >
          {emptyMessage
            ? emptyMessage
            : `${appreciationPct}%/yr · ${sellingCostPct}% sale close · years ${page.startYear}–${page.endYear} of ${rows.length}`}
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.65} alignItems="center">
          <ButtonGroup size="small" variant="outlined" aria-label="Projection term columns">
            <Button
              onClick={() => setTermMode("compare")}
              variant={mode === "compare" ? "contained" : "outlined"}
              sx={{ fontSize: opFont }}
            >
              Compare
            </Button>
            <Button
              onClick={() => setTermMode("30")}
              variant={mode === "30" ? "contained" : "outlined"}
              sx={{ fontSize: opFont }}
            >
              30
            </Button>
            <Button
              onClick={() => setTermMode("15")}
              variant={mode === "15" ? "contained" : "outlined"}
              sx={{ fontSize: opFont }}
            >
              15
            </Button>
            {showUserTermColumn ? (
              <Button
                onClick={() => setTermMode("user")}
                variant={mode === "user" ? "contained" : "outlined"}
                sx={{ fontSize: opFont }}
              >
                {exitHorizonYears}y
              </Button>
            ) : null}
          </ButtonGroup>
          <ButtonGroup size="small" variant="outlined" aria-label="Projection page">
            <Button
              disabled={!!emptyMessage || page.pageIndex <= 0}
              onClick={() => {
                setUserPaged(true);
                setPageIndex((p) => Math.max(0, p - 1));
              }}
              sx={{ fontSize: opFont }}
            >
              Prev
            </Button>
            <Button disabled sx={{ pointerEvents: "none", minWidth: 72, fontSize: opFont }}>
              {emptyMessage ? "—" : `${page.pageIndex + 1}/${page.pageCount}`}
            </Button>
            <Button
              disabled={!!emptyMessage || page.pageIndex >= page.pageCount - 1}
              onClick={() => {
                setUserPaged(true);
                setPageIndex((p) => Math.min(page.pageCount - 1, p + 1));
              }}
              sx={{ fontSize: opFont }}
            >
              Next
            </Button>
          </ButtonGroup>
        </Stack>
      </Stack>

      {emptyMessage ? (
        <Box
          role="status"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            px: 1.25,
            py: 2,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: opFont }}>
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <TableContainer
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: mode === "compare" ? 480 : 360 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headCellSx}>Year</TableCell>
                <TableCell align="right" sx={headCellSx}>
                  Est. value
                </TableCell>
                {termCols.map((col) => (
                  <TableCell key={`net-${col.id}`} align="right" sx={headCellSx}>
                    Net {col.label.replace("-yr", "")}
                  </TableCell>
                ))}
                {termCols.map((col) => (
                  <TableCell key={`gain-${col.id}`} align="right" sx={headCellSx}>
                    Gain {col.label.replace("-yr", "")}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {page.rows.map((r) => {
                const hi = r.year === exitHorizonYears;
                const gainY30 =
                  r.netProceeds30 + cumulativeRentByExitYear.path30[r.year] - initialCashInvested;
                const gainY15 =
                  r.netProceeds15 + cumulativeRentByExitYear.path15[r.year] - initialCashInvested;
                const gainYUser =
                  r.netProceedsUserTerm +
                  cumulativeRentByExitYear.pathUserTerm[r.year] -
                  initialCashInvested;

                const netById = {
                  "30": r.netProceeds30,
                  "15": r.netProceeds15,
                  user: r.netProceedsUserTerm,
                } as const;
                const gainById = {
                  "30": gainY30,
                  "15": gainY15,
                  user: gainYUser,
                } as const;

                return (
                  <TableRow
                    key={r.year}
                    sx={(theme) => ({
                      bgcolor: hi
                        ? alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.14 : 0.1)
                        : undefined,
                      boxShadow: hi ? `inset 3px 0 0 ${theme.palette.secondary.main}` : undefined,
                    })}
                  >
                    <TableCell sx={{ fontWeight: hi ? 700 : 400, py: 0.4, fontSize: opFont }}>
                      {r.year}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums", py: 0.4, fontSize: opFont }}
                    >
                      {formatMoney(r.futureHomeValue)}
                    </TableCell>
                    {termCols.map((col) => (
                      <TableCell
                        key={`net-${r.year}-${col.id}`}
                        align="right"
                        sx={(theme) => ({ ...saleProceedsCellSx(netById[col.id])(theme), py: 0.4 })}
                      >
                        {formatMoney(netById[col.id])}
                      </TableCell>
                    ))}
                    {termCols.map((col) => {
                      const gain = gainById[col.id];
                      return (
                        <TableCell
                          key={`gain-${r.year}-${col.id}`}
                          align="right"
                          sx={{ verticalAlign: "top", py: 0.3 }}
                        >
                          <Stack alignItems="flex-end" spacing={0}>
                            <Typography
                              variant="body2"
                              sx={(theme) => ({
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                                fontSize: opFont,
                                color: plTextColor(theme, gain),
                              })}
                            >
                              {signedMoney(gain)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={(theme) => ({
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                                lineHeight: 1.1,
                                fontSize: opFont,
                                color: plTextColor(theme, gain),
                              })}
                            >
                              {formatGainVsCashInPct(gain, initialCashInvested)}
                            </Typography>
                          </Stack>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.35, fontSize: opFont }}
        >
          Highlight = Mortgage term ({exitHorizonYears} yr). Net = value − payoff − {sellingCostPct}%
          close. Gain adds cumulative rent (after payoff: EGI only). % vs net initial cash invested.
        </Typography>
      </Box>
    </Stack>
  );
}
