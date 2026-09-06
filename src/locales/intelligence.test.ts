import { expect, it } from 'vitest';
import { characterIds } from '../core/character/id';
import { supportedLocales } from '../core/language/locale';
import { intelligenceMessages } from './intelligence';
it('provides complete equivalent selection resources for both languages and all three identities', () => {
  for (const locale of supportedLocales) {
    const copy = intelligenceMessages[locale];
    expect(Object.keys(copy).sort()).toEqual(
      Object.keys(intelligenceMessages.en).sort(),
    );
    expect(Object.keys(copy.characters)).toEqual([...characterIds]);
    for (const [key, value] of Object.entries(copy)) {
      if (key !== 'characters') expect(String(value).trim()).not.toBe('');
    }
    for (const id of characterIds) {
      expect(Object.keys(copy.characters[id]).sort()).toEqual([
        'description',
        'origin',
      ]);
      expect(copy.characters[id].origin.trim()).not.toBe('');
      expect(copy.characters[id].description.trim()).not.toBe('');
    }
  }
});
