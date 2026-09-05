export type BootState =
  | 'dormant'
  | 'power'
  | 'display'
  | 'initializing'
  | 'identity'
  | 'collapse'
  | 'reveal'
  | 'ready';

export type BootStep = {
  state: BootState;
  lines: number;
  duration: number;
  reducedDuration: number;
};

/** Authored holds, including each state's visual transition. No domain state. */
export const bootSequence: readonly BootStep[] = [
  { state: 'dormant', lines: 0, duration: 180, reducedDuration: 0 },
  { state: 'power', lines: 0, duration: 160, reducedDuration: 0 },
  { state: 'display', lines: 0, duration: 420, reducedDuration: 0 },
  { state: 'initializing', lines: 1, duration: 380, reducedDuration: 60 },
  { state: 'initializing', lines: 2, duration: 420, reducedDuration: 60 },
  { state: 'initializing', lines: 3, duration: 520, reducedDuration: 60 },
  { state: 'identity', lines: 3, duration: 1000, reducedDuration: 140 },
  { state: 'collapse', lines: 3, duration: 220, reducedDuration: 0 },
  { state: 'reveal', lines: 3, duration: 360, reducedDuration: 0 },
  { state: 'ready', lines: 3, duration: 0, reducedDuration: 0 },
];

export const firstBootStep = bootSequence[0]!;
const finalBootStep = bootSequence[bootSequence.length - 1]!;

/** One cancellable scheduler. CSS animation events never gate completion. */
export function startBoot(
  onStep: (step: BootStep) => void,
  reducedMotion: boolean,
) {
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let reduced = reducedMotion;

  function advance() {
    if (stopped) return;
    const step = bootSequence[index]!;
    onStep(step);
    if (step.state === 'ready') {
      stopped = true;
      return;
    }
    timer = setTimeout(
      () => {
        index += 1;
        advance();
      },
      reduced ? step.reducedDuration : step.duration,
    );
  }

  function cancel() {
    stopped = true;
    clearTimeout(timer);
  }

  advance();
  return {
    cancel,
    skip() {
      if (stopped) return;
      cancel();
      onStep(finalBootStep);
    },
    reduceMotion() {
      if (stopped || reduced) return;
      reduced = true;
      clearTimeout(timer);
      // Keep semantic order when the preference changes during playback.
      timer = setTimeout(() => {
        index += 1;
        advance();
      }, 0);
    },
  };
}
