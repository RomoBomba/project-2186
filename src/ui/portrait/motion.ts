import { aletheiaMotion, type MotionProfile } from './profiles';
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
export type MotionTrace = {
  at: number;
  event: string;
  source: PortraitMode;
  asset: PortraitState;
  fade: number;
  delay?: number;
};
export const stillFrame = (): MotionFrame => ({
  current: 'neutral',
  revealed: false,
  fade: 0,
  x: 0,
  y: 0,
  rotation: 0,
});
export { aletheiaMotion } from './profiles';
export function createPortraitMotion(
  publish: (frame: MotionFrame) => void,
  random = Math.random,
  now = Date.now,
  inspect?: (event: MotionTrace) => void,
) {
  let profile = aletheiaMotion;
  let frame = stillFrame();
  let mode: PortraitMode = 'ready';
  let enabled = false,
    reduced = false,
    visible = true,
    disposed = false;
  let attentionPending = false,
    idleMovingUntil = 0;
  let generation = 0,
    thinkingAt = -Infinity,
    nextTransmitAt = Infinity;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const trace = (event: string, delay?: number) =>
    inspect?.({
      at: now(),
      event,
      source: mode,
      asset: frame.next ?? frame.current,
      fade: frame.fade,
      ...(delay === undefined ? {} : { delay }),
    });
  const entered = (previous: PortraitState) => {
    if (previous === 'blink') trace('blink exited');
    if (previous === 'transmit-b') trace('transmit-b exited');
    trace(
      frame.current === 'neutral' && previous !== 'neutral'
        ? 'neutral restored'
        : `${frame.current} entered`,
    );
  };
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
    attentionPending = false;
    timers.forEach(clearTimeout);
    timers.clear();
    if (frame.next) {
      const previous = frame.current;
      frame = {
        ...frame,
        current: frame.next,
        next: undefined,
        revealed: false,
      };
      if (previous === 'blink') trace('blink exited');
      if (previous === 'transmit-b') trace('transmit-b exited');
      trace('transition interrupted');
    }
  }
  function show(state: PortraitState, duration: number, done?: () => void) {
    if (frame.current === state && !frame.next) {
      done?.();
      return;
    }
    const previous = frame.current;
    inspect?.({
      at: now(),
      event: `${state} transition`,
      source: mode,
      asset: state,
      fade: reduced ? 0 : duration,
    });
    if (reduced || !visible) {
      frame = {
        ...frame,
        current: state,
        next: undefined,
        revealed: false,
        fade: 0,
      };
      draw();
      entered(previous);
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
        entered(previous);
        done?.();
      });
    });
  }
  function blink(double = false) {
    if (mode !== 'ready') return;
    if (
      profile.serializeIdleMotion &&
      (frame.next || now() < idleMovingUntil)
    ) {
      later(Math.max(100, idleMovingUntil - now()), () => blink(double));
      return;
    }
    show('blink', profile.blinkIn, () =>
      later(profile.blinkHold, () =>
        show('neutral', profile.blinkOut, () => {
          if (!double && random() < profile.doubleBlinkChance)
            later(between(...profile.doubleBlinkGap), () => blink(true));
          else scheduleBlink();
        }),
      ),
    );
  }
  function scheduleBlink() {
    const delay =
      random() < profile.longBlinkChance
        ? between(...profile.longBlinkInterval)
        : between(...profile.blinkInterval);
    trace('blink scheduled', delay);
    later(delay, () => blink());
  }
  function drift() {
    later(between(...profile.driftInterval), () => {
      if (frame.next || frame.current === 'blink') {
        drift();
        return;
      }
      frame = {
        ...frame,
        x: between(-profile.driftX, profile.driftX),
        y: between(-profile.driftY, profile.driftY),
        rotation: between(-profile.driftRotation, profile.driftRotation),
      };
      idleMovingUntil = now() + profile.settleDuration;
      trace('micro-motion applied');
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
      attentionPending = true;
      trace('thinking scheduled', profile.formingDelay);
      later(profile.formingDelay, () => {
        thinkingAt = now() + (reduced ? 0 : profile.thinkingFade + 20);
        if (!reduced && profile.thinkingOffset.some(Boolean)) {
          const [x, y, rotation] = profile.thinkingOffset;
          frame = { ...frame, x, y, rotation };
        }
        show('thinking', profile.thinkingFade, () => {
          attentionPending = false;
          if (profile.finishFastAttention && mode === 'transmitting') enter();
        });
      });
    } else if (mode === 'transmitting') {
      if (profile.finishFastAttention && attentionPending && !reduced) return;
      const delay = Math.max(0, thinkingAt + profile.thinkingHold - now());
      later(delay, () => {
        frame = { ...frame, x: 0, y: 0, rotation: 0 };
        show('transmit-a', profile.transmitFade);
        nextTransmitAt = now() + between(...profile.firstTransmit);
      });
    } else {
      const settle =
        frame.current === 'neutral' ? 0 : between(...profile.settle);
      later(settle, () => {
        frame = { ...frame, x: 0, y: 0, rotation: 0 };
        if (profile.serializeIdleMotion)
          idleMovingUntil = now() + profile.settleDuration;
        show('neutral', profile.neutralFade, () => {
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
      profile?: MotionProfile | undefined;
      enabled: boolean;
      reduced: boolean;
      visible: boolean;
    }) {
      if (
        disposed ||
        (profile === (options.profile ?? aletheiaMotion) &&
          enabled === options.enabled &&
          reduced === options.reduced &&
          visible === options.visible)
      )
        return;
      cancel();
      profile = options.profile ?? aletheiaMotion;
      enabled = options.enabled;
      reduced = options.reduced;
      visible = options.visible;
      frame = stillFrame();
      thinkingAt = -Infinity;
      idleMovingUntil = 0;
      nextTransmitAt = Infinity;
      draw();
      trace('neutral entered');
      enter();
    },
    observe(next: PortraitMode, chunk = false) {
      if (disposed) return;
      if (next !== mode) {
        const finishAttention =
          profile.finishFastAttention &&
          !reduced &&
          enabled &&
          visible &&
          mode === 'forming' &&
          next === 'transmitting' &&
          attentionPending;
        if (
          mode === 'forming' &&
          !finishAttention &&
          frame.current !== 'thinking' &&
          frame.next !== 'thinking'
        )
          trace('thinking skipped');
        if (!finishAttention) cancel();
        if (frame.current === 'blink') {
          frame = { ...frame, current: 'neutral' };
          draw();
        }
        mode = next;
        trace('lifecycle');
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
        frame.current.startsWith('transmit-') &&
        !(profile.alternateHold && frame.current === 'transmit-b')
      ) {
        nextTransmitAt = now() + between(...profile.laterTransmit);
        if (random() < profile.alternateChance)
          show(
            frame.current === 'transmit-a' ? 'transmit-b' : 'transmit-a',
            profile.alternateFade,
            profile.alternateHold
              ? () => {
                  if (frame.current !== 'transmit-b') return;
                  later(between(...profile.alternateHold!), () => {
                    show('transmit-a', profile.alternateFade, () => {
                      nextTransmitAt =
                        now() + between(...profile.laterTransmit);
                    });
                  });
                }
              : undefined,
          );
      }
    },
    destroy() {
      cancel();
      disposed = true;
    },
  };
}
