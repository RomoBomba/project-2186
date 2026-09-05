import { describe, expect, it } from 'vitest';
import { displayScale, logicalDisplay } from './scale';

describe('logical display scaling', () => {
  it.each([
    [640, 400],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [360, 640],
    [480, 280],
    [1000, 300],
  ])(
    'fits %i × %i without distortion, cropping or excessive wasted space',
    (width, height) => {
      const scale = displayScale(width, height);
      const fit = Math.min(
        width / logicalDisplay.width,
        height / logicalDisplay.height,
      );
      expect(scale).toBeGreaterThan(0);
      expect(logicalDisplay.width * scale).toBeLessThanOrEqual(width);
      expect(logicalDisplay.height * scale).toBeLessThanOrEqual(height);
      expect(scale / fit).toBeGreaterThanOrEqual(0.95);
    },
  );

  it('favours a nearby integer but keeps fractional fits when snapping would waste space', () => {
    expect(displayScale(1300, 820)).toBe(2);
    expect(displayScale(960, 600)).toBe(1.5);
    expect(displayScale(320, 200)).toBe(0.5);
  });

  it.each([
    [0, 400],
    [640, 0],
    [-1, 400],
    [NaN, 400],
    [640, Infinity],
  ])('handles unavailable viewport dimensions (%s, %s)', (width, height) => {
    expect(displayScale(width, height)).toBe(0);
  });
});
