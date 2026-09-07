import { expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import GeometryOverlay from './GeometryOverlay.svelte';
import { applyDisplayGeometry, moveGeometry } from './geometry';
import { createSetup, layouts } from '../setup/model';
import { createCommunicationSession } from '../terminal/session';
import { conversationEngine } from '../../application/intelligence';

it('wraps geometry navigation in both directions', () => {
  expect(moveGeometry(0, 'ArrowLeft')).toBe(2);
  expect(moveGeometry(2, 'ArrowRight')).toBe(0);
  expect(moveGeometry(1, 'ArrowUp')).toBe(0);
  expect(moveGeometry(1, 'ArrowDown')).toBe(2);
});

it.each(['ru', 'en'] as const)(
  'exposes one localized modal system mode with shared previews: %s',
  (locale) => {
    const { body } = render(GeometryOverlay, {
      props: { layout: 'B', locale, onapply: () => {}, oncancel: () => {} },
    });
    expect(body).toContain('role="dialog"');
    expect(body).toContain('aria-modal="true"');
    expect(body.match(/class="schematic/g)).toHaveLength(3);
    expect(body.match(/aria-pressed="true"/g)).toHaveLength(1);
    for (const layout of layouts)
      expect(body).toContain(`data-layout="${layout}"`);
    expect(body).toContain('ESC /');
    expect(body).toContain('ENTER /');
  },
);

it('updates only the existing layout field through A → B → C → A with a live conversation', async () => {
  vi.useFakeTimers();
  const configuration = createSetup().configuration;
  const original = configuration;
  let records: unknown = [];
  const session = createCommunicationSession(
    'aura',
    'ru',
    (state) => (records = state.records),
    () => {},
    conversationEngine,
    true,
  );
  try {
    session.submit('Что делает меня мной?');
    await vi.runAllTimersAsync();
    session.submit('Почему?');
    await vi.runAllTimersAsync();
    const before = {
      memory: session.inspectWorkingMemory(),
      character: session.inspectCharacter(),
      history: session.inspectResponseHistory(),
      records,
    };
    const settings = { ...configuration };
    for (const layout of ['B', 'C', 'A'] as const) {
      applyDisplayGeometry(configuration, layout);
      expect(configuration).toBe(original);
      expect(configuration).toEqual({ ...settings, layout });
      expect(session.inspectWorkingMemory()).toEqual(before.memory);
      expect(session.inspectCharacter()).toEqual(before.character);
      expect(session.inspectResponseHistory()).toEqual(before.history);
      expect(records).toBe(before.records);
    }
    expect(session.submit('Продолжай.')).toBe(true);
    await vi.runAllTimersAsync();
    expect(session.inspectWorkingMemory().currentThread).toBeDefined();
  } finally {
    session.cancel();
    vi.useRealTimers();
  }
});
