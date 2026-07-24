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
import { useEffect, useMemo, useState } from "react";
import { minOperationalFontPx } from "../../layout/formLayout";
import type { RealWealthExitSnapshot } from "../../lib/whenToSellMath";
import { formatMoney } from "./exitFormat";
import {
  normalizeProjectionTermMode,
  projectionTermColumns,
  type ProjectionTermMode,
} from "./exitProjectionTable";

const opFont = `${minOperationalFontPx}px`;

export type ExitAmortizationPanelProps = {
  wealthSnapshots: RealWealthExitSnapshot[];
  showUserTermColumn: boolean;
  userTermYears: number;
};

/** Interest & principal through exit milestones with term-column selection. */
export function ExitAmortizationPanel({
  wealthSnapshots,
  showUserTermColumn,
  userTermYears,
}: ExitAmortizationPanelProps) {
  const [termMode, setTermMode] = useState<ProjectionTermMode>("compare");
  const mode = normalizeProjectionTermMode(termMode, showUserTermColumn);
  const termCols = useMemo(
    () => projectionTermColumns(mode, userTermYears, showUserTermColumn),
    [mode, userTermYears, showUserTermColumn]
  );

  useEffect(() => {
    if (!showUserTermColumn && termMode === "user") setTermMode("compare");
  }, [showUserTermColumn, termMode]);

  const headCellSx = {
    fontWeight: 700,
    bgcolor: "background.paper",
    fontSize: opFont,
  } as const;

  return (
    <Stack spacing={0.7} className="pp-fade-in" sx={{ minHeight: 0, height: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.55}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.35, fontSize: opFont }}
        >
          Not extra subtractions — interest is already inside the rent line via the mortgage payment.
        </Typography>
        <ButtonGroup size="small" variant="outlined" aria-label="Amortization term columns">
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
              {userTermYears}y
            </Button>
          ) : null}
        </ButtonGroup>
      </Stack>

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1.5,
          overflowX: "auto",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: mode === "compare" ? 420 : 280 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headCellSx}>Sell after</TableCell>
              {termCols.map((col) => (
                <TableCell key={`int-${col.id}`} align="right" sx={headCellSx}>
                  Interest ({col.label})
                </TableCell>
              ))}
              {termCols.map((col) => (
                <TableCell key={`prin-${col.id}`} align="right" sx={headCellSx}>
                  Principal ({col.label})
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {wealthSnapshots.map((w) => {
              const interestById = {
                "30": w.interestToBank30,
                "15": w.interestToBank15,
                user: w.interestToBankUserTerm,
              } as const;
              const principalById = {
                "30": w.principalPaidIntoLoan30,
                "15": w.principalPaidIntoLoan15,
                user: w.principalPaidIntoLoanUserTerm,
              } as const;
              return (
                <TableRow key={w.year}>
                  <TableCell sx={{ fontSize: opFont }}>{w.year} yr</TableCell>
                  {termCols.map((col) => (
                    <TableCell
                      key={`int-${w.year}-${col.id}`}
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums", fontSize: opFont }}
                    >
                      {formatMoney(interestById[col.id])}
                    </TableCell>
                  ))}
                  {termCols.map((col) => (
                    <TableCell
                      key={`prin-${w.year}-${col.id}`}
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums", fontSize: opFont }}
                    >
                      {formatMoney(principalById[col.id])}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
