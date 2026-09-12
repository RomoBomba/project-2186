import { realizationVariants } from '../../characters/realization.ts';
import {
  limitations,
  stanceAcknowledgments,
  type LimitationKind,
} from '../../characters/limitations.ts';
import { selfFactText, selfQuestions } from '../../characters/self.ts';
import { sentenceCount } from '../conversation/material.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { IntelligenceContext, IntelligenceResponse } from './provider.ts';
export type SemanticRole =
  | 'nucleus'
  | 'support'
  | 'distinction'
  | 'qualification'
  | 'stance_acknowledgment'
  | 'limitation'
  | 'optional_follow_up';
export type CompositionUnit = {
  key: string;
  text: string;
  role: SemanticRole;
  variant: string;
};
export type ResponseComposition = {
  units: CompositionUnit[];
  limitation?: LimitationKind;
  shape:
    | 'single'
    | 'answer_support'
    | 'answer_boundary'
    | 'fused_pair'
    | 'answer_question';
  fusion?: 'parallel';
};
export type SurfaceHistory = {
  responses: string[];
  openings: string[];
  phrases: string[];
  recentQuestions: number;
};
export const surfaceOpening = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 6)
    .join(' ') ?? '';
export function surfaceFingerprint(s: string): string {
  let h = 2166136261;
  for (const c of s.normalize('NFC').replace(/\s+/gu, ' ').trim())
    h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  return (h >>> 0).toString(16);
}
/** Derived transient fingerprints only; no new transcript or persistent memory owner. */
export function surfaceHistory(texts: readonly string[]): SurfaceHistory {
  const recent = texts.slice(-4);
  const phrases = Object.entries(limitations).flatMap(([locale, kinds]) =>
    Object.entries(kinds).flatMap(([kind, values]) =>
      values.flatMap((s, i) =>
        recent.some((t) => t.includes(s)) ? [`${locale}:${kind}:${i}`] : [],
      ),
    ),
  );
  for (const [locale, kinds] of Object.entries(stanceAcknowledgments))
    for (const [kind, values] of Object.entries(kinds))
      values.forEach((s, i) => {
        if (recent.some((t) => t.includes(s)))
          phrases.push(`${locale}:stance:${kind}:${i}`);
      });
  return {
    responses: recent.map(surfaceFingerprint),
    openings: recent.map(surfaceOpening),
    phrases,
    recentQuestions: recent.filter((t) => t.endsWith('?')).length,
  };
}
export function unitAlternatives(
  key: string,
  source: string,
  context: IntelligenceContext,
): string[] {
  const entry = realizationVariants[key];
  if (!entry || entry.source[context.locale] !== source) return [source];
  const voice =
    context.disposition.structureBias > 0.75
      ? 2
      : context.disposition.warmth > 0.75
        ? 1
        : 0;
  const authored = entry[context.locale];
  return [authored[voice]!, ...authored.filter((_, i) => i !== voice), source];
}
export function composeResponse(
  context: IntelligenceContext,
  plan: ResponsePlan,
  original: IntelligenceResponse,
): IntelligenceResponse {
  const history = context.surfaceHistory;
  const locale = context.locale;
  const sourceUnits: CompositionUnit[] = [];
  if (
    plan.selfMaterial &&
    plan.selfMaterial.query.kind !== 'identity' &&
    plan.selfMaterial.query.kind !== 'character_difference'
  ) {
    for (const fact of plan.selfMaterial.facts)
      sourceUnits.push({
        key: 'self:' + fact,
        text: selfFactText[locale][fact],
        role:
          fact === 'experience_unestablished' || fact === 'art_status_open'
            ? 'qualification'
            : 'support',
        variant: 'source',
      });
    if (
      plan.selfMaterial.question &&
      !plan.selfMaterial.query.contextual &&
      (history?.recentQuestions ?? 0) === 0
    )
      sourceUnits.push({
        key: 'self-question:' + plan.selfMaterial.question,
        text: selfQuestions[locale][plan.selfMaterial.question],
        role: 'optional_follow_up',
        variant: 'source',
      });
    // Selected epistemic qualification is itself the answer to a consciousness query.
    const nucleus =
      plan.selfMaterial.query.kind === 'consciousness'
        ? 'self:experience_unestablished'
        : sourceUnits[0]?.key;
    sourceUnits.sort(
      (a, b) => Number(b.key === nucleus) - Number(a.key === nucleus),
    );
  } else {
    for (const key of original.usedMaterialKeys) {
      const relation = context.relationMaterial?.find(
        (m) =>
          `relation:${m.reference.relationId}:${m.reference.index}` === key,
      );
      const card = context.material.find(
        (m) =>
          `${m.reference.conceptId}:${m.reference.kind}:${m.reference.index}` ===
          key,
      );
      const text = relation?.text ?? card?.text;
      if (!text) continue;
      const kind = relation?.kind ?? card?.reference.kind;
      sourceUnits.push({
        key,
        text,
        variant: 'source',
        role:
          kind === 'question'
            ? 'optional_follow_up'
            : kind === 'boundary' || kind === 'tension'
              ? 'qualification'
              : kind === 'distinction'
                ? 'distinction'
                : 'support',
      });
    }
    // Reorder only authorized units. A boundary is a nucleus when no direct answer was selected.
    sourceUnits.sort((a, b) => {
      const rank = (u: CompositionUnit) =>
        u.role === 'optional_follow_up'
          ? 3
          : u.role === 'qualification'
            ? 2
            : u.role === 'distinction' &&
                ['criterion', 'distinguish'].includes(
                  plan.reasoning?.frame ?? '',
                )
              ? 0
              : 1;
      return rank(a) - rank(b);
    });
  }
  if (!sourceUnits.length) return original;
  const first = sourceUnits.find((u) => u.role !== 'optional_follow_up');
  if (first) first.role = 'nucleus';
  const exhausted =
    !!plan.reasoning?.partial &&
    original.usedMaterialKeys.length > 0 &&
    original.usedMaterialKeys.every((k) =>
      context.recentMaterialKeys?.includes(k),
    );
  const limitation: LimitationKind | undefined =
    plan.selfMaterial?.qualification === 'subjective_equivalence_unestablished'
      ? 'self_epistemic_limit'
      : plan.reasoning?.partial && plan.reasoning.frame === 'criterion'
        ? 'unresolved_criterion'
        : exhausted
          ? 'boundary_only'
          : plan.reasoning?.partial
            ? plan.reasoning.basis === 'concept' &&
              plan.reasoning.concepts.length > 1
              ? 'missing_relation'
              : 'insufficient_grounds'
            : undefined;
  const choosePhrase = (kind: LimitationKind) => {
    const values = limitations[locale][kind];
    const i = values.findIndex(
      (_, i) => !history?.phrases.includes(`${locale}:${kind}:${i}`),
    );
    const n = i < 0 ? context.turnIndex % values.length : i;
    return {
      key: `${locale}:${kind}:${n}`,
      text: values[n]!,
      role: 'limitation' as const,
      variant: 'authored_limit',
    };
  };
  const render = (rotation: number) => {
    const units = sourceUnits.map((u, i) => {
      const variants = unitAlternatives(u.key, u.text, context);
      const choices = variants;
      let n = rotation % choices.length;
      if (i === 0 && rotation === 0) {
        const fresh = choices.findIndex(
          (t) => !history?.openings.includes(surfaceOpening(t)),
        );
        if (fresh >= 0) n = fresh;
      }
      return {
        ...u,
        text: choices[n]!,
        variant:
          choices[n] === u.text
            ? 'source'
            : `authored:${variants.indexOf(choices[n]!)}`,
      };
    });
    const shape: ResponseComposition['shape'] = units.some(
      (u) => u.role === 'optional_follow_up',
    )
      ? 'answer_question'
      : units.length > 1
        ? 'answer_support'
        : 'single';
    const composition: ResponseComposition = {
      units,
      shape,
      ...(limitation ? { limitation } : {}),
    };
    // Mandatory self epistemic facts are already present, so no second self disclaimer.
    if (limitation && limitation !== 'self_epistemic_limit') {
      const extra = choosePhrase(limitation);
      const hasBoundary = sourceUnits.some(
        (u) =>
          u.key.startsWith('relation:') &&
          context.relationMaterial?.some(
            (m) =>
              `relation:${m.reference.relationId}:${m.reference.index}` ===
                u.key && m.kind === 'boundary',
          ),
      );
      // An already explicit authored boundary does not need a generic footer, except to disclose exhaustion.
      if (!hasBoundary || exhausted) {
        units.push(extra);
        composition.shape = 'answer_boundary';
      }
    }
    const prop = plan.proposition;
    const stance =
      prop?.userStance === 'revises'
        ? 'revision'
        : prop?.userStance === 'rejects'
          ? 'rejection'
          : prop?.userStance === 'doubts'
            ? 'doubt'
            : prop?.userStance === 'asserts' &&
                prop.focus.source === 'contextual_stance'
              ? 'reaffirmation'
              : undefined;
    // Subordinate, optional acknowledgement; never delay the answer or displace a limitation.
    if (
      stance &&
      limitation !== 'self_epistemic_limit' &&
      plan.disposition.desiredVerbosity >= 0.35
    ) {
      const values = stanceAcknowledgments[locale][stance];
      const i = values.findIndex(
        (_, i) => !history?.phrases.includes(`${locale}:stance:${stance}:${i}`),
      );
      if (i >= 0)
        units.push({
          key: `${locale}:stance:${stance}:${i}`,
          text: values[i]!,
          role: 'stance_acknowledgment',
          variant: 'authored_stance',
        });
    }
    const budget = plan.desiredLength;
    // All used source keys must remain truthful. Trim optional surface additions, never mandatory grounding.
    while (
      units.length &&
      (units.map((u) => u.text).join(' ').length > budget.maxCharacters ||
        sentenceCount(units.map((u) => u.text).join(' ')) > budget.maxSentences)
    ) {
      let optional = -1;
      for (let i = units.length - 1; i >= 0; i--)
        if (
          units[i]!.role === 'stance_acknowledgment' ||
          units[i]!.role === 'limitation'
        ) {
          optional = i;
          break;
        }
      if (optional < 0) break;
      units.splice(optional, 1);
    }
    composition.shape = units.some((u) => u.role === 'optional_follow_up')
      ? 'answer_question'
      : units.length === 1
        ? 'single'
        : units.some(
              (u) => u.role === 'limitation' || u.role === 'qualification',
            )
          ? 'answer_boundary'
          : 'answer_support';
    // One licensed parallel restatement pair; punctuation joins clauses, never adds causation.
    const pair = units.slice(0, 2);
    const fuse =
      pair.length === 2 &&
      pair.every((u) => /^relation:freedom-causality:[01]$/u.test(u.key)) &&
      pair.every((u) => sentenceCount(u.text) === 1) &&
      context.disposition.structureBias > 0.75;
    let text = units
      .map((u) => u.text)
      .join(plan.strategy === 'connect' ? '\n' : ' ');
    if (fuse) {
      text =
        pair[0]!.text.replace(/[.]$/u, '') +
        ': ' +
        pair[1]!.text.charAt(0).toLowerCase() +
        pair[1]!.text.slice(1) +
        (units.length > 2
          ? ' ' +
            units
              .slice(2)
              .map((u) => u.text)
              .join(' ')
          : '');
      composition.shape = 'fused_pair';
      composition.fusion = 'parallel';
    }
    return { text, composition };
  };
  let candidate = render(0);
  if (history?.responses.includes(surfaceFingerprint(candidate.text))) {
    for (let i = 1; i < 4; i++) {
      const next = render(i);
      if (!history.responses.includes(surfaceFingerprint(next.text))) {
        candidate = next;
        break;
      }
    }
  }
  // Legacy source formatting remains a safe fallback if an unusually large self selection cannot fit.
  if (
    candidate.text.length > plan.desiredLength.maxCharacters ||
    sentenceCount(candidate.text) > plan.desiredLength.maxSentences
  )
    return original;
  return { ...original, ...candidate };
}
