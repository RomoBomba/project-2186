import { expect, it } from 'vitest';
import { characterIds } from '../core/character/id';
import { supportedLocales } from '../core/language/locale';
import { phase4Response, phase4Responses } from './phase4-responses';
import { terminalMessages } from '../locales/terminal';
it('provides three bilingual fixtures for every identity and cycles deterministically', () => {
  for (const locale of supportedLocales) {
    expect(Object.keys(phase4Responses[locale])).toEqual([...characterIds]);
    for (const character of characterIds) {
      const responses = phase4Responses[locale][character];
      expect(responses).toHaveLength(3);
      for (const [index, response] of responses.entries()) {
        expect(response.trim().length).toBeGreaterThan(0);
        expect(phase4Response(character, locale, index)).toBe(response);
        expect(phase4Response(character, locale, index + 3)).toBe(response);
      }
    }
    expect(Object.keys(terminalMessages[locale]).sort()).toEqual(
      Object.keys(terminalMessages.en).sort(),
    );
    expect(Object.values(terminalMessages[locale]).every((s) => s.trim())).toBe(
      true,
    );
  }
  expect(
    new Set(characterIds.map((c) => phase4Response(c, 'ru', 0))).size,
  ).toBe(3);
});
