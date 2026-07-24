/** Shared Exit tab display helpers (labels only — no formula changes). */

const money = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(n: number): string {
  return money.format(Number.isFinite(n) ? n : 0);
}

export function signedMoney(n: number): string {
  if (!Number.isFinite(n)) return money.format(0);
  if (n < 0) return `−${money.format(Math.abs(n))}`;
  return money.format(n);
}

/** Prefix + for positive amounts in running totals (zero stays plain). */
export function plusMoney(n: number): string {
  if (!Number.isFinite(n)) return money.format(0);
  if (n < 0) return signedMoney(n);
  if (n === 0) return money.format(0);
  return `+${money.format(n)}`;
}

export function formatNumberField(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

/** Total gain as % of net initial cash invested. */
export function formatGainVsCashInPct(gain: number, cashIn: number): string {
  if (!Number.isFinite(gain) || !Number.isFinite(cashIn) || cashIn <= 0) return "—";
  const raw = (gain / cashIn) * 100;
  const rounded = Math.round(raw * 10) / 10;
  const abs = Math.abs(rounded);
  const body = abs % 1 === 0 ? String(Math.round(abs)) : abs.toFixed(1);
  if (rounded > 0) return `+${body}%`;
  if (rounded < 0) return `−${body}%`;
  return "0%";
}

export function formatIrrDisplay(irr: number | null | undefined): string {
  if (irr == null || !Number.isFinite(irr)) return "—";
  const rounded = Math.round(irr * 10) / 10;
  return `${rounded.toFixed(1)}%`;
}

export function formatEquityMultipleDisplay(mult: number | null | undefined): string {
  if (mult == null || !Number.isFinite(mult)) return "—";
  return `${(Math.round(mult * 100) / 100).toFixed(2)}×`;
}
