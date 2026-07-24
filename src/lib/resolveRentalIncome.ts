import {
  aggregateMultifamilyIncome,
  computeStrIncome,
  type MultifamilyAggregateResult,
  type StrIncomeResult,
} from "./dealStrategies";
import type {
  AppPersisted,
  MultifamilyUnitPersisted,
  RentalIncomeMode,
  RentalIncomePersisted,
  StrIncomePersisted,
} from "../storage/mortgageState";

export type RentalCanonicalFields = Pick<
  AppPersisted,
  "monthlyRent" | "otherMonthlyIncome" | "vacancyRatePercent"
>;

export type ResolvedRentalIncome = RentalCanonicalFields & {
  mode: RentalIncomeMode;
  strSnapshot?: StrIncomeResult;
  multifamilySnapshot?: MultifamilyAggregateResult;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Stable id for a new multifamily unit row. */
export function newMultifamilyUnitId(existing: MultifamilyUnitPersisted[]): string {
  const used = new Set(existing.map((u) => u.id));
  let i = existing.length + 1;
  while (used.has(`unit-${i}`)) i += 1;
  return `unit-${i}`;
}

export function defaultMultifamilyUnit(
  existing: MultifamilyUnitPersisted[],
  seed?: Partial<MultifamilyUnitPersisted>
): MultifamilyUnitPersisted {
  return {
    id: seed?.id ?? newMultifamilyUnitId(existing),
    monthlyRent: Math.max(0, Math.round(Number(seed?.monthlyRent) || 0)),
    ...(seed?.otherMonthlyIncome !== undefined
      ? { otherMonthlyIncome: Math.max(0, Math.round(Number(seed.otherMonthlyIncome) || 0)) }
      : {}),
    ...(seed?.vacancyRatePercent !== undefined
      ? { vacancyRatePercent: clampPct(Number(seed.vacancyRatePercent) || 0) }
      : {}),
  };
}

export function defaultStrIncome(seed?: Partial<StrIncomePersisted>): StrIncomePersisted {
  return {
    nightlyRate: Math.max(0, Number(seed?.nightlyRate) || 0),
    nightsBookedPerMonth: Math.max(0, Math.round(Number(seed?.nightsBookedPerMonth) || 20)),
    cleaningFeePerStay: Math.max(0, Number(seed?.cleaningFeePerStay) || 0),
    staysPerMonth: Math.max(0, Math.round(Number(seed?.staysPerMonth) || 0)),
    platformFeePercent: clampPct(Number(seed?.platformFeePercent ?? 3) || 0),
    otherMonthlyIncome: Math.max(0, Number(seed?.otherMonthlyIncome ?? 0) || 0),
    vacancyRatePercent: clampPct(Number(seed?.vacancyRatePercent ?? 5) || 0),
  };
}

/** Map multifamily units to canonical rent fields (portfolio effective vacancy). */
export function canonicalFromMultifamily(
  block: NonNullable<RentalIncomePersisted["multifamily"]>
): RentalCanonicalFields {
  const agg = aggregateMultifamilyIncome({
    units: block.units.map((u) => ({
      monthlyRent: u.monthlyRent,
      otherMonthlyIncome: u.otherMonthlyIncome,
      vacancyRatePercent: u.vacancyRatePercent,
    })),
    defaultVacancyRatePercent: block.defaultVacancyRatePercent,
  });

  let rentSum = 0;
  let otherSum = 0;
  for (const unit of block.units) {
    rentSum += Math.max(0, Number(unit.monthlyRent) || 0);
    otherSum += Math.max(0, Number(unit.otherMonthlyIncome ?? 0) || 0);
  }

  const gsi = rentSum + otherSum;
  const vacancyRatePercent =
    gsi > 0 ? roundMoney((agg.vacancyLossMonthly / gsi) * 100) : clampPct(block.defaultVacancyRatePercent ?? 0);

  return {
    monthlyRent: Math.round(rentSum),
    otherMonthlyIncome: Math.round(otherSum),
    vacancyRatePercent,
  };
}

/**
 * Map STR inputs to canonical rent fields.
 * Platform fees + STR vacancy are folded into canonical vacancy so rental/derive stays single-path.
 */
export function canonicalFromStr(str: StrIncomePersisted): RentalCanonicalFields & { strSnapshot: StrIncomeResult } {
  const strSnapshot = computeStrIncome(str);
  const gsi = strSnapshot.grossScheduledIncomeMonthly;
  const vacancyRatePercent =
    gsi > 0
      ? roundMoney(((gsi - strSnapshot.effectiveGrossIncomeMonthly) / gsi) * 100)
      : clampPct(str.vacancyRatePercent ?? 0);

  return {
    monthlyRent: roundMoney(strSnapshot.grossBookingIncome + strSnapshot.cleaningIncome),
    otherMonthlyIncome: Math.round(strSnapshot.otherIncome),
    vacancyRatePercent,
    strSnapshot,
  };
}

/** Resolve canonical rent fields from mode + optional detail blocks (no state mutation). */
export function resolveRentalIncome(state: AppPersisted): ResolvedRentalIncome {
  const mode = state.rentalIncome?.mode ?? "simple";

  if (mode === "multifamily" && state.rentalIncome?.multifamily?.units?.length) {
    const canonical = canonicalFromMultifamily(state.rentalIncome.multifamily);
    const multifamilySnapshot = aggregateMultifamilyIncome({
      units: state.rentalIncome.multifamily.units.map((u) => ({
        monthlyRent: u.monthlyRent,
        otherMonthlyIncome: u.otherMonthlyIncome,
        vacancyRatePercent: u.vacancyRatePercent,
      })),
      defaultVacancyRatePercent: state.rentalIncome.multifamily.defaultVacancyRatePercent,
    });
    return { mode, ...canonical, multifamilySnapshot };
  }

  if (mode === "str" && state.rentalIncome?.str) {
    const { strSnapshot, ...canonical } = canonicalFromStr(state.rentalIncome.str);
    return { mode, ...canonical, strSnapshot };
  }

  return {
    mode: "simple",
    monthlyRent: Math.max(0, Number(state.monthlyRent) || 0),
    otherMonthlyIncome: Math.max(0, Number(state.otherMonthlyIncome) || 0),
    vacancyRatePercent: clampPct(Number(state.vacancyRatePercent) || 0),
  };
}

/** Build a scenario slice with canonical rent synced from rentalIncome detail (inputs only). */
export function syncRentalIncomePatch(
  _state: AppPersisted,
  rentalIncome: RentalIncomePersisted | undefined
): Partial<AppPersisted> {
  if (!rentalIncome) return { rentalIncome: undefined };

  const mode = rentalIncome.mode ?? "simple";
  if (mode === "simple") {
    return { rentalIncome: { mode: "simple" } };
  }

  if (mode === "multifamily" && rentalIncome.multifamily?.units?.length) {
    const canonical = canonicalFromMultifamily(rentalIncome.multifamily);
    return { rentalIncome, ...canonical };
  }

  if (mode === "str" && rentalIncome.str) {
    const canonical = canonicalFromStr(rentalIncome.str);
    return {
      rentalIncome,
      monthlyRent: canonical.monthlyRent,
      otherMonthlyIncome: canonical.otherMonthlyIncome,
      vacancyRatePercent: canonical.vacancyRatePercent,
    };
  }

  return { rentalIncome };
}

/** Merge rentalIncome edits and keep canonical rent fields in sync. */
export function patchRentalIncome(
  state: AppPersisted,
  updater: (current: RentalIncomePersisted | undefined) => RentalIncomePersisted | undefined
): Partial<AppPersisted> {
  const next = updater(state.rentalIncome);
  if (!next) return syncRentalIncomePatch(state, undefined);
  return syncRentalIncomePatch(state, next);
}

/** Scenario with resolved canonical rent for derive/export (does not persist computed blocks). */
export function withResolvedRentalIncome(state: AppPersisted): AppPersisted {
  const resolved = resolveRentalIncome(state);
  if (resolved.mode === "simple") return state;
  return {
    ...state,
    monthlyRent: resolved.monthlyRent,
    otherMonthlyIncome: resolved.otherMonthlyIncome,
    vacancyRatePercent: resolved.vacancyRatePercent,
  };
}
