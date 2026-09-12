import { inflectionEvidence } from './inflection.ts';
import { partialBoundary } from '../../characters/reasoning.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import { materialKey } from '../conversation/model.ts';
import {
  readMaterial,
  references,
  sentenceCount,
} from '../conversation/material.ts';
import type { Perception } from '../conversation/perception.ts';
import type { ConceptGraph } from '../knowledge/graph.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { Locale } from '../language/locale.ts';
import type { WorkingMemory } from '../memory/working.ts';
import type { FollowUpResolution } from './follow-up.ts';
import { operandEvidence, RelationIndex } from './relations.ts';
import {
  relationKey,
  type ConceptEvidence,
  type ConceptRelation,
} from './model.ts';

/** Planning consumes authored relations; association edges never imply a proposition. */
export function planReasoning(
  base: ResponsePlan,
  text: string,
  perception: Perception,
  memory: WorkingMemory,
  graph: ConceptGraph,
  index: RelationIndex,
  vocabulary: Partial<Record<ConceptId, Record<Locale, readonly string[]>>>,
  locale: Locale,
  resolution: FollowUpResolution = { resolved: false },
  propositionEvidence: readonly ConceptEvidence[] = [],
): ResponsePlan {
  const intent = perception.reasoningIntent;
  if (base.selfMaterial)
    return intent || resolution.resolved
      ? {
          ...base,
          reasoning: {
            frame: intent?.frame ?? resolution.focus?.frame ?? 'define',
            concepts: [],
            evidence: [],
            required: [],
            optional: [],
            basis: 'self',
          },
        }
      : base;
  if (
    base.userGroundedMaterial ||
    ['greet', 'identify_self'].includes(base.strategy)
  )
    return base;
  const focus = resolution.focus;
  const evidence: ConceptEvidence[] = perception.matches
    .filter((m) => m.score >= 85)
    .map((m) => ({ conceptId: m.conceptId, source: 'matcher' }));
  for (const item of operandEvidence(text, locale, vocabulary, graph))
    if (!evidence.some((e) => e.conceptId === item.conceptId))
      evidence.push(item);
  for (const item of propositionEvidence)
    if (
      graph.get(item.conceptId) &&
      !evidence.some((e) => e.conceptId === item.conceptId)
    )
      evidence.push(item);
  const follows = resolution.resolved && focus?.scope === 'general';
  if (!intent && !follows) return base;
  if (follows)
    for (const conceptId of focus!.concepts)
      if (!evidence.some((e) => e.conceptId === conceptId))
        evidence.push({ conceptId, source: 'working_focus' });
  const frame = follows ? focus!.frame : intent!.frame;
  const target = follows ? resolution.targets?.[0] : undefined;
  if (target && !graph.get(target)) return base;
  if (target && !evidence.some((e) => e.conceptId === target))
    evidence.unshift({
      conceptId: target,
      source: 'relation_term',
      term: text,
    });
  let relation: ConceptRelation | undefined =
    follows && !target && focus!.relationId
      ? index.get(focus!.relationId)
      : undefined;
  if (!relation) {
    const pairs: ConceptRelation[] = [];
    for (let a = 0; a < evidence.length; a++)
      for (let b = a + 1; b < evidence.length; b++) {
        const r = index.lookup(evidence[a]!.conceptId, evidence[b]!.conceptId);
        if (r && (!target || r.concepts.includes(target))) pairs.push(r);
      }
    // Input evidence precedes glossary-only pairs. Stable authored order breaks ties.
    relation = pairs.sort(
      (a, b) =>
        b.concepts.filter((id) =>
          evidence.some((e) => e.conceptId === id && e.source === 'matcher'),
        ).length -
        a.concepts.filter((id) =>
          evidence.some((e) => e.conceptId === id && e.source === 'matcher'),
        ).length,
    )[0];
  }
  const clean = { ...base };
  delete clean.contextReference;
  delete clean.questionIntent;
  delete clean.associatedConceptId;
  delete clean.primaryConceptId;
  const strategy =
    frame === 'distinguish'
      ? 'contrast'
      : frame === 'counterpressure'
        ? 'gentle_challenge'
        : 'reflect';
  if (relation) {
    const concepts = [...relation.concepts];
    const preference =
      frame === 'distinguish' || frame === 'criterion'
        ? 'distinction'
        : frame === 'counterpressure'
          ? 'boundary'
          : 'claim';
    const remainder =
      frame === 'distinguish'
        ? 'claim'
        : base.disposition.directness > 0.8
          ? 'distinction'
          : 'boundary';
    const ordered = relation.material
      .map((m, i) => ({
        m,
        i,
        fresh: !memory.history.materialKeys.includes(
          relationKey({ relationId: relation.id, index: i }),
        ),
      }))
      .sort(
        (a, b) =>
          (Number(b.fresh) - Number(a.fresh)) * 8 +
          Number(b.m.kind === preference) * 4 +
          Number(b.m.kind === remainder) -
          Number(a.m.kind === preference) * 4 -
          Number(a.m.kind === remainder),
      );
    const required: { relationId: string; index: number }[] = [];
    let combined = '';
    for (const { m, i } of ordered) {
      const ref = { relationId: relation.id, index: i };
      if (follows && memory.history.materialKeys.includes(relationKey(ref)))
        continue;
      const candidate = [combined, m.text[locale]].filter(Boolean).join(' ');
      if (
        candidate.length >
          base.desiredLength.maxCharacters -
            (follows ? partialBoundary[locale].length + 1 : 0) ||
        sentenceCount(candidate) >
          base.desiredLength.maxSentences - (follows ? 1 : 0)
      )
        continue;
      required.push(ref);
      combined = candidate;
      // One new thought per continuation; fresh answers may include one qualification.
      if (
        required.length ===
        (follows || (base.disposition.warmth > 0.75 && frame === 'relate')
          ? 1
          : 2)
      )
        break;
    }
    if (follows && !required.length) {
      const boundary = relation.material.findIndex(
        (m) => m.kind === 'boundary',
      );
      if (boundary >= 0)
        required.push({ relationId: relation.id, index: boundary });
    }
    return {
      ...clean,
      strategy,
      certainty: 'authored_view',
      primaryConceptId: relation.concepts[0],
      associatedConceptId: relation.concepts[1],
      selectedMaterial: [],
      reasoning: {
        frame,
        concepts,
        evidence: evidence.filter((e) => concepts.includes(e.conceptId)),
        relationId: relation.id,
        required,
        optional: [],
        basis: 'relation',
        ...(follows ? { partial: true } : {}),
        ...(follows ? { continuationOfTurn: focus!.lastUsedTurn } : {}),
        ...(!required.length ? { exhausted: true } : {}),
      },
    };
  }
  const inflected = locale === 'ru' ? inflectionEvidence(text) : [];
  const nounOperands = evidence.filter((e) =>
    inflected.some((noun) => noun.conceptId === e.conceptId),
  );
  const primary = follows
    ? (target ?? focus!.concepts[0])
    : (perception.matches[0]?.conceptId ??
      (nounOperands.length === 1 ? nounOperands[0]?.conceptId : undefined));
  if (!primary) return base;
  const kinds =
    target && resolution.cue === 'conditional'
      ? (['tension', 'summary', 'claim'] as const)
      : frame === 'define'
        ? (['summary', 'claim'] as const)
        : frame === 'counterpressure'
          ? (['tension', 'claim'] as const)
          : (['claim', 'summary'] as const);
  const ref = kinds
    .flatMap((k) => references(graph, primary, locale, k))
    .find((r) => {
      const item = readMaterial(graph, r, locale);
      return (
        item &&
        item.text.length <=
          base.desiredLength.maxCharacters -
            (follows ? partialBoundary[locale].length + 1 : 0) &&
        sentenceCount(item.text) <=
          base.desiredLength.maxSentences - (follows ? 1 : 0) &&
        (!memory.history.materialKeys.includes(materialKey(r)) || follows)
      );
    });
  if (!ref) return base;
  const selected = [ref];
  if (frame === 'counterpressure' && !follows) {
    const claim = references(graph, primary, locale, 'claim').find((r) => {
      const first = readMaterial(graph, ref, locale)!;
      const next = readMaterial(graph, r, locale);
      return (
        next &&
        (first.text + ' ' + next.text).length <=
          base.desiredLength.maxCharacters &&
        sentenceCount(first.text + ' ' + next.text) <=
          base.desiredLength.maxSentences
      );
    });
    if (claim && materialKey(claim) !== materialKey(ref))
      selected.unshift(claim);
  }
  const support = target
    ? focus?.concepts
        .slice()
        .reverse()
        .find((id) => id !== primary)
    : follows
      ? focus!.concepts[1]
      : undefined;
  return {
    ...clean,
    ...(support ? { associatedConceptId: support } : {}),
    strategy,
    certainty: 'authored_view',
    primaryConceptId: primary,
    selectedMaterial: selected,
    reasoning: {
      frame,
      concepts: [primary, ...(support ? [support] : [])],
      evidence: evidence.filter(
        (e) => e.conceptId === primary || e.conceptId === support,
      ),
      required: [],
      optional: [],
      basis: 'concept',
      ...(follows
        ? { partial: true, continuationOfTurn: focus!.lastUsedTurn }
        : {}),
    },
  };
}
