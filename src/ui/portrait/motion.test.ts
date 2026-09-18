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
  expect(portraitSource('aura', 'transmit-b')).toBe(
    '/src/assets/portraits/aura/transmit-b.png',
  );
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

it('keeps Aletheia calibration and selects a separate Aura profile without a Themis default', async () => {
  const { aletheiaMotion, auraMotion, motionProfiles } =
    await import('./profiles');
  expect(aletheiaMotion).toEqual({
    formingDelay: 190,
    thinkingHold: 300,
    thinkingFade: 140,
    transmitFade: 120,
    alternateFade: 100,
    neutralFade: 160,
    blinkIn: 50,
    blinkHold: 100,
    blinkOut: 65,
    blinkInterval: [5500, 11000],
    longBlinkInterval: [12000, 16000],
    longBlinkChance: 0.15,
    doubleBlinkChance: 0.04,
    doubleBlinkGap: [300, 480],
    firstTransmit: [700, 1000],
    laterTransmit: [800, 1400],
    alternateChance: 0.45,
    settle: [220, 400],
    driftInterval: [14000, 24000],
    driftX: 0.5,
    driftY: 0.35,
    driftRotation: 0.15,
    thinkingOffset: [0, 0, 0],
    settleDuration: 2200,
  });
  expect(motionProfiles.aura).toBe(auraMotion);
  expect(motionProfiles.themis).toBeUndefined();
});
it('Aura holds thinking stably and returns fleeting B to A even without another chunk', async () => {
  const { auraMotion } = await import('./profiles');
  const s = setup();
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  s.motion.observe('forming');
  vi.advanceTimersByTime(190);
  expect(s.frame().current).toBe('neutral');
  vi.advanceTimersByTime(210);
  expect(s.frame().current).toBe('thinking');
  expect(s.frame().y).toBe(0.3);
  vi.advanceTimersByTime(10000);
  expect(s.frame().current).toBe('thinking');
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(600);
  s.motion.observe('transmitting', true);
  vi.advanceTimersByTime(150);
  expect(s.frame().current).toBe('transmit-b');
  vi.advanceTimersByTime(540);
  expect(s.frame().current).toBe('transmit-a');
  s.motion.destroy();
});
it('profile switches invalidate old timers and reduced Aura has no micro-motion', async () => {
  const { auraMotion, aletheiaMotion } = await import('./profiles');
  const s = setup();
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  vi.advanceTimersByTime(5000);
  s.motion.configure({
    profile: aletheiaMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  const count = s.frames.length;
  vi.advanceTimersByTime(1000);
  expect(s.frames.slice(count)).not.toContain('blink');
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: true,
    visible: true,
  });
  vi.advanceTimersByTime(60000);
  expect(s.frame()).toEqual(stillFrame());
  s.motion.observe('forming');
  vi.advanceTimersByTime(1000);
  expect(s.frame().current).toBe('thinking');
  expect(s.frame().y).toBe(0);
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(5000);
  s.motion.observe('transmitting', true);
  expect(s.frame().current).toBe('transmit-a');
  s.motion.destroy();
  expect(vi.getTimerCount()).toBe(0);
});
it('Aura idle uses bounded sparse blink/drift and hides pending B returns safely', async () => {
  const { auraMotion } = await import('./profiles');
  const s = setup(() => 0.2);
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  vi.advanceTimersByTime(5399);
  expect(s.frames).not.toContain('blink');
  vi.advanceTimersByTime(301);
  expect(s.frames).toContain('blink');
  expect(s.frame().current).toBe('neutral');
  vi.advanceTimersByTime(60000);
  expect(Math.abs(s.frame().x)).toBeLessThanOrEqual(0.65);
  expect(Math.abs(s.frame().y)).toBeLessThanOrEqual(0.45);
  expect(Math.abs(s.frame().rotation)).toBeLessThanOrEqual(0.2);
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(600);
  s.motion.observe('transmitting', true);
  vi.advanceTimersByTime(150);
  expect(s.frame().current).toBe('transmit-b');
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: false,
    visible: false,
  });
  vi.advanceTimersByTime(5000);
  expect(s.frame()).toEqual(stillFrame());
  expect(vi.getTimerCount()).toBe(0);
  s.motion.destroy();
});
it('keeps the approved Aura cadence and fade data explicit', async () => {
  const { auraMotion } = await import('./profiles');
  expect(auraMotion).toEqual({
    formingDelay: 200,
    thinkingHold: 300,
    thinkingFade: 180,
    transmitFade: 150,
    alternateFade: 130,
    neutralFade: 190,
    blinkIn: 50,
    blinkHold: 100,
    blinkOut: 65,
    blinkInterval: [4500, 9000],
    longBlinkInterval: [10000, 14000],
    longBlinkChance: 0.15,
    doubleBlinkChance: 0.05,
    doubleBlinkGap: [300, 480],
    firstTransmit: [500, 850],
    laterTransmit: [650, 1200],
    alternateChance: 0.5,
    alternateHold: [350, 550],
    settle: [260, 420],
    driftInterval: [10000, 18000],
    driftX: 0.65,
    driftY: 0.45,
    driftRotation: 0.2,
    thinkingOffset: [0.15, 0.3, 0],
    settleDuration: 2400,
  });
});
it('switching from Aura B cancels its return timer before Aletheia starts', async () => {
  const { auraMotion, aletheiaMotion } = await import('./profiles');
  const s = setup();
  s.motion.configure({
    profile: auraMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  s.motion.observe('transmitting');
  vi.advanceTimersByTime(600);
  s.motion.observe('transmitting', true);
  vi.advanceTimersByTime(150);
  expect(s.frame().current).toBe('transmit-b');
  s.motion.configure({
    profile: aletheiaMotion,
    enabled: true,
    reduced: false,
    visible: true,
  });
  s.motion.observe('ready');
  const index = s.frames.length;
  vi.advanceTimersByTime(1000);
  expect(s.frame().current).toBe('neutral');
  expect(s.frames.slice(index)).not.toContain('transmit-a');
  expect(s.frames.slice(index)).not.toContain('transmit-b');
  s.motion.observe('forming');
  vi.advanceTimersByTime(189);
  expect(s.frame().next).toBeUndefined();
  vi.advanceTimersByTime(1);
  expect(s.frame().next).toBe('thinking');
  expect(s.frame().fade).toBe(140);
  s.motion.destroy();
  expect(vi.getTimerCount()).toBe(0);
});
