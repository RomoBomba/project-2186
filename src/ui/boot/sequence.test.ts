import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootSequence, startBoot, type BootStep } from './sequence';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('boot playback', () => {
  it.each([false, true])(
    'visits the authored sequence and completes once (reduced=%s)',
    (reduced) => {
      const visited: BootStep[] = [];
      startBoot((step) => visited.push(step), reduced);
      vi.runAllTimers();
      expect(visited.map((step) => step.state)).toEqual([
        'dormant',
        'power',
        'display',
        'initializing',
        'initializing',
        'initializing',
        'identity',
        'collapse',
        'reveal',
        'ready',
      ]);
      expect(
        visited
          .filter((step) => step.state === 'initializing')
          .map((step) => step.lines),
      ).toEqual([1, 2, 3]);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('keeps normal playback short and reduced playback substantially shorter', () => {
    const normal = bootSequence.reduce((sum, step) => sum + step.duration, 0);
    const reduced = bootSequence.reduce(
      (sum, step) => sum + step.reducedDuration,
      0,
    );
    expect(normal).toBeGreaterThanOrEqual(3000);
    expect(normal).toBeLessThanOrEqual(5000);
    expect(reduced).toBeLessThan(500);
  });

  it('cancels pending updates on unmount', () => {
    const listener = vi.fn();
    const playback = startBoot(listener, false);
    playback.cancel();
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe.each([false, true])('bypass (reduced=%s)', (reduced) => {
    it.each(
      bootSequence.slice(0, -1).map((step, index) => ({ ...step, index })),
    )(
      'bypasses $state / $lines immediately and cancels all later updates',
      ({ index }) => {
        const visited: BootStep[] = [];
        const playback = startBoot((step) => visited.push(step), reduced);
        for (let i = 0; i < index; i += 1) vi.advanceTimersToNextTimer();
        expect(visited.at(-1)).toEqual(bootSequence[index]);

        playback.skip();
        expect(visited.at(-1)?.state).toBe('ready');
        expect(vi.getTimerCount()).toBe(0);
        const countAfterBypass = visited.length;
        playback.skip();
        playback.reduceMotion();
        vi.runAllTimers();
        expect(visited).toHaveLength(countAfterBypass);
        expect(visited.filter((step) => step.state === 'ready')).toHaveLength(
          1,
        );
      },
    );
  });

  it('accelerates remaining states in order when reduced motion is enabled during boot', () => {
    const visited: BootStep[] = [];
    const playback = startBoot((step) => visited.push(step), false);
    vi.advanceTimersToNextTimer();
    playback.reduceMotion();
    vi.advanceTimersByTime(500);
    expect(visited).toEqual(bootSequence);
    expect(vi.getTimerCount()).toBe(0);
  });
});
