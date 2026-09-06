import { afterEach, expect, it, vi } from 'vitest';
import {
  createCommunicationSession,
  maximumCommandLength,
  type CommunicationSession,
} from './session';
import { phase4Responses } from '../../fixtures/phase4-responses';
afterEach(() => vi.useRealTimers());
it('rejects empty/oversize input, trims only edges, blocks duplicates and preserves record order', () => {
  vi.useFakeTimers();
  let state: CommunicationSession = { state: 'ready', records: [] };
  const completed = vi.fn();
  const session = createCommunicationSession(
    'aletheia',
    'ru',
    (s) => (state = s),
    completed,
  );
  expect(session.submit(' \t ')).toBe(false);
  expect(session.submit('x'.repeat(maximumCommandLength + 1))).toBe(false);
  expect(session.submit('  Мой  вопрос?  ')).toBe(true);
  expect(state.records[0]?.text).toBe('Мой  вопрос?');
  expect(state.records[1]?.text).toBe('');
  expect(state.state).toBe('forming');
  expect(session.submit('duplicate')).toBe(false);
  vi.advanceTimersToNextTimer();
  expect(state.state).toBe('transmitting');
  expect(session.submit('duplicate during transmission')).toBe(false);
  vi.runAllTimers();
  expect(state.records[1]?.text).toBe(phase4Responses.ru.aletheia[0]);
  expect(state.state).toBe('ready');
  expect(completed).toHaveBeenCalledTimes(1);
  expect(session.submit('Другой вопрос')).toBe(true);
  vi.runAllTimers();
  expect(state.records.map((r) => [r.id, r.speaker])).toEqual([
    [1, 'user'],
    [2, 'aletheia'],
    [3, 'user'],
    [4, 'aletheia'],
  ]);
  expect(state.records[3]?.text).toBe(phase4Responses.ru.aletheia[1]);
});
it('cancels session timers and forbids submissions after disposal', () => {
  vi.useFakeTimers();
  const publish = vi.fn();
  const complete = vi.fn();
  const session = createCommunicationSession('aura', 'en', publish, complete);
  session.submit('An observation');
  session.cancel();
  const count = publish.mock.calls.length;
  vi.runAllTimers();
  expect(publish).toHaveBeenCalledTimes(count);
  expect(complete).not.toHaveBeenCalled();
  expect(session.submit('late')).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
it('supports reduced-motion sessions and exact-limit commands', () => {
  vi.useFakeTimers();
  const complete = vi.fn();
  const session = createCommunicationSession(
    'themis',
    'en',
    vi.fn(),
    complete,
    true,
  );
  expect(session.submit('x'.repeat(maximumCommandLength))).toBe(true);
  session.reduceMotion();
  vi.runAllTimers();
  expect(complete.mock.calls[0]?.[0].text).toBe(phase4Responses.en.themis[0]);
});

it.each(['aletheia', 'aura', 'themis'] as const)(
  'evolves %s internally while preserving the fixture cycle and UI records',
  (id) => {
    vi.useFakeTimers();
    let visible: CommunicationSession = { state: 'ready', records: [] };
    const session = createCommunicationSession(
      id,
      'ru',
      (s) => (visible = s),
      vi.fn(),
    );
    const initial = session.inspectCharacter();
    expect(initial.characterId).toBe(id);
    expect(initial.characterState.activity).toBe('idle');
    expect(session.submit('Почему меняется формулировка?')).toBe(true);
    const received = session.inspectCharacter();
    expect(received.characterState.activity).toBe('thinking');
    expect(received.userStyleProfile.questionFrequency).toBeGreaterThan(
      initial.userStyleProfile.questionFrequency,
    );
    expect(received.relationshipState).toEqual(initial.relationshipState);
    vi.advanceTimersToNextTimer();
    expect(session.inspectCharacter().characterState.activity).toBe('thinking');
    vi.runAllTimers();
    const completed = session.inspectCharacter();
    expect(completed.characterState.activity).toBe('idle');
    expect(completed.relationshipState.familiarity).toBeGreaterThan(
      initial.relationshipState.familiarity,
    );
    expect(completed.relationshipState.trust).toBe(
      initial.relationshipState.trust,
    );
    expect(visible.records[1]?.text).toBe(phase4Responses.ru[id][0]);
    expect(visible.state).toBe('ready');
    expect(Object.keys(visible)).toEqual(['state', 'records']);
    completed.characterState.energy = 0;
    expect(session.inspectCharacter().characterState.energy).toBeGreaterThan(0);
    session.submit('Ещё один вопрос.');
    vi.runAllTimers();
    expect(visible.records[3]?.text).toBe(phase4Responses.ru[id][1]);
    const beforeInvalid = session.inspectCharacter();
    session.submit('  ');
    expect(session.inspectCharacter()).toEqual(beforeInvalid);
    session.submit('Незавершённый обмен');
    session.cancel();
    vi.runAllTimers();
    expect(session.inspectCharacter().relationshipState).toEqual(
      beforeInvalid.relationshipState,
    );
  },
);
