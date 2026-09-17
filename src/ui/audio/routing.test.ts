import { afterEach, expect, it, vi } from 'vitest';
import { audioCues, type AudioEngine } from '../../infrastructure/audio/model';
import { WebAudioEngine } from '../../infrastructure/audio/web-audio';
import { bootAudio, terminalAudio, openSystemAudio } from './routing';
import { startBoot } from '../boot/sequence';
import { createCommunicationSession } from '../terminal/session';
import { conversationEngine } from '../../application/intelligence';
function spy(): AudioEngine {
  return {
    unlock: vi.fn(),
    setEnabled: vi.fn(),
    setMasterGain: vi.fn(),
    play: vi.fn(),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
}
afterEach(() => vi.useRealTimers());
it.each([false, true])(
  'observes boot sparsely without an independent scheduler (reduced=%s)',
  (reduced) => {
    vi.useFakeTimers();
    const audio = spy(),
      sound = bootAudio(audio);
    startBoot(sound.step, reduced);
    vi.runAllTimers();
    expect(vi.mocked(audio.play).mock.calls.map(([cue]) => cue.type)).toEqual([
      audioCues.bootWake,
      audioCues.bootChannel,
    ]);
    expect(vi.getTimerCount()).toBe(0);
  },
);
it('skip cancels boot and prevents any later cue', () => {
  vi.useFakeTimers();
  const audio = spy(),
    sound = bootAudio(audio);
  const boot = startBoot(sound.step, false);
  vi.advanceTimersToNextTimer();
  sound.cancel();
  boot.skip();
  vi.runAllTimers();
  expect(audio.cancel).toHaveBeenCalledWith('boot');
  expect(audio.play).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
it('ignores IME, modifier keys, shortcuts and held keys but categorizes ordinary typing', () => {
  const audio = spy(),
    sound = terminalAudio(audio);
  sound.setActive(true);
  const key = (key: string, extra = {}) => ({
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    repeat: false,
    ...extra,
  });
  for (const k of [
    'Shift',
    'Control',
    'Alt',
    'Meta',
    'F1',
    'F2',
    'Tab',
    'Enter',
    'ArrowLeft',
    'Dead',
    'Process',
  ])
    sound.key(key(k));
  sound.key(key('a', { isComposing: true }));
  sound.key(key('a'), true);
  sound.key(key('a', { keyCode: 229 }));
  sound.key(key('a', { ctrlKey: true }));
  sound.key(key('a', { metaKey: true }));
  sound.key(key('a', { altKey: true }));
  sound.key(key('a', { repeat: true }));
  expect(audio.play).not.toHaveBeenCalled();
  for (const k of ['я', 'a', ' ', 'Backspace']) sound.key(key(k));
  expect(vi.mocked(audio.play).mock.calls.map(([cue]) => cue)).toEqual(
    ['text', 'text', 'space', 'erase'].map((category) => ({
      type: audioCues.commandKey,
      category,
    })),
  );
  sound.observe('forming');
  vi.mocked(audio.play).mockClear();
  sound.key(key('a'));
  expect(audio.play).not.toHaveBeenCalled();
});
it.each([false, true])(
  'routes one accepted exchange, never per chunk, without changing its transcript (reduced=%s)',
  async (reduced) => {
    vi.useFakeTimers();
    const audio = spy(),
      sound = terminalAudio(audio);
    sound.setActive(true);
    let text = '';
    const session = createCommunicationSession(
      'aura',
      'ru',
      (s) => sound.observe(s.state),
      (r) => {
        text = r.text;
      },
      conversationEngine,
      reduced,
    );
    expect(session.submit(' ')).toBe(false);
    expect(audio.play).not.toHaveBeenCalled();
    expect(session.submit('Что такое память?')).toBe(true);
    expect(session.submit('дубликат')).toBe(false);
    await vi.runAllTimersAsync();
    expect(vi.mocked(audio.play).mock.calls.map(([cue]) => cue.type)).toEqual([
      audioCues.commandSubmit,
      audioCues.intelligenceForming,
      audioCues.transmissionStart,
    ]);
    expect(text.length).toBeGreaterThan(0);
    expect(session.inspectWorkingMemory().history.turn).toBe(1);
    session.cancel();
    sound.cancel();
    expect(vi.getTimerCount()).toBe(0);
  },
);
it('hidden terminal finishes communication silently and has no sound backlog on return', async () => {
  vi.useFakeTimers();
  const audio = spy(),
    sound = terminalAudio(audio);
  sound.setActive(true);
  const session = createCommunicationSession(
    'themis',
    'ru',
    (s) => sound.observe(s.state),
    () => {},
    conversationEngine,
  );
  session.submit('Что такое память?');
  sound.setActive(false);
  vi.mocked(audio.play).mockClear();
  await vi.runAllTimersAsync();
  sound.setActive(true);
  expect(audio.play).not.toHaveBeenCalled();
  expect(session.inspectWorkingMemory().history.turn).toBe(1);
  session.cancel();
});
it('a failed audio backend cannot prevent a complete conversation', async () => {
  vi.useFakeTimers();
  const audio = new WebAudioEngine(() => {
    throw Error('unavailable');
  });
  audio.setEnabled(true);
  audio.unlock();
  const sound = terminalAudio(audio);
  sound.setActive(true);
  let done = false;
  const session = createCommunicationSession(
    'aletheia',
    'en',
    (s) => sound.observe(s.state),
    () => {
      done = true;
    },
    conversationEngine,
    true,
  );
  expect(session.submit('What is memory?')).toBe(true);
  await vi.runAllTimersAsync();
  expect(done).toBe(true);
  session.cancel();
});

it.each(['aletheia', 'aura', 'themis'] as const)(
  'connects %s once per working session, never when a menu returns',
  (character) => {
    const audio = spy(),
      sound = terminalAudio(audio);
    sound.connect(character);
    expect(audio.play).not.toHaveBeenCalled();
    sound.setActive(true);
    sound.connect(character);
    sound.setActive(false);
    sound.setActive(true);
    sound.connect(character);
    expect(audio.play).toHaveBeenCalledExactlyOnceWith({
      type: audioCues.characterConnect,
      character,
    });
    const next = terminalAudio(audio);
    next.setActive(true);
    next.connect(character);
    expect(audio.play).toHaveBeenCalledTimes(2);
  },
);
it('opens both system modes with a system cue, cancelling terminal and motif tails', () => {
  const audio = spy();
  openSystemAudio(audio);
  expect(audio.cancel).toHaveBeenCalledWith('terminal');
  expect(audio.cancel).toHaveBeenCalledWith('character');
  expect(audio.play).toHaveBeenCalledExactlyOnceWith({
    type: audioCues.systemOpen,
  });
});
