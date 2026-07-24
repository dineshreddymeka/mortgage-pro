import {
  comparisonMetricValue,
  isBetterMetric,
  type ComparisonMetricKey,
  type HouseComparisonRow,
} from "../lib/houseComparison";

export type CompareMetricGroupId = "acquisition" | "operations" | "investor";

export type CompareMetricDef = {
  key: ComparisonMetricKey;
  label: string;
  group: CompareMetricGroupId;
  format: (row: HouseComparisonRow) => string;
};

export const COMPARE_METRIC_GROUP_LABELS: Record<CompareMetricGroupId, string> = {
  acquisition: "Acquisition",
  operations: "Operations",
  investor: "Investor",
};

/** All houses tied for the best value (empty when fewer than 2 eligible or all equal overall). */
export function bestHouseIdsForMetric(
  rows: HouseComparisonRow[],
  key: ComparisonMetricKey
): string[] {
  const eligible = rows.filter((r) => comparisonMetricValue(r, key) != null);
  if (eligible.length < 2) return [];

  let best = eligible[0]!;
  for (const row of eligible.slice(1)) {
    const value = comparisonMetricValue(row, key)!;
    const bestValue = comparisonMetricValue(best, key)!;
    if (isBetterMetric(key, value, bestValue)) best = row;
  }

  const bestValue = comparisonMetricValue(best, key)!;
  const allSame = eligible.every((r) => {
    const v = comparisonMetricValue(r, key)!;
    return Math.abs(v - bestValue) < 1e-9;
  });
  if (allSame) return [];

  return eligible
    .filter((r) => Math.abs(comparisonMetricValue(r, key)! - bestValue) < 1e-9)
    .map((r) => r.id);
}

export function scoreHouseBestCount(
  row: HouseComparisonRow,
  bestByMetric: Partial<Record<ComparisonMetricKey, string[]>>
): number {
  let n = 0;
  for (const ids of Object.values(bestByMetric)) {
    if (ids?.includes(row.id)) n += 1;
  }
  return n;
}

/** Leader id(s) when one house uniquely leads; empty when tied for lead. */
export function leaderHouseIds(
  rows: HouseComparisonRow[],
  bestByMetric: Partial<Record<ComparisonMetricKey, string[]>>
): string[] {
  if (rows.length < 2) return [];
  const scored = rows.map((row) => ({
    id: row.id,
    score: scoreHouseBestCount(row, bestByMetric),
  }));
  const top = Math.max(...scored.map((s) => s.score));
  if (top <= 0) return [];
  return scored.filter((s) => s.score === top).map((s) => s.id);
}
