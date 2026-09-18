import type { PortraitState } from './states';
export type PortraitMode = 'ready' | 'forming' | 'transmitting';
export type MotionFrame = {
  current: PortraitState;
  next?: PortraitState | undefined;
  revealed: boolean;
  fade: number;
  x: number;
  y: number;
  rotation: number;
};
export const stillFrame = (): MotionFrame => ({
  current: 'neutral',
  revealed: false,
  fade: 0,
  x: 0,
  y: 0,
  rotation: 0,
});
// Presentation-only calibration. Other characters deliberately have no motion profile yet.
export const aletheiaMotion = {
  formingDelay: 190,
  thinkingHold: 300,
  thinkingFade: 140,
  transmitFade: 120,
  neutralFade: 160,
  blinkIn: 50,
  blinkHold: 100,
  blinkOut: 65,
};
export function createPortraitMotion(
  publish: (frame: MotionFrame) => void,
  random = Math.random,
  now = Date.now,
) {
  let frame = stillFrame();
  let mode: PortraitMode = 'ready';
  let enabled = false,
    reduced = false,
    visible = true,
    disposed = false;
  let generation = 0,
    thinkingAt = -Infinity,
    nextTransmitAt = Infinity;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const draw = () => {
    if (!disposed) publish({ ...frame });
  };
  const between = (a: number, b: number) =>
    a + Math.max(0, Math.min(1, random())) * (b - a);
  function later(delay: number, action: () => void) {
    const token = generation;
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed && token === generation) action();
    }, delay);
    timers.add(timer);
  }
  function cancel() {
    generation++;
    timers.forEach(clearTimeout);
    timers.clear();
    if (frame.next)
      frame = {
        ...frame,
        current: frame.next,
        next: undefined,
        revealed: false,
      };
  }
  function show(state: PortraitState, duration: number, done?: () => void) {
    if (frame.current === state && !frame.next) {
      done?.();
      return;
    }
    if (reduced || !visible) {
      frame = {
        ...frame,
        current: state,
        next: undefined,
        revealed: false,
        fade: 0,
      };
      draw();
      done?.();
      return;
    }
    frame = { ...frame, next: state, revealed: false, fade: duration };
    draw();
    later(20, () => {
      frame = { ...frame, revealed: true };
      draw();
      later(duration, () => {
        frame = { ...frame, current: state, next: undefined, revealed: false };
        draw();
        done?.();
      });
    });
  }
  function blink(double = false) {
    if (mode !== 'ready') return;
    show('blink', aletheiaMotion.blinkIn, () =>
      later(aletheiaMotion.blinkHold, () =>
        show('neutral', aletheiaMotion.blinkOut, () => {
          if (!double && random() < 0.04)
            later(between(300, 480), () => blink(true));
          else scheduleBlink();
        }),
      ),
    );
  }
  function scheduleBlink() {
    later(random() < 0.15 ? between(12000, 16000) : between(5500, 11000), () =>
      blink(),
    );
  }
  function drift() {
    later(between(14000, 24000), () => {
      if (frame.next || frame.current === 'blink') {
        drift();
        return;
      }
      frame = {
        ...frame,
        x: between(-0.5, 0.5),
        y: between(-0.35, 0.35),
        rotation: between(-0.15, 0.15),
      };
      draw();
      drift();
    });
  }
  function enter() {
    if (!enabled || !visible) {
      frame = stillFrame();
      draw();
      return;
    }
    if (mode === 'forming') {
      later(aletheiaMotion.formingDelay, () => {
        thinkingAt = now() + (reduced ? 0 : aletheiaMotion.thinkingFade + 20);
        show('thinking', aletheiaMotion.thinkingFade);
      });
    } else if (mode === 'transmitting') {
      const delay = Math.max(
        0,
        thinkingAt + aletheiaMotion.thinkingHold - now(),
      );
      later(delay, () => {
        frame = { ...frame, x: 0, y: 0, rotation: 0 };
        show('transmit-a', aletheiaMotion.transmitFade);
        nextTransmitAt = now() + between(700, 1000);
      });
    } else {
      const settle = frame.current === 'neutral' ? 0 : between(220, 400);
      later(settle, () => {
        frame = { ...frame, x: 0, y: 0, rotation: 0 };
        show('neutral', aletheiaMotion.neutralFade, () => {
          if (!reduced) {
            scheduleBlink();
            drift();
          }
        });
      });
    }
  }
  draw();
  return {
    configure(options: {
      enabled: boolean;
      reduced: boolean;
      visible: boolean;
    }) {
      if (
        disposed ||
        (enabled === options.enabled &&
          reduced === options.reduced &&
          visible === options.visible)
      )
        return;
      cancel();
      enabled = options.enabled;
      reduced = options.reduced;
      visible = options.visible;
      frame = stillFrame();
      thinkingAt = -Infinity;
      nextTransmitAt = Infinity;
      draw();
      enter();
    },
    observe(next: PortraitMode, chunk = false) {
      if (disposed) return;
      if (next !== mode) {
        cancel();
        if (frame.current === 'blink') {
          frame = { ...frame, current: 'neutral' };
          draw();
        }
        mode = next;
        enter();
        return;
      }
      if (
        chunk &&
        mode === 'transmitting' &&
        enabled &&
        visible &&
        !reduced &&
        !frame.next &&
        now() >= nextTransmitAt &&
        frame.current.startsWith('transmit-')
      ) {
        nextTransmitAt = now() + between(800, 1400);
        if (random() < 0.45)
          show(
            frame.current === 'transmit-a' ? 'transmit-b' : 'transmit-a',
            100,
          );
      }
    },
    destroy() {
      cancel();
      disposed = true;
    },
  };
}
