import type { ConceptId } from '../knowledge/model.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
import type { Locale } from '../language/locale.ts';
import type { ConceptEvidence } from '../reasoning/model.ts';
import type { ReasoningFocus } from '../reasoning/focus.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { SelfQuery } from '../self/query.ts';

export const userStances = [
  'asserts',
  'supports',
  'rejects',
  'doubts',
  'revises',
  'asks_about',
  'unknown',
] as const;
export type UserStance = (typeof userStances)[number];
export type SystemMove =
  | 'supports'
  | 'challenges'
  | 'qualifies'
  | 'distinguishes'
  | 'withholds'
  | 'asks'
  | 'neutral';
export type PropositionKind =
  | 'assertion'
  | 'negation'
  | 'dependence'
  | 'equivalence'
  | 'difference'
  | 'consequence'
  | 'uncertainty';
export type PropositionFocus = {
  scope: 'general' | 'self';
  concepts: ConceptId[];
  relationId?: string;
  kind: PropositionKind;
  polarity: 'positive' | 'negative' | 'unspecified';
  // A linguistic predicate, not a truth value or executable implication.
  predicate:
    'defines' | 'excludes' | 'requires' | 'differs' | 'relates' | 'unspecified';
  direction?: { from: ConceptId; to: ConceptId };
  userStance: UserStance;
  stanceTarget: 'user_proposition' | 'system_move';
  systemMove: SystemMove;
  originTurn: number;
  lastReferencedTurn: number;
  locale: Locale;
  source: 'explicit_claim' | 'contextual_stance' | 'self_assertion';
  confidence: number;
  groundingKeys: string[];
  previousForm?: {
    kind: PropositionKind;
    polarity: PropositionFocus['polarity'];
    predicate: PropositionFocus['predicate'];
    turn: number;
  };
};
export type PropositionResolution = {
  userStance: UserStance;
  resolved: boolean;
  candidate?: PropositionFocus;
  justification?: boolean;
  contradiction?: 'explicit_opposition';
  selfQuery?: SelfQuery;
  evidence?: ConceptEvidence[];
};
export type PropositionPlan = {
  focus: PropositionFocus;
  userStance: UserStance;
  systemMove: SystemMove;
  previousSystemMove?: SystemMove;
  justification: boolean;
  contradiction?: 'explicit_opposition';
};

