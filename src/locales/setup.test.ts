import { describe, expect, it } from 'vitest';
import { supportedLocales } from '../core/language/locale';
import { languageChoices, setupMessages } from './setup';

describe('setup localization', () => {
  it('provides equivalent, nonempty Russian and English resources', () => {
    for (const locale of supportedLocales) {
      expect(Object.keys(setupMessages[locale]).sort()).toEqual(
        Object.keys(setupMessages.en).sort(),
      );
      for (const message of Object.values(setupMessages[locale]))
        expect(message.trim().length).toBeGreaterThan(0);
    }
    expect(languageChoices.map((choice) => choice.value)).toEqual(
      supportedLocales,
    );
  });
});
