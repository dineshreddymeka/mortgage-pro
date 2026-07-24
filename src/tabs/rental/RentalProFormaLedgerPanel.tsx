import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo } from "react";
import {
  minOperationalFontPx,
  touchTargetCoarsePx,
  touchTargetFinePx,
} from "../../layout/formLayout";
import type { RentalAnalysis } from "../../lib/rentalMath";
import type { AppPersisted } from "../../storage/mortgageState";
import { RentalSummaryStat } from "./RentalFieldControls";
import {
  buildProFormaLedgerRows,
  computeExitYieldAdjusted,
  computeProFormaAdjusted,
  lineIncluded,
  patchIncludeMap,
  pctOfEgi,
  type LedgerNavTarget,
  type ProFormaLedgerRow,
} from "./rentalProFormaLedger";

const opFont = `${minOperationalFontPx}px`;

const moneyDec = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const stickyItemSx = {
  position: "sticky" as const,
  left: 0,
  zIndex: 2,
  bgcolor: "background.paper",
  borderRight: "1px solid",
  borderColor: "divider",
  minWidth: 160,
  maxWidth: 240,
};

const includeColSx = {
  width: 88,
  minWidth: 88,
  py: 0.5,
  verticalAlign: "bottom" as const,
  fontSize: opFont,
};

function navAriaLabel(row: ProFormaLedgerRow): string {
  if (row.navTarget === "financing") return `Edit ${row.label} on Financing tab`;
  if (row.navTarget === "overview") return `Jump to key metrics for ${row.label}`;
  if (row.navTarget === "vacancy") return `Jump to vacancy editor`;
  if (row.navTarget === "income") return `Jump to income editor for ${row.label}`;
  return `Jump to operating expense editor for ${row.label}`;
}

