import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { displayStandards } from './standards';

const css = readFileSync(new URL('./standards.css', import.meta.url), 'utf8');
const contract = [
  'background',
  'surface',
  'text-primary',
  'text-secondary',
  'text-muted',
  'rule-primary',
  'rule-secondary',
  'accent',
  'state-positive',
  'state-dormant',
].map((name) => `--display-${name}`);
function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

describe('authored display standards', () => {
  it('contains exactly the three authored standards', () => {
    expect(
      [...css.matchAll(/data-display-standard='([^']+)'/g)].map(
        (match) => match[1],
      ),
    ).toEqual([...displayStandards]);
  });
  it.each(displayStandards)(
    '%s implements the whole contract with readable text',
    (standard) => {
      const block = css.match(
        new RegExp(
          `\\[data-display-standard='${standard}'\\]\\s*\\{([^}]+)\\}`,
        ),
      )![1]!;
      const tokens = Object.fromEntries(
        [...block.matchAll(/(--display-[\w-]+):\s*(#[\da-f]{6})/g)].map(
          (match) => [match[1]!, match[2]!],
        ),
      );
      expect(Object.keys(tokens).sort()).toEqual([...contract].sort());
      for (const role of ['text-primary', 'text-secondary', 'text-muted']) {
        const ratio =
          (luminance(tokens[`--display-${role}`]!) + 0.05) /
          (luminance(tokens['--display-surface']!) + 0.05);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
