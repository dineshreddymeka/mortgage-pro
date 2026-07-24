import { describe, expect, it } from "vitest";
import type { ExitYearInvestment } from "../../lib/projectionEngine";
import type { RealWealthExitSnapshot } from "../../lib/whenToSellMath";
import {
  buildMilestoneMatrixRows,
  defaultSelectedMilestoneYear,
  isMilestoneActivationKey,
  milestoneOutcome,
  outcomeChipLabel,
  selectMilestoneDetail,
} from "./exitMilestoneMatrix";

function snapshot(partial: Partial<RealWealthExitSnapshot> & { year: number }): RealWealthExitSnapshot {
  return {
    year: partial.year,
    initialCashInvested: partial.initialCashInvested ?? 50_000,
    interestToBank30: partial.interestToBank30 ?? 10_000,
    interestToBank15: partial.interestToBank15 ?? 8_000,
    interestToBankUserTerm: partial.interestToBankUserTerm ?? 9_000,
    principalPaidIntoLoan30: partial.principalPaidIntoLoan30 ?? 5_000,
    principalPaidIntoLoan15: partial.principalPaidIntoLoan15 ?? 12_000,
    principalPaidIntoLoanUserTerm: partial.principalPaidIntoLoanUserTerm ?? 7_000,
    cumulativeRentalCashFlow30: partial.cumulativeRentalCashFlow30 ?? 3_000,
    cumulativeRentalCashFlow15: partial.cumulativeRentalCashFlow15 ?? 4_000,
    cumulativeRentalCashFlowUserTerm: partial.cumulativeRentalCashFlowUserTerm ?? 3_500,
    futureHomeValue: partial.futureHomeValue ?? 400_000,
    netProceeds30: partial.netProceeds30 ?? 80_000,
    netProceeds15: partial.netProceeds15 ?? 90_000,
    netProceedsUserTerm: partial.netProceedsUserTerm ?? 85_000,
    realWealthMade30: partial.realWealthMade30 ?? 33_000,
    realWealthMade15: partial.realWealthMade15 ?? 44_000,
    realWealthMadeUserTerm: partial.realWealthMadeUserTerm ?? 38_500,
  };
}

describe("exitMilestoneMatrix", () => {
  it("classifies both-gain, both-loss, and mixed outcomes", () => {
    expect(milestoneOutcome(10, 5)).toBe("bothGain");
    expect(milestoneOutcome(0, 0)).toBe("bothGain");
    expect(milestoneOutcome(-1, -2)).toBe("bothLoss");
    expect(milestoneOutcome(10, -1)).toBe("mixed");
    expect(outcomeChipLabel("mixed")).toBe("Mixed outcome");
  });

  it("preserves every snapshot field and attaches investment metrics", () => {
    const snaps = [
      snapshot({ year: 3, realWealthMade30: -1_000, realWealthMade15: 2_000 }),
      snapshot({ year: 5, initialCashInvested: 60_000 }),
    ];
    const investments: ExitYearInvestment[] = [
      {
        year: 5,
        exitMonth: 60,
        netProceeds: 100_000,
        cumulativeCashFlow: 12_000,
        irrAnnualPercent: 8.25,
        equityMultiple: 1.45,
      },
    ];

    const rows = buildMilestoneMatrixRows(snaps, investments);
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      year: 3,
      outcome: "mixed",
      interestToBank30: 10_000,
      principalPaidIntoLoan15: 12_000,
      cumulativeRentalCashFlowUserTerm: 3_500,
      netProceeds30: 80_000,
      realWealthMade30: -1_000,
      irrAnnualPercent: null,
      equityMultiple: null,
    });

    expect(rows[1]).toMatchObject({
      year: 5,
      outcome: "bothGain",
      initialCashInvested: 60_000,
      irrAnnualPercent: 8.25,
      equityMultiple: 1.45,
      futureHomeValue: 400_000,
    });
  });

  it("selects detail by year and defaults to year 5 when present", () => {
    const rows = buildMilestoneMatrixRows(
      [snapshot({ year: 3 }), snapshot({ year: 5 }), snapshot({ year: 7 })],
      []
    );
    expect(defaultSelectedMilestoneYear(rows.map((r) => r.year))).toBe(5);
    expect(selectMilestoneDetail(rows, 7)?.year).toBe(7);
    expect(selectMilestoneDetail(rows, 99)?.year).toBe(3);
    expect(selectMilestoneDetail([], 5)).toBeNull();
    expect(defaultSelectedMilestoneYear([])).toBeNull();
    expect(defaultSelectedMilestoneYear([3, 7])).toBe(3);
  });

  it("treats Enter and Space as milestone activation keys", () => {
    expect(isMilestoneActivationKey("Enter")).toBe(true);
    expect(isMilestoneActivationKey(" ")).toBe(true);
    expect(isMilestoneActivationKey("Spacebar")).toBe(false);
    expect(isMilestoneActivationKey("Tab")).toBe(false);
    expect(isMilestoneActivationKey("a")).toBe(false);
  });
});