function ProFormaNavCell(props: {
  onGo: () => void;
  ariaLabel: string;
  children: ReactNode;
  sx?: object;
}) {
  const activate = () => props.onGo();

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activate();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      activate();
    }
  };

  return (
    <TableCell
      role="button"
      tabIndex={0}
      aria-label={props.ariaLabel}
      title={props.ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      sx={{
        cursor: "pointer",
        userSelect: "none",
        fontSize: opFont,
        ...stickyItemSx,
        "&:hover": { color: "primary.main" },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
          borderRadius: 0.5,
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </TableCell>
  );
}

function IncludeCheckbox(props: {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <Checkbox
      size="small"
      checked={props.checked}
      onChange={props.onToggle}
      inputProps={{ "aria-label": props.ariaLabel }}
      sx={{
        p: 0.5,
        minWidth: touchTargetFinePx,
        minHeight: touchTargetFinePx,
        "@media (pointer: coarse)": {
          minWidth: touchTargetCoarsePx,
          minHeight: touchTargetCoarsePx,
        },
      }}
    />
  );
}

export type RentalProFormaLedgerPanelProps = {
  state: AppPersisted;
  patch: (partial: Partial<AppPersisted>) => void;
  rental: RentalAnalysis;
  onGoToFinancing?: () => void;
};

function displayAmount(row: ProFormaLedgerRow, pfAdj: ReturnType<typeof computeProFormaAdjusted>): number {
  if (row.kind === "noi") return pfAdj.noiAdj;
  if (row.kind === "cashflow") return pfAdj.cfAdj;
  return row.amountMonthly;
}

function rowIncludedInProForma(
  row: ProFormaLedgerRow,
  pfAdj: ReturnType<typeof computeProFormaAdjusted>,
  pfToggles: Record<string, boolean>
): boolean {
  if (!row.showIncludeToggles) return true;
  if (row.kind === "pi") return pfAdj.piIn;
  if (row.kind === "pmi") return pfAdj.pmiIn;
  return lineIncluded(pfToggles, row.id);
}

function rowIncludedInExitYield(
  row: ProFormaLedgerRow,
  yieldAdj: ReturnType<typeof computeExitYieldAdjusted>,
  yieldToggles: Record<string, boolean> | undefined
): boolean {
  if (!row.showIncludeToggles) return true;
  if (row.kind === "pi") return yieldAdj.piIn;
  if (row.kind === "pmi") return yieldAdj.pmiIn;
  return lineIncluded(yieldToggles, row.id);
}

/** Unified pro-forma ledger with independent Pro forma and Exit yield inclusion columns. */
export function RentalProFormaLedgerPanel({
  state,
  patch,
  rental: r,
  onGoToFinancing,
}: RentalProFormaLedgerPanelProps) {
  const egi = r.effectiveGrossIncomeMonthly;
  const pfToggles = useMemo(() => state.rentalProFormaInclude ?? {}, [state.rentalProFormaInclude]);
  const yieldToggles = state.sellRentalYieldInclude;

  const pfAdj = useMemo(() => computeProFormaAdjusted(r, pfToggles), [pfToggles, r]);
  const yieldAdj = useMemo(() => computeExitYieldAdjusted(r, yieldToggles), [r, yieldToggles]);
  const rows = useMemo(
    () => buildProFormaLedgerRows(r, state.vacancyRatePercent),
    [r, state.vacancyRatePercent]
  );

  const setPfIncluded = useCallback(
    (id: string, on: boolean) => {
      patch({ rentalProFormaInclude: patchIncludeMap(state.rentalProFormaInclude, id, on) });
    },
    [patch, state.rentalProFormaInclude]
  );

  const setYieldIncluded = useCallback(
    (id: string, on: boolean) => {
      patch({ sellRentalYieldInclude: patchIncludeMap(state.sellRentalYieldInclude, id, on) });
    },
    [patch, state.sellRentalYieldInclude]
  );

  const goTo = useCallback(
    (target: LedgerNavTarget, opexAnchorId?: string) => {
      if (target === "financing") {
        onGoToFinancing?.();
        return;
      }
      const id =
        target === "income"
          ? "rental-edit-income"
          : target === "vacancy"
            ? "rental-edit-vacancy"
            : target === "overview"
              ? "rental-metrics-row"
              : (opexAnchorId ?? "rental-edit-carrying");
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [onGoToFinancing]
  );

  const restoreBtnSx = {
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
  } as const;

  return (
    <Stack spacing={0.75}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={0.75}
        alignItems={{ sm: "flex-end" }}
        justifyContent="space-between"
        sx={{ width: "100%", gap: 0.75 }}
      >
        <Stack spacing={0.15} sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.9375rem" }}>
            Monthly pro-forma ledger
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: opFont }}>
            One sequence · Pro forma vs Exit yield inclusion (independent maps) · click item to jump
          </Typography>
        </Stack>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.1} sx={{ flexShrink: 0 }}>
          <RentalSummaryStat label="Pro forma CF" value={moneyDec.format(pfAdj.cfAdj)} emphasize />
          <RentalSummaryStat label="Exit yield CF" value={moneyDec.format(yieldAdj.cfAdj)} />
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: opFont }}>
          Income → EGI → OpEx → NOI → debt → cash flow (% of EGI uses Pro forma inclusion)
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25}>
          {pfAdj.hasExclusion ? (
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={() => patch({ rentalProFormaInclude: undefined })}
              aria-label="Restore all pro-forma inclusion lines"
              sx={restoreBtnSx}
            >
              Restore Pro forma lines
            </Typography>
          ) : null}
          {yieldAdj.hasExclusion ? (
            <Typography
              component="button"
              type="button"
              variant="caption"
              onClick={() => patch({ sellRentalYieldInclude: undefined })}
              aria-label="Restore all exit yield inclusion lines"
              sx={restoreBtnSx}
            >
              Restore Exit yield lines
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <TableContainer sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table
          size="small"
          aria-label="Monthly pro-forma ledger with pro forma and exit yield inclusion"
          sx={{ minWidth: 560, "& .MuiTableCell-root": { fontSize: opFont } }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                component="th"
                scope="col"
                sx={{
                  ...stickyItemSx,
                  zIndex: 3,
                  py: 0.75,
                  fontWeight: 700,
                  fontSize: opFont,
                }}
              >
                Item
              </TableCell>
              <TableCell
                component="th"
                scope="col"
                align="center"
                sx={includeColSx}
                aria-label="Pro forma inclusion"
              >
                <Tooltip
                  title="Pro forma inclusion (rentalProFormaInclude) — affects NOI and cash flow on this tab"
                  enterDelay={400}
                >
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ fontWeight: 700, display: "block", lineHeight: 1.2, fontSize: opFont }}
                  >
                    Pro forma
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontWeight: 500, fontSize: opFont, mt: 0.15 }}
                    >
                      include
                    </Typography>
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell
                component="th"
                scope="col"
                align="center"
                sx={includeColSx}
                aria-label="Exit yield inclusion"
              >
                <Tooltip
                  title="Exit yield inclusion (sellRentalYieldInclude) — affects When to sell gain cash flow"
                  enterDelay={400}
                >
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{ fontWeight: 700, display: "block", lineHeight: 1.2, fontSize: opFont }}
                  >
                    Exit yield
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontWeight: 500, fontSize: opFont, mt: 0.15 }}
                    >
                      include
                    </Typography>
                  </Typography>
                </Tooltip>
              </TableCell>
              <TableCell
                component="th"
                scope="col"
                align="right"
                sx={{ py: 0.75, width: 104, fontWeight: 700, fontSize: opFont }}
              >
                $ / mo
              </TableCell>
              <TableCell
                component="th"
                scope="col"
                align="right"
                sx={{ py: 0.75, width: 80, fontWeight: 700, fontSize: opFont }}
              >
                % of EGI
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const pfOn = rowIncludedInProForma(row, pfAdj, pfToggles);
              const yieldOn = rowIncludedInExitYield(row, yieldAdj, yieldToggles);
              const amount = displayAmount(row, pfAdj);
              const dimmed = row.showIncludeToggles && !pfOn;
              const fontWeight =
                row.kind === "egi" || row.kind === "noi" ? 600 : row.kind === "cashflow" ? 700 : undefined;

              return (
                <TableRow
                  key={row.id}
                  sx={{
                    opacity: dimmed ? 0.55 : 1,
                    bgcolor: dimmed ? "action.hover" : undefined,
                    "& .MuiTableCell-root": {
                      bgcolor: dimmed ? "action.hover" : "background.paper",
                    },
                  }}
                >
                  <ProFormaNavCell
                    onGo={() => goTo(row.navTarget, row.opexAnchorId)}
                    ariaLabel={navAriaLabel(row)}
                    sx={{
                      pl:
                        row.kind === "opex" ||
                        row.kind === "vacancy" ||
                        row.kind === "pi" ||
                        row.kind === "pmi"
                          ? 1.25
                          : 1,
                      py: 0.5,
                      fontWeight,
                      color: row.kind === "vacancy" ? "text.secondary" : undefined,
                    }}
                  >
                    {row.label}
                    {row.detail ? (
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.3, fontSize: opFont }}
                      >
                        {row.detail}
                      </Typography>
                    ) : null}
                    {row.kind === "noi" && pfAdj.opexPartial ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.25, fontSize: opFont }}
                      >
                        Uses checked operating costs only (Pro forma)
                      </Typography>
                    ) : null}
                    {row.kind === "pi" && !pfAdj.piIn ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.25, fontSize: opFont }}
                      >
                        Unchecked → pro-forma cash flow ignores loan payment here
                      </Typography>
                    ) : null}
                  </ProFormaNavCell>
                  <TableCell padding="checkbox" align="center" sx={{ py: 0.35, verticalAlign: "middle" }}>
                    {row.showIncludeToggles ? (
                      <IncludeCheckbox
                        checked={pfOn}
                        onToggle={() => setPfIncluded(row.id, !pfOn)}
                        ariaLabel={`Include ${row.label} in pro-forma NOI and cash flow`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell padding="checkbox" align="center" sx={{ py: 0.35, verticalAlign: "middle" }}>
                    {row.showIncludeToggles ? (
                      <IncludeCheckbox
                        checked={yieldOn}
                        onToggle={() => setYieldIncluded(row.id, !yieldOn)}
                        ariaLabel={`Include ${row.label} in exit yield cash flow`}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      py: 0.5,
                      fontWeight,
                      verticalAlign: row.detail ? "top" : undefined,
                      color:
                        row.kind === "cashflow"
                          ? pfAdj.cfAdj >= 0
                            ? "success.main"
                            : "error.main"
                          : undefined,
                    }}
                  >
                    {row.isDeduction ? `−${moneyDec.format(amount)}` : moneyDec.format(amount)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: "tabular-nums",
                      py: 0.5,
                      color: "text.secondary",
                      fontWeight,
                    }}
                  >
                    {row.showIncludeToggles && !pfOn ? "—" : pctOfEgi(amount, egi)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
