import { describe, expect, it } from 'vitest';
import { displayStandards } from '../display/standards';
import { createSetup, layouts, updateSetup } from './model';

function geometrySetup() {
  return updateSetup(createSetup(), { type: 'language', value: 'ru' });
}

describe('first-run configuration', () => {
  it('progresses in authored order and preserves the full configuration', () => {
    let model = createSetup();
    const stages = [model.stage];
    model = updateSetup(model, { type: 'language', value: 'ru' });
    stages.push(model.stage);
    model = updateSetup(model, { type: 'layout', value: 'B' });
    stages.push(model.stage);
    model = updateSetup(model, { type: 'standard', value: 'phosphor' });
    stages.push(model.stage);
    model = updateSetup(model, { type: 'audio', value: true });
    stages.push(model.stage);
    expect(stages).toEqual([
      'language',
      'layout',
      'standard',
      'audio',
      'complete',
    ]);
    expect(model.configuration).toEqual({
      language: 'ru',
      displayStandard: 'phosphor',
      layout: 'B',
      audioEnabled: true,
    });
  });
  it.each(['ru', 'en'] as const)(
    'sets %s before the subsequent stage',
    (language) => {
      const initial = createSetup();
      const next = updateSetup(initial, { type: 'language', value: language });
      expect(next.configuration.language).toBe(language);
      expect(next.stage).toBe('layout');
      expect(initial.stage).toBe('language');
    },
  );
  it.each(displayStandards)(
    'confirms %s and retains it through backward navigation',
    (standard) => {
      const model = updateSetup(createSetup(), {
        type: 'language',
        value: 'en',
      });
      const next = updateSetup(
        updateSetup(model, { type: 'layout', value: 'A' }),
        { type: 'standard', value: standard },
      );
      expect(next.stage).toBe('audio');
      expect(
        updateSetup(next, { type: 'back' }).configuration.displayStandard,
      ).toBe(standard);
    },
  );
  it.each(layouts)(
    'records layout %s without creating a terminal',
    (layout) => {
      const next = updateSetup(geometrySetup(), {
        type: 'layout',
        value: layout,
      });
      expect(next.stage).toBe('standard');
      expect(next.configuration.layout).toBe(layout);
    },
  );
  it('allows audio revision without losing the display standard', () => {
    let model = updateSetup(geometrySetup(), { type: 'layout', value: 'C' });
    model = updateSetup(model, { type: 'standard', value: 'civic' });
    model = updateSetup(model, { type: 'audio', value: true });
    expect(model.configuration.audioEnabled).toBe(true);
    model = updateSetup(model, { type: 'back' });
    model = updateSetup(model, { type: 'audio', value: false });
    expect(model.stage).toBe('complete');
    expect(model.configuration).toEqual({
      language: 'ru',
      displayStandard: 'civic',
      layout: 'C',
      audioEnabled: false,
    });
    expect(JSON.parse(JSON.stringify(model.configuration))).toEqual(
      model.configuration,
    );
  });
  it('walks back without clearing values', () => {
    let model = updateSetup(geometrySetup(), { type: 'layout', value: 'B' });
    for (const expected of ['layout', 'language', 'language', 'language']) {
      model = updateSetup(model, { type: 'back' });
      expect(model.stage).toBe(expected);
    }
    expect(model.configuration.layout).toBe('B');
  });
  it('rejects out-of-order actions and defaults fresh sessions to CIVIC', () => {
    const model = createSetup();
    expect(updateSetup(model, { type: 'standard', value: 'amber' })).toBe(
      model,
    );
    expect(updateSetup(model, { type: 'audio', value: true })).toBe(model);
    expect(model.configuration).toEqual({
      language: 'en',
      displayStandard: 'civic',
      layout: 'A',
      audioEnabled: false,
    });
  });
});
