// Non-finite values return a safe neutral/default value, never propagate NaN.
export function bounded(
  value: number,
  min = 0,
  max = 1,
  fallback = 0.5,
): number {
  const safe = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Number.isFinite(safe) ? safe : min));
}
export function unit(value: number, fallback = 0.5): number {
  return bounded(value, 0, 1, fallback);
}
export function approach(value: number, target: number, rate: number): number {
  return unit(unit(value) + (unit(target) - unit(value)) * unit(rate, 0));
}
