import type { AmortizationRow } from "./mortgageMath";

export type AmortizationCsvRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number | null;
  remainingBalance: number;
};

/** Build CSV rows; `baselineSchedule` enables an extra-principal column when prepaying. */
export function buildAmortizationCsvRows(
  schedule: AmortizationRow[],
  baselineSchedule?: AmortizationRow[] | null
): AmortizationCsvRow[] {
  const baseline = baselineSchedule ?? null;
  const hasExtra = baseline != null && baseline.length > 0 && baseline.length !== schedule.length;

  return schedule.map((row, idx) => {
    let extraPrincipal: number | null = null;
    if (hasExtra) {
      const basePrincipal = baseline[idx]?.principal ?? 0;
      extraPrincipal = Math.max(0, row.principal - basePrincipal);
    } else if (baseline != null) {
      extraPrincipal = 0;
    }
    return {
      month: row.month,
      payment: row.payment,
      principal: row.principal,
      interest: row.interest,
      extraPrincipal,
      remainingBalance: row.balance,
    };
  });
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Dependency-free CSV string for download. */
export function amortizationScheduleToCsv(
  schedule: AmortizationRow[],
  baselineSchedule?: AmortizationRow[] | null
): string {
  const rows = buildAmortizationCsvRows(schedule, baselineSchedule);
  const includeExtra = rows.some((r) => r.extraPrincipal != null);
  const header = includeExtra
    ? ["month", "payment", "principal", "interest", "extra_principal", "remaining_balance"]
    : ["month", "payment", "principal", "interest", "remaining_balance"];

  const lines = [header.join(",")];
  for (const r of rows) {
    const cells = includeExtra
      ? [
          r.month,
          r.payment.toFixed(2),
          r.principal.toFixed(2),
          r.interest.toFixed(2),
          (r.extraPrincipal ?? 0).toFixed(2),
          r.remainingBalance.toFixed(2),
        ]
      : [
          r.month,
          r.payment.toFixed(2),
          r.principal.toFixed(2),
          r.interest.toFixed(2),
          r.remainingBalance.toFixed(2),
        ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

export function downloadAmortizationCsv(
  schedule: AmortizationRow[],
  filename = "amortization-schedule.csv",
  baselineSchedule?: AmortizationRow[] | null
): void {
  if (schedule.length === 0) return;
  const csv = amortizationScheduleToCsv(schedule, baselineSchedule);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