/** Closed discourse constructions. Topic words alone never create a user position. */
export function resolveProposition(
  text: string,
  locale: Locale,
  turn: number,
  previous: PropositionFocus | undefined,
  reasoning: ReasoningFocus | undefined,
  evidence: readonly ConceptEvidence[],
): PropositionResolution {
  const s = normalizeConceptText(text);
  const old =
    previous &&
    previous.locale === locale &&
    turn - previous.lastReferencedTurn < 3
      ? previous
      : undefined;
  const ru = locale === 'ru';
  const short: [UserStance, RegExp][] = ru
    ? [
        [
          'asks_about',
          /^(?:почему|почему ты (?:с этим )?не согласна|почему ты (?:с этим )?не согласен|почему ты это оспариваешь|что именно ты оспариваешь)$/u,
        ],
        [
          'supports',
          /^(?:согласен|согласна|я согласен|я согласна|да именно|да именно это я и имею в виду|ну да)$/u,
        ],
        [
          'rejects',
          /^(?:нет )?(?:я (?:с этим |с тобой )?)?не соглас(?:ен|на)$/u,
        ],
        ['rejects', /^нет наоборот$/u],
        [
          'doubts',
          /^(?:я )?(?:не уверен|не уверена|возможно|может быть|не знаю)$/u,
        ],
        [
          'revises',
          /^(?:ладно )?(?:возможно )?я (?:передумал|передумала|был неправ|была неправа)$/u,
        ],
        ['asserts', /^я все равно так думаю$/u],
        ['asks_about', /^а если все таки$/u],
      ]
    : [
        [
          'asks_about',
          /^(?:why|why do you disagree|why do you challenge (?:that|this)|what exactly do you challenge)$/u,
        ],
        [
          'supports',
          /^(?:i agree|agreed|yes exactly|yes that is what i mean)$/u,
        ],
        [
          'rejects',
          /^(?:no )?i disagree(?: with (?:that|you))?$|^no the opposite$/u,
        ],
        [
          'doubts',
          /^(?:i am not sure|i'm not sure|maybe|perhaps|i don't know)$/u,
        ],
        ['revises', /^(?:okay )?(?:maybe )?i (?:changed my mind|was wrong)$/u],
        ['asserts', /^i still think so$/u],
        ['asks_about', /^what if after all$/u],
      ];
  const brief = short.find(([, p]) => p.test(s));
  if (brief) {
    if (!old) return { userStance: 'unknown', resolved: false };
    const stance = brief[0];
    const justification =
      stance === 'asks_about' && /почему|оспариваешь|why|challenge/u.test(s);
    return {
      resolved: true,
      userStance: stance,
      justification,
      candidate: {
        ...old,
        source: 'contextual_stance',
        userStance: stance,
        stanceTarget:
          stance === 'rejects' || justification
            ? 'system_move'
            : 'user_proposition',
        lastReferencedTurn: turn + 1,
      },
    };
  }
  const selfAssertion = ru
    ? /^(?:нет )?(?:мне кажется|я (?:думаю|считаю|уверен|уверена)) (?:что )?ты (?:сознательна|сознательная|чувствуешь)$/u.test(
        s,
      )
    : /^(?:no )?i (?:think|believe|am sure) (?:that )?you (?:are conscious|feel)$/u.test(
        s,
      );
  const selfSupport =
    old?.scope === 'self' &&
    (ru
      ? /^но ты ведь рассуждаешь и помнишь меня$/u
      : /^but you reason and remember me$/u
    ).test(s);
  if (selfAssertion || selfSupport) {
    const focus: PropositionFocus = {
      scope: 'self',
      concepts: [],
      kind: 'assertion',
      polarity: 'positive',
      predicate: 'unspecified',
      userStance: 'asserts',
      stanceTarget: 'user_proposition',
      systemMove: 'neutral',
      originTurn: old?.scope === 'self' ? old.originTurn : turn + 1,
      lastReferencedTurn: turn + 1,
      locale,
      source: 'self_assertion',
      confidence: 0.95,
      groundingKeys: [],
    };
    return {
      resolved: !!old,
      userStance: 'asserts',
      candidate: focus,
      selfQuery: {
        kind: 'consciousness',
        evidence: 'explicit_subjective_attribution',
        contextual: !!old,
      },
    };
  }
  const contextualQuestion =
    old &&
    text.includes('?') &&
    (ru
      ? /^(?:тогда|а если|почему|что именно) /u
      : /^(?:then|what if|why|what exactly) /u
    ).test(s) &&
    evidence.length > 0 &&
    evidence.every((e) => old.concepts.includes(e.conceptId));
  if (contextualQuestion)
    return {
      resolved: true,
      userStance: 'asks_about',
      candidate: {
        ...old,
        userStance: 'asks_about',
        stanceTarget: 'user_proposition',
        source: 'contextual_stance',
        lastReferencedTurn: turn + 1,
      },
    };
  // A question is not the assertion of its premise. Unsupported questions never acquire an ideology.
  if (
    text.includes('?') ||
    (ru
      ? /^(?:что|как|почему|может ли|можно ли|чем) /u
      : /^(?:what|why|how|can|does|is|are) /u
    ).test(s)
  )
    return { userStance: 'unknown', resolved: false };
  // A few explicit claim constructions supply their named operands, not aliases or scores.
  const claimEvidence: ConceptEvidence[] = [];
  if (
    (ru
      ? /^если (?:запись потеряна|архивов нет).+(?:истин|правд)/u
      : /^if (?:the record is lost|archives are gone).+truth/u
    ).test(s)
  )
    claimEvidence.push({
      conceptId: 'world.archives',
      source: 'proposition_pattern',
      term: 'lost_record_claim',
    });
  if (
    (ru
      ? /без памяти я уже не буду собой/u
      : /without memory i will no longer be myself/u
    ).test(s)
  )
    claimEvidence.push({
      conceptId: 'identity.self',
      source: 'proposition_pattern',
      term: 'personal_dependence_claim',
    });
  if (
    !ru &&
    /memory is what makes a person (?:themselves|who they are)/u.test(s)
  )
    claimEvidence.push({
      conceptId: 'identity.self',
      source: 'proposition_pattern',
      term: 'personal_identity_definition',
    });
  const ids = [
    ...new Set([...claimEvidence, ...evidence].map((e) => e.conceptId)),
  ];
  const boundedReference =
    old?.scope === 'general' &&
    (ru
      ? /^(?:нет история объекта для меня не имеет значения|но без источников у нас же нет оснований)$/u
      : /^(?:no the history of the object does not matter to me|but without sources we have no grounds)$/u
    ).test(s);
  if (
    boundedReference &&
    (s.includes('история') || s.includes('history')
      ? old!.concepts.includes('art.originality')
      : old!.concepts.includes('philosophy.truth'))
  ) {
    return {
      resolved: true,
      userStance: 'asserts',
      candidate: {
        ...old!,
        userStance: 'asserts',
        stanceTarget: 'user_proposition',
        source: 'contextual_stance',
        lastReferencedTurn: turn + 1,
      },
    };
  }
  const compatible =
    old?.scope === 'general' &&
    ids.some((id) => old.concepts.includes(id)) &&
    (ids.every((id) => old.concepts.includes(id)) ||
      (ru
        ? /^(?:но ведь|тогда возможно|ладно|я передумал)/u
        : /^(?:but |then (?:perhaps|maybe)|okay|i changed my mind)/u
      ).test(s));
  const negated = (
    ru
      ? /(?:^| )(?:не|нет|никогда|невозможно)(?: |$)/u
      : /(?:^| )(?:not|no|never|cannot|impossible)(?: |$)/u
  ).test(s);
  const revises = (
    ru
      ? /(?:ладно|я передумал|я передумала|я был неправ|я была неправа|слишком быстро приравнял)|^(?:тогда )?(?:наверное|возможно) .+(?:не может быть единственным|еще не|не означает)/u
      : /(?:i changed my mind|i was wrong|too quickly equated)|^(?:okay |then )?(?:maybe |perhaps ).+(?:not |doesn't|does not|cannot be the only)/u
  ).test(s);
  const doubtful = (
    ru
      ? /^(?:я не уверен|я не уверена|мне кажется|возможно|наверное)/u
      : /^(?:i am not sure|i'm not sure|maybe|perhaps)/u
  ).test(s);
  const predicates: [PropositionFocus['predicate'], PropositionKind, RegExp][] =
    ru
      ? [
          [
            'defines',
            'equivalence',
            /(?:определяет|и есть|это и есть|делает человека (?:тем же человеком|собой))/u,
          ],
          ['relates', 'assertion', /имеет отношения к/u],
          ['differs', 'difference', /(?:отличается|станет оригиналом)/u],
          ['requires', 'dependence', /(?:без памяти|единственным основанием)/u],
          [
            'excludes',
            'consequence',
            /(?:если .+|наличие причины|причина еще).+(?:свобод|выбор|невозможно)|свободы нет если .+причин/u,
          ],
          [
            'unspecified',
            'assertion',
            /(?:я (?:все равно )?(?:считаю|думаю)|но ведь .+меняются|для меня не имеет значения|без источников .+нет оснований)/u,
          ],
        ]
      : [
          [
            'defines',
            'equivalence',
            /(?:defines|determines|is what makes|makes a person|is identity)/u,
          ],
          ['relates', 'assertion', /(?:related to|relation to)/u],
          [
            'differs',
            'difference',
            /(?:different from|differ from|become an original)/u,
          ],
          ['requires', 'dependence', /(?:without memory|only basis)/u],
          [
            'excludes',
            'consequence',
            /(?:if .+|having a cause).+(?:freedom|choice|impossible)|no freedom if .+cause/u,
          ],
          [
            'unspecified',
            'assertion',
            /(?:i (?:still )?(?:think|believe)|but memories change|does not matter to me|without sources .+no grounds)/u,
          ],
        ];
  const predicate = predicates.find(([, , p]) => p.test(s));
  if (
    !predicate ||
    (!ids.length && !compatible) ||
    (!compatible && ids.length < 2 && !negated)
  )
    return { userStance: 'unknown', resolved: false };
  const same = !!compatible;
  const stance: UserStance =
    same && revises ? 'revises' : doubtful ? 'doubts' : 'asserts';
  const concepts =
    same && ids.every((id) => old!.concepts.includes(id))
      ? old!.concepts
      : ids.slice(0, 2);
  const candidate: PropositionFocus = {
    scope: 'general',
    concepts,
    ...(same &&
    old!.relationId &&
    concepts.every((id) => old!.concepts.includes(id))
      ? { relationId: old!.relationId }
      : {}),
    kind: doubtful ? 'uncertainty' : predicate[1],
    polarity:
      doubtful && !revises ? 'unspecified' : negated ? 'negative' : 'positive',
    predicate: predicate[0],
    userStance: stance,
    stanceTarget: 'user_proposition',
    systemMove: 'neutral',
    originTurn: same ? old!.originTurn : turn + 1,
    lastReferencedTurn: turn + 1,
    locale,
    source: 'explicit_claim',
    confidence: 0.9,
    groundingKeys: [],
  };
  if (candidate.predicate === 'excludes' && (!doubtful || revises)) {
    candidate.polarity = (ru
      ? /(?:не означает|не отменяет|не исключает)/u
      : /(?:does not|doesn't) (?:mean|eliminate|exclude)/u
    ).test(s)
      ? 'negative'
      : 'positive';
  }
  if (
    candidate.predicate === 'excludes' &&
    concepts.includes('science.causality') &&
    concepts.includes('philosophy.freedom')
  )
    candidate.direction = {
      from: 'science.causality',
      to: 'philosophy.freedom',
    };
  if (
    candidate.predicate === 'defines' &&
    concepts.includes('identity.memory')
  ) {
    const target = concepts.find(
      (id) => id === 'identity.self' || id === 'identity.continuity',
    );
    if (target) candidate.direction = { from: 'identity.memory', to: target };
  }
  if (candidate.predicate === 'requires') {
    const target = concepts.find(
      (id) => id === 'philosophy.consciousness' || id === 'identity.self',
    );
    const withoutMemory = (ru ? /без памяти/u : /without memory/u).test(s);
    if (withoutMemory && target && concepts.includes('identity.memory')) {
      candidate.direction = { from: target, to: 'identity.memory' };
      candidate.polarity = doubtful ? 'unspecified' : 'positive';
    } else {
      // Denying a sole basis is not denying every dependency. Leave that relation unspecified.
      candidate.predicate = 'unspecified';
    }
  }
  // Only explicit opposite polarity of the SAME relation predicate is diagnostic.
  const opposition =
    same &&
    concepts.length === old!.concepts.length &&
    concepts.every((id) => old!.concepts.includes(id)) &&
    candidate.predicate !== 'unspecified' &&
    (old!.predicate === candidate.predicate ||
      (old!.predicate === 'defines' && candidate.predicate === 'relates')) &&
    old!.polarity !== 'unspecified' &&
    candidate.polarity !== 'unspecified' &&
    old!.polarity !== candidate.polarity;
  if (
    same &&
    (old!.kind !== candidate.kind ||
      old!.polarity !== candidate.polarity ||
      old!.predicate !== candidate.predicate)
  )
    candidate.previousForm = {
      kind: old!.kind,
      polarity: old!.polarity,
      predicate: old!.predicate,
      turn: old!.lastReferencedTurn,
    };
  // A previous reasoning focus may supply compatible missing operands, never new lexical scores.
  if (
    same &&
    concepts.every((id) => reasoning?.concepts.includes(id)) &&
    reasoning?.relationId
  )
    candidate.relationId = reasoning.relationId;
  return {
    userStance: stance,
    resolved: same,
    candidate,
    ...(claimEvidence.length ? { evidence: claimEvidence } : {}),
    ...(opposition ? { contradiction: 'explicit_opposition' as const } : {}),
  };
}

export function planProposition(
  plan: ResponsePlan,
  resolution: PropositionResolution,
  previous?: PropositionFocus,
): ResponsePlan {
  const candidate = resolution.candidate;
  if (!candidate || plan.userGroundedMaterial) return plan;
  const keys = [
    ...(plan.selfMaterial?.facts.map((f) => 'self:' + f) ?? []),
    ...(plan.reasoning?.required.map(
      (r) => `relation:${r.relationId}:${r.index}`,
    ) ?? []),
    ...plan.selectedMaterial
      .filter((r) => r.kind !== 'question')
      .map((r) => `${r.conceptId}:${r.kind}:${r.index}`),
  ];
  if (!keys.length) return plan;
  if (candidate.scope === 'self' && !plan.selfMaterial) return plan;
  if (
    candidate.scope === 'general' &&
    (plan.selfMaterial ||
      !candidate.concepts.some(
        (id) =>
          plan.reasoning?.concepts.includes(id) || plan.primaryConceptId === id,
      ))
  )
    return plan;
  const move: SystemMove = plan.selfMaterial?.qualification
    ? 'withholds'
    : plan.reasoning?.frame === 'distinguish' ||
        plan.reasoning?.frame === 'criterion'
      ? 'distinguishes'
      : plan.reasoning?.frame === 'counterpressure'
        ? 'qualifies'
        : plan.strategy === 'gentle_challenge'
          ? 'challenges'
          : 'neutral';
  const focus: PropositionFocus = {
    ...candidate,
    ...(plan.reasoning?.relationId
      ? { relationId: plan.reasoning.relationId }
      : {}),
    systemMove: move,
    groundingKeys: keys.slice(0, 3),
  };
  return {
    ...plan,
    proposition: {
      focus,
      userStance: focus.userStance,
      systemMove: move,
      justification: !!resolution.justification,
      ...(previous ? { previousSystemMove: previous.systemMove } : {}),
      ...(resolution.contradiction
        ? { contradiction: resolution.contradiction }
        : {}),
    },
  };
}

export function advanceProposition(
  previous: PropositionFocus | undefined,
  plan: ResponsePlan,
  used: readonly string[],
  turn: number,
  locale: Locale,
  focus?: ReasoningFocus,
): PropositionFocus | undefined {
  if (plan.proposition) {
    const p = plan.proposition.focus;
    const realized = p.groundingKeys.filter((key) =>
      key.startsWith('self:')
        ? !!plan.selfMaterial?.facts.some((f) => key === 'self:' + f)
        : used.includes(key),
    );
    if (realized.length) return { ...p, groundingKeys: realized.slice(0, 3) };
  }
  if (
    !previous ||
    previous.locale !== locale ||
    turn - previous.lastReferencedTurn >= 3
  )
    return undefined;
  if (plan.selfMaterial && previous.scope !== 'self') return undefined;
  if (
    focus &&
    (focus.scope !== previous.scope ||
      (focus.scope === 'general' &&
        focus.concepts.some((id) => !previous.concepts.includes(id))))
  )
    return undefined;
  return previous;
}
