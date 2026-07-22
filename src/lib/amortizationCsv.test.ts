import { describe, expect, it } from "vitest";
import {
  amortizationScheduleToCsv,
  buildAmortizationCsvRows,
} from "./amortizationCsv";
import {
  buildAmortizationSchedule,
  buildAmortizationScheduleWithExtraPrincipal,
} from "./mortgageMath";

describe("amortizationCsv", () => {
  it("buildAmortizationCsvRows maps schedule columns", () => {
    const schedule = buildAmortizationSchedule(120_000, 6, 30).slice(0, 3);
    const rows = buildAmortizationCsvRows(schedule);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      month: 1,
      remainingBalance: schedule[0]!.balance,
    });
    expect(rows[0]!.extraPrincipal).toBeNull();
  });

  it("includes extra principal column when baseline differs", () => {
    const baseline = buildAmortizationSchedule(120_000, 6, 30);
    const prepay = buildAmortizationScheduleWithExtraPrincipal(120_000, 6, 30, 200);
    const rows = buildAmortizationCsvRows(prepay, baseline);
    expect(rows[0]!.extraPrincipal).toBeGreaterThan(0);
    const csv = amortizationScheduleToCsv(prepay, baseline);
    expect(csv.split("\n")[0]).toContain("extra_principal");
  });

  it("amortizationScheduleToCsv emits header and rows", () => {
    const schedule = buildAmortizationSchedule(50_000, 5, 15).slice(0, 2);
    const csv = amortizationScheduleToCsv(schedule);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("month,payment,principal,interest,remaining_balance");
    expect(lines.length).toBe(3);
  });
});
