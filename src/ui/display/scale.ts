export const logicalDisplay = { width: 640, height: 400 } as const;

/** Fit without cropping; prefer integer scaling only within 5% of the full fit. */
export function displayScale(width: number, height: number): number {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return 0;
  }

  const fit = Math.min(
    width / logicalDisplay.width,
    height / logicalDisplay.height,
  );
  const integer = Math.floor(fit);
  return integer >= 1 && integer / fit >= 0.95 ? integer : fit;
}
