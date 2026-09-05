import { describe, expect, it } from 'vitest';
import { supportedLocales } from '../core/language/locale';
import { bootMessages } from './boot';

describe('boot localization contract', () => {
  it('provides matching nonempty resources for Russian and English', () => {
    for (const locale of supportedLocales) {
      expect(Object.keys(bootMessages[locale]).sort()).toEqual(
        Object.keys(bootMessages.en).sort(),
      );
      for (const value of Object.values(bootMessages[locale])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
