import { describe, expect, it } from 'vitest';
import { supportedLocales } from '../core/language/locale';
import { systemMessages } from './system';

describe('system localization contract', () => {
  it('provides the same nonempty message keys for every supported locale', () => {
    const expectedKeys = Object.keys(systemMessages.en).sort();
    for (const locale of supportedLocales) {
      const messages = systemMessages[locale];
      expect(Object.keys(messages).sort()).toEqual(expectedKeys);
      for (const value of Object.values(messages)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
