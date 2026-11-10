/** Full amounts with grouping separators. Whole pesos stay whole; centavos stay visible. */
export function formatPeso(amount: number | null | undefined): string {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const whole = Math.abs(safe - Math.round(safe)) < 0.001;
  const formatted = safe.toLocaleString('en-PH', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₱${formatted}`;
}

export function formatNumber(amount: number | null | undefined): string {
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  const whole = Math.abs(safe - Math.round(safe)) < 0.001;
  return safe.toLocaleString('en-PH', {
    minimumFractionDigits: whole ? 0 : 1,
    maximumFractionDigits: whole ? 0 : 1,
  });
}
