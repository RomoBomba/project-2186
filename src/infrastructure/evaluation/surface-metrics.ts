import { realizationVariants } from '../../characters/realization.ts';
import { limitations } from '../../characters/limitations.ts';
import { selfFactText } from '../../characters/self.ts';
import { partialBoundary } from '../../characters/reasoning.ts';
import type { Locale } from '../../core/language/locale.ts';
type Source = { key: string; text: string; kind: string };
type Sample = {
  response: string;
  recentSurfaceResponses: string[];
  surfaceSources: Source[];
  selfQuery: string | null;
  reasoning: { frame: string } | null;
};
type Row = { locale: Locale; planning: Sample[] };
const norm = (s: string) =>
  s.normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim();
const opening = (s: string) =>
  norm(s)
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 6)
    .join(' ') ?? '';
const ratio = (n: number, d: number) => ({
  numerator: n,
  denominator: d,
  rate: d ? n / d : null,
});
const alternatives = (s: Source, l: Locale) => [
  s.text,
  ...(realizationVariants[s.key]?.source[l] === s.text
    ? realizationVariants[s.key]![l]
    : []),
];
const sourcePrefix = (response: string, phrase: string) =>
  norm(response).startsWith(norm(phrase).replace(/[.]$/u, ''));
const connectors = (s: string) =>
  s
    .toLowerCase()
    .match(
      /(?:^|\s)(?:поэтому|поскольку|следовательно|therefore|because|thus|hence)(?=\s|[,:])/gu,
    )?.length ?? 0;
export function surfaceMetrics(rows: readonly Row[]) {
  const samples = rows.flatMap((c) => c.planning.map((p) => ({ c, p })));
  const repeated = samples.filter((x) => x.p.recentSurfaceResponses.length);
  const grounded = samples.filter((x) =>
    x.p.surfaceSources.some((s) => s.kind !== 'question'),
  );
  const hasNucleus = ({ c, p }: (typeof samples)[number]) => {
    let sources = p.surfaceSources.filter((s) => s.kind !== 'question');
    if (p.selfQuery === 'consciousness')
      sources = sources.filter(
        (s) => s.key === 'self:experience_unestablished',
      );
    else if (
      sources.some(
        (s) => !['qualification', 'boundary', 'tension'].includes(s.kind),
      )
    )
      sources = sources.filter(
        (s) => !['qualification', 'boundary', 'tension'].includes(s.kind),
      );
    return sources.some((s) =>
      alternatives(s, c.locale).some((t) => sourcePrefix(p.response, t)),
    );
  };
  const bank = (l: Locale) => [
    partialBoundary[l],
    selfFactText[l].experience_unestablished,
    ...(realizationVariants['self:experience_unestablished']?.[l] ?? []),
    ...Object.values(limitations[l]).flat(),
  ];
  const limited = samples.flatMap(({ c, p }) =>
    bank(c.locale)
      .filter((t) => p.response.includes(t))
      .map((t) => ({ p, t })),
  );
  return {
    exactResponseRepeatRate: ratio(
      repeated.filter(({ p }) =>
        p.recentSurfaceResponses.some((t) => norm(t) === norm(p.response)),
      ).length,
      repeated.length,
    ),
    repeatedOpeningRate: ratio(
      repeated.filter(({ p }) =>
        p.recentSurfaceResponses.some(
          (t) => opening(t) === opening(p.response),
        ),
      ).length,
      repeated.length,
    ),
    repeatedLimitationPhraseRate: ratio(
      limited.filter(({ p, t }) =>
        p.recentSurfaceResponses.some((old) => old.includes(t)),
      ).length,
      limited.length,
    ),
    answerNucleusPresenceRate: ratio(
      grounded.filter(hasNucleus).length,
      grounded.length,
    ),
    questionBeforeAnswerRate: ratio(
      grounded.filter(({ p }) => /^[^.!?]*[?]/u.test(p.response)).length,
      grounded.length,
    ),
    unsupportedConnectorRate: ratio(
      samples.filter(
        ({ p }) =>
          connectors(p.response) >
          p.surfaceSources.reduce((n, s) => n + connectors(s.text), 0),
      ).length,
      samples.length,
    ),
    characterSurfaceDifferentiationRate: ratio(
      rows.filter(
        (r) => new Set(r.planning.map((p) => norm(p.response))).size > 1,
      ).length,
      rows.length,
    ),
  };
}
