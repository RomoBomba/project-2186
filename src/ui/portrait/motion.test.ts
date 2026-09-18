import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPortraitMotion, stillFrame } from './motion';
import { portraitSource } from './states';
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
function setup(random = () => 0.2) {
  let frame = stillFrame();
  const frames: string[] = [];
  const publish = vi.fn((next: typeof frame) => {
    frame = next;
    frames.push(next.next ?? next.current);
  });
  const motion = createPortraitMotion(publish, random);
  motion.configure({ enabled: true, reduced: false, visible: true });
  return { motion, publish, frames, frame: () => frame };
}
it('starts neutral, stays quiet initially, blinks and returns without moving the container', () => {
  const s = setup();
  vi.advanceTimersByTime(3500);
  expect(s.frames.every((x) => x === 'neutral')).toBe(true);
  vi.advanceTimersByTime(3500);
  expect(s.frames).toContain('blink');
  expect(s.frame().current).toBe('neutral');
  expect(s.frame().x).toBe(0);
  s.motion.destroy();
});
it('suppresses an 80ms forming flash and holds a real thinking state before transmission', () => {
  const s = setup();
  s.motion.observe('forming');
  vi.advanceTimersByTime(80);
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(200);
  expect(s.frames).not.toContain('thinking');
  expect(s.frame().current).toBe('transmit-a');
  s.motion.observe('forming');
  vi.advanceTimersByTime(400);
  expect(s.frame().current).toBe('thinking');
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(80);
  expect(s.frame().current).toBe('thinking');
  vi.advanceTimersByTime(500);
  expect(s.frame().current).toBe('transmit-a');
  s.motion.destroy();
});
it('alternates only on sufficiently spaced chunk opportunities, then settles', () => {
  const s = setup();
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(500);
  s.motion.observe('transmitting', true);
  expect(s.frames).not.toContain('transmit-b');
  vi.advanceTimersByTime(1000);
  expect(s.frames).not.toContain('transmit-b');
  s.motion.observe('transmitting', true);
  vi.advanceTimersByTime(150);
  expect(s.frame().current).toBe('transmit-b');
  s.motion.observe('ready');
  vi.advanceTimersByTime(100);
  expect(s.frame().current).toBe('transmit-b');
  vi.advanceTimersByTime(600);
  expect(s.frame().current).toBe('neutral');
  s.motion.destroy();
});
it('invalidates settle and forming callbacks on a new lifecycle', () => {
  const s = setup();
  s.motion.observe('forming');
  vi.advanceTimersByTime(50);
  s.motion.observe('ready');
  vi.advanceTimersByTime(500);
  expect(s.frames).not.toContain('thinking');
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(200);
  s.motion.observe('ready');
  vi.advanceTimersByTime(50);
  s.motion.observe('forming');
  vi.advanceTimersByTime(800);
  expect(s.frame().current).toBe('thinking');
  s.motion.destroy();
});
it('reduced motion has semantic states but no blink, drift or transmit alternation', () => {
  const s = setup();
  s.motion.configure({ enabled: true, reduced: true, visible: true });
  vi.advanceTimersByTime(60000);
  expect(s.frames).not.toContain('blink');
  expect(s.frame().x).toBe(0);
  s.motion.observe('forming');
  vi.advanceTimersByTime(500);
  expect(s.frame().current).toBe('thinking');
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(5000);
  s.motion.observe('transmitting', true);
  expect(s.frame().current).toBe('transmit-a');
  expect(s.frame().next).toBeUndefined();
  s.motion.destroy();
});
it('hidden tabs cancel timers and resume without catch-up', () => {
  const s = setup();
  s.motion.configure({ enabled: true, reduced: false, visible: false });
  expect(vi.getTimerCount()).toBe(0);
  vi.advanceTimersByTime(60000);
  s.motion.configure({ enabled: true, reduced: false, visible: true });
  vi.advanceTimersByTime(3500);
  expect(s.frame().current).toBe('neutral');
  s.motion.destroy();
});
it('destroy and character changes clear pending callbacks; unsupported assets fall back', () => {
  const s = setup();
  s.motion.observe('forming');
  s.motion.destroy();
  const count = s.publish.mock.calls.length;
  vi.advanceTimersByTime(60000);
  expect(s.publish).toHaveBeenCalledTimes(count);
  expect(vi.getTimerCount()).toBe(0);
  const next = setup();
  expect(next.frame().current).toBe('neutral');
  next.motion.configure({ enabled: false, reduced: false, visible: true });
  vi.advanceTimersByTime(60000);
  expect(next.frame().current).toBe('neutral');
  expect(vi.getTimerCount()).toBe(0);
  expect(portraitSource('aura', 'transmit-b')).toBe(portraitSource('aura'));
  expect(portraitSource('themis', 'blink')).toBe(portraitSource('themis'));
  next.motion.destroy();
});
it('preload gate prevents any animation until assets are ready', () => {
  const publish = vi.fn();
  const motion = createPortraitMotion(publish);
  motion.observe('forming');
  vi.advanceTimersByTime(60000);
  expect(
    publish.mock.calls.every(
      ([frame]) => frame.current === 'neutral' && !frame.next,
    ),
  ).toBe(true);
  motion.destroy();
});
