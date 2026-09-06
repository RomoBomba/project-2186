import { afterEach, expect, it, vi } from 'vitest';
import {
  createCommunicationSession,
  maximumCommandLength,
  type CommunicationSession,
} from './session';
import { conversationEngine } from '../../application/intelligence';
import { characterVoices } from '../../characters/voices';
afterEach(() => vi.useRealTimers());
it('rejects empty/oversize input, trims only edges, blocks duplicates and preserves record order', async () => {
  vi.useFakeTimers();
  let state: CommunicationSession = { state: 'ready', records: [] };
  const completed = vi.fn();
  const session = createCommunicationSession(
    'aletheia',
    'ru',
    (s) => (state = s),
    completed,
    conversationEngine,
  );
  expect(session.submit(' \t ')).toBe(false);
  expect(session.submit('x'.repeat(maximumCommandLength + 1))).toBe(false);
  expect(session.submit('  Мой  вопрос?  ')).toBe(true);
  expect(state.records[0]?.text).toBe('Мой  вопрос?');
  expect(state.records[1]?.text).toBe('');
  expect(state.state).toBe('forming');
  expect(session.submit('duplicate')).toBe(false);
  await vi.advanceTimersToNextTimerAsync();
  expect(state.state).toBe('transmitting');
  expect(session.submit('duplicate during transmission')).toBe(false);
  await vi.runAllTimersAsync();
  expect(state.records[1]?.text).toBe(
    characterVoices.aletheia.ru.uncertainty[0],
  );
  expect(state.state).toBe('ready');
  expect(completed).toHaveBeenCalledTimes(1);
  expect(session.submit('Другой вопрос')).toBe(true);
  await vi.runAllTimersAsync();
  expect(state.records.map((r) => [r.id, r.speaker])).toEqual([
    [1, 'user'],
    [2, 'aletheia'],
    [3, 'user'],
    [4, 'aletheia'],
  ]);
  expect(state.records[3]?.text).toBe(
    characterVoices.aletheia.ru.clarification[1],
  );
});
it('cancels session timers and forbids submissions after disposal', async () => {
  vi.useFakeTimers();
  const publish = vi.fn();
  const complete = vi.fn();
  const session = createCommunicationSession(
    'aura',
    'en',
    publish,
    complete,
    conversationEngine,
  );
  session.submit('An observation');
  session.cancel();
  const count = publish.mock.calls.length;
  await vi.runAllTimersAsync();
  expect(publish).toHaveBeenCalledTimes(count);
  expect(complete).not.toHaveBeenCalled();
  expect(session.submit('late')).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
it('supports reduced-motion sessions and exact-limit commands', async () => {
  vi.useFakeTimers();
  const complete = vi.fn();
  const session = createCommunicationSession(
    'themis',
    'en',
    vi.fn(),
    complete,
    conversationEngine,
    true,
  );
  expect(session.submit('x'.repeat(maximumCommandLength))).toBe(true);
  session.reduceMotion();
  await vi.runAllTimersAsync();
  expect(complete.mock.calls[0]?.[0].text).toBe(
    characterVoices.themis.en.clarification[0],
  );
});

it.each(['aletheia', 'aura', 'themis'] as const)(
  'evolves %s internally while preserving lifecycle and UI records with Basic Intelligence',
  async (id) => {
    vi.useFakeTimers();
    let visible: CommunicationSession = { state: 'ready', records: [] };
    const session = createCommunicationSession(
      id,
      'ru',
      (s) => (visible = s),
      vi.fn(),
      conversationEngine,
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
    await vi.advanceTimersToNextTimerAsync();
    expect(session.inspectCharacter().characterState.activity).toBe('thinking');
    await vi.runAllTimersAsync();
    const completed = session.inspectCharacter();
    expect(completed.characterState.activity).toBe('idle');
    expect(completed.relationshipState.familiarity).toBeGreaterThan(
      initial.relationshipState.familiarity,
    );
    expect(completed.relationshipState.trust).toBe(
      initial.relationshipState.trust,
    );
    expect(visible.records[1]?.text).toBe(
      characterVoices[id].ru.uncertainty[0],
    );
    expect(visible.state).toBe('ready');
    expect(Object.keys(visible)).toEqual(['state', 'records']);
    completed.characterState.energy = 0;
    expect(session.inspectCharacter().characterState.energy).toBeGreaterThan(0);
    session.submit('Ещё один вопрос.');
    await vi.runAllTimersAsync();
    expect(visible.records[3]?.text).toBe(
      characterVoices[id].ru.clarification[1],
    );
    const beforeInvalid = session.inspectCharacter();
    session.submit('  ');
    expect(session.inspectCharacter()).toEqual(beforeInvalid);
    session.submit('Незавершённый обмен');
    session.cancel();
    await vi.runAllTimersAsync();
    expect(session.inspectCharacter().relationshipState).toEqual(
      beforeInvalid.relationshipState,
    );
  },
);

it('ignores a late provider response after disposal, without history or lifecycle credit', async () => {
  vi.useFakeTimers();
  let resolve!: (value: { text: string; usedMaterialKeys: string[] }) => void;
  const { ConversationEngine } = await import('../../core/conversation/engine');
  const engine = new ConversationEngine([], {
    respond: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const publish = vi.fn(),
    complete = vi.fn();
  const session = createCommunicationSession(
    'aura',
    'en',
    publish,
    complete,
    engine,
  );
  session.submit('hello');
  session.cancel();
  const calls = publish.mock.calls.length;
  resolve({ text: 'Late response.', usedMaterialKeys: [] });
  await vi.runAllTimersAsync();
  expect(publish).toHaveBeenCalledTimes(calls);
  expect(complete).not.toHaveBeenCalled();
  expect(session.inspectResponseHistory().turn).toBe(0);
  expect(session.inspectCharacter().relationshipState.familiarity).toBe(0.05);
});
it('recovers from a provider failure without awarding a successful exchange', async () => {
  vi.useFakeTimers();
  const { ConversationEngine } = await import('../../core/conversation/engine');
  const engine = new ConversationEngine([], {
    respond: async () => {
      throw new Error('unavailable');
    },
  });
  let state: CommunicationSession = { state: 'ready', records: [] };
  const session = createCommunicationSession(
    'themis',
    'en',
    (next) => {
      state = next;
    },
    vi.fn(),
    engine,
  );
  session.submit('hello');
  await vi.runAllTimersAsync();
  expect(state.state).toBe('ready');
  expect(session.inspectCharacter().characterState.activity).toBe('idle');
  expect(session.inspectCharacter().relationshipState.familiarity).toBe(0.05);
  expect(session.inspectResponseHistory().turn).toBe(0);
  expect(state.records[1]?.text).toContain('interrupted');
  expect(session.submit('try again')).toBe(true);
  await vi.runAllTimersAsync();
});
it('waits for complete provider text before semantic playback and commits history only on completion', async () => {
  vi.useFakeTimers();
  let resolve!: (value: { text: string; usedMaterialKeys: string[] }) => void;
  const { ConversationEngine } = await import('../../core/conversation/engine');
  const engine = new ConversationEngine([], {
    respond: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  let state: CommunicationSession = { state: 'ready', records: [] };
  const session = createCommunicationSession(
    'aletheia',
    'en',
    (next) => {
      state = next;
    },
    vi.fn(),
    engine,
  );
  session.submit('hello');
  await vi.runAllTimersAsync();
  expect(state.state).toBe('forming');
  expect(state.records[1]?.text).toBe('');
  expect(session.submit('duplicate')).toBe(false);
  const full =
    'This complete response has two thoughts. Another sentence follows.';
  resolve({ text: full, usedMaterialKeys: [] });
  await vi.advanceTimersToNextTimerAsync();
  expect(session.inspectResponseHistory().turn).toBe(0);
  await vi.runAllTimersAsync();
  expect(state.records[1]?.text).toBe(full);
  expect(state.state).toBe('ready');
  expect(session.inspectResponseHistory().turn).toBe(1);
});
