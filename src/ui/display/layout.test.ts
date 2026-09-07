import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ReferenceComposition from './ReferenceComposition.svelte';
import { createSetup, updateSetup, layouts } from '../setup/model';
import { characterIds } from '../../core/character/id';

describe('authored terminal layouts', () => {
  it.each(layouts)(
    '%s uses the same terminal and portrait source for every character',
    (layout) => {
      for (const character of characterIds) {
        const { body } = render(ReferenceComposition, {
          props: {
            layout,
            character,
            locale: 'ru',
            active: true,
            reducedMotion: true,
          },
        });
        expect(body).toContain(`data-layout="${layout}"`);
        expect(body).toContain(`ЭКРАН / ${layout}`);
        expect(body.match(/<input\b/g)).toHaveLength(1);
        expect(body.match(/<img\b/g)).toHaveLength(1);
        expect(body).toContain(`/portraits/${character}/neutral.png`);
        expect(body).toContain(`width="${layout === 'C' ? 72 : 144}"`);
        expect(body).toContain(`height="${layout === 'C' ? 90 : 180}"`);
        expect(body).not.toContain('640 × 400');
        expect(body).toContain('aria-keyshortcuts="F2"');
        expect(body).toContain('aria-haspopup="dialog"');
        expect(body).toContain('communication-label');
        expect(body).toContain('visual-label');
        const caption = body.match(
          /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/,
        )?.[1];
        expect(caption).toContain('ЭКЗЕМПЛЯР /');
        expect(caption).toContain(character.toUpperCase());
        expect(body).not.toMatch(/class="instance(?:\s|")/);
        expect(body).not.toMatch(/#[0-9a-f]{6}/i);
      }
    },
  );
  it('retains geometry independently of display standard through setup completion', () => {
    for (const layout of layouts)
      for (const standard of ['civic', 'phosphor', 'amber'] as const) {
        let model = updateSetup(createSetup(), {
          type: 'language',
          value: 'ru',
        });
        model = updateSetup(model, { type: 'layout', value: layout });
        model = updateSetup(model, { type: 'standard', value: standard });
        model = updateSetup(model, { type: 'audio', value: false });
        expect(model.configuration.layout).toBe(layout);
        expect(model.configuration.displayStandard).toBe(standard);
      }
  });
});

it.each(layouts)(
  '%s keeps English instance identity inside the portrait figure',
  (layout) => {
    const { body } = render(ReferenceComposition, {
      props: {
        layout,
        character: 'aletheia',
        locale: 'en',
        active: true,
        reducedMotion: true,
      },
    });
    const figure = body.match(/<figure[^>]*>([\s\S]*?)<\/figure>/)?.[1];
    expect(figure).toContain('<img');
    expect(figure).toContain('INSTANCE /');
    expect(figure).toContain('ALETHEIA');
    expect(body.match(/INSTANCE \//g)).toHaveLength(1);
  },
);
