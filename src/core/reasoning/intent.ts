import type { Locale } from '../language/locale.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
import type { ReasoningIntent, ReasoningFrame } from './model.ts';
export function reasoningIntent(
  text: string,
  locale: Locale,
): ReasoningIntent | undefined {
  const s = normalizeConceptText(text);
  const choose = (frame: ReasoningFrame): ReasoningIntent => ({
    frame,
    evidence: s,
    contextual: false,
  });
  if (locale === 'ru') {
    if (/^почему .+ (?:доказывает|доказывают|доказательств)/u.test(s))
      return choose('criterion');
    if (/^допустим .+(?:останется|сохранится)/u.test(s))
      return choose('relate');
    if (/(?:^| )значит .+/u.test(s)) return choose('consequence');

    if (/^(?:как отличить .+ от .+|по какому признаку .+)$/u.test(s))
      return choose('criterion');
    if (/^(?:чем .+ отличается от .+|в чем разница между .+ и .+)$/u.test(s))
      return choose('distinguish');
    if (/^(?:что такое .+|что значит .+)$/u.test(s)) return choose('define');
    if (/^если .+/u.test(s))
      return choose(text.includes('?') ? 'consequence' : 'counterpressure');
    if (/^что (?:тогда )?следует из .+/u.test(s)) return choose('consequence');
    if (
      /^(?:может ли .+ (?:существовать без|быть) .+|связаны ли .+ и .+|как .+ связан[оыа]? с .+|.+ и .+ связаны|можно ли .+ оставаясь .+)$/u.test(
        s,
      )
    )
      return choose('relate');
    if (/^может ли (?:машина|система) .+/u.test(s)) return choose('criterion');
    if (/^(?:я считаю|я думаю) .+/u.test(s)) return choose('counterpressure');
  } else {
    if (/^why .+ (?:prove|establish)/u.test(s)) return choose('criterion');
    if (/^suppose .+(?:remain|survive)/u.test(s)) return choose('relate');
    if (/(?:^| )does that mean .+/u.test(s)) return choose('consequence');

    if (
      /^(?:how (?:can|do) .+ (?:distinguish|distinguished) .+|what criterion .+)$/u.test(
        s,
      )
    )
      return choose('criterion');
    if (
      /^(?:how (?:is|does) .+ differ(?:ent)? from .+|what is the difference between .+ and .+)$/u.test(
        s,
      )
    )
      return choose('distinguish');
    if (/^(?:what is .+|what does .+ mean)$/u.test(s)) return choose('define');
    if (/^if .+/u.test(s))
      return choose(text.includes('?') ? 'consequence' : 'counterpressure');
    if (/^what follows (?:if|from) .+/u.test(s)) return choose('consequence');
    if (
      /^(?:can .+ (?:exist without|be) .+|how are .+ and .+ related|are .+ and .+ (?:related|connected)|can .+ while .+)$/u.test(
        s,
      )
    )
      return choose('relate');
    if (/^can (?:a machine|a system) .+/u.test(s)) return choose('criterion');
    if (/^i (?:think|believe) .+/u.test(s)) return choose('counterpressure');
  }
  return undefined;
}
