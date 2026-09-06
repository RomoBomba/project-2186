import { describe, expect, it } from 'vitest';
import { characterIds } from '../../core/character/id';
import { createSelection, updateSelection } from './model';
describe('intelligence selection', () => {
  it('starts at ALETHEIA and wraps in both directions', () => {
    let model = createSelection();
    expect(model).toEqual({ stage: 'selection', focused: 'aletheia' });
    model = updateSelection(model, { type: 'move', direction: -1 });
    expect(model).toEqual({ stage: 'selection', focused: 'themis' });
    for (const character of characterIds) {
      model = updateSelection(model, { type: 'move', direction: 1 });
      expect(model).toEqual({ stage: 'selection', focused: character });
    }
  });
  it.each(characterIds)(
    'confirms %s by direct selection and carries identity into the shell',
    (character) => {
      const confirmed = updateSelection(createSelection(), {
        type: 'confirm',
        character,
      });
      expect(confirmed).toEqual({ stage: 'confirmation', selected: character });
      expect(updateSelection(confirmed, { type: 'move', direction: 1 })).toBe(
        confirmed,
      );
      const shell = updateSelection(confirmed, { type: 'settle' });
      expect(shell).toEqual({ stage: 'shell', selected: character });
      expect(
        updateSelection(shell, { type: 'confirm', character: 'aletheia' }),
      ).toBe(shell);
    },
  );
  it('can move focus without confirming and ignores premature settlement', () => {
    const initial = createSelection();
    expect(updateSelection(initial, { type: 'settle' })).toBe(initial);
    expect(
      updateSelection(initial, { type: 'focus', character: 'aura' }),
    ).toEqual({ stage: 'selection', focused: 'aura' });
    expect(initial.stage).toBe('selection');
  });
});
