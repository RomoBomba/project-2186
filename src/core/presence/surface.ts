import type {
  IntelligenceContext,
  IntelligenceResponse,
} from '../intelligence/provider.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import { materialKey } from '../conversation/model.ts';
import {
  boundaryWords,
  topicAboutRu,
  moveWords,
  boundaryExplanations,
  presenceVoice,
  temporalWords,
} from '../../characters/presence.ts';
import type { PresenceRealization, PresenceRequest } from './model.ts';
export function realizePresence(
  plan: ResponsePlan,
  context: IntelligenceContext,
  style = plan.presence!.style,
  attempt = 0,
): IntelligenceResponse {
  const p = plan.presence!,
    words = presenceVoice[p.locale][p.characterVoice];
  const titles = p.selectedTopicIds
    .map((id) => context.presenceTopics?.find((t) => t.id === id)?.title)
    .filter((t): t is string => !!t);
  const about =
    p.locale === 'ru'
      ? (topicAboutRu[p.selectedTopicIds[0]!] ?? titles[0])
      : `about ${titles[0]?.toLowerCase()}`;
  const voice = moveWords[p.locale][p.characterVoice];
  const material = context.material.filter((m) =>
    plan.selectedMaterial.some(
      (r) => materialKey(r) === materialKey(m.reference),
    ),
  );
  let text: string;
  let usedMaterialKeys: string[] = [];
  if (p.temporal) {
    const w = temporalWords[p.locale],
      minutes = p.temporal.facts.elapsedMinutes;
    const duration =
      minutes === null
        ? null
        : minutes < 1
          ? w.less
          : minutes < 5
            ? w.few
            : w.about(minutes);
    text =
      p.temporal.intent === 'origin'
        ? w.origin
        : p.temporal.intent === 'subjective_time'
          ? p.referencedDurationMinutes !== undefined
            ? `${p.locale === 'ru' ? 'Названный промежуток —' : 'That interval was'} ${p.referencedDurationMinutes < 1 ? w.less : p.referencedDurationMinutes < 5 ? w.few : w.about(p.referencedDurationMinutes)}. ${w.subjective}`
            : `${w.subjective} ${w.chronology}`
          : duration
            ? `${p.temporal.intent === 'ambiguous_duration' ? w.ambiguous(duration) : w.session(duration)}${p.temporal.intent === 'ambiguous_duration' ? ` ${w.origin}` : ''}`
            : w.missing;
  } else if (p.move === 'reject_topic') {
    text = voice.reject;
  } else if (p.move === 'explain_boundary') {
    text = boundaryExplanations[p.locale][p.boundary!.kind];
  } else if (p.move === 'explain_topic_choice') {
    const reason =
      p.choiceGround === 'recent_context'
        ? voice.context
        : p.choiceGround === 'available'
          ? voice.available
          : `${p.choiceGround === 'profile_interest' ? voice.interest : voice.affinity} ${about}.`;
    text = reason + (material[0] ? ` ${material[0].text}` : '');
    usedMaterialKeys = material.map((m) => materialKey(m.reference));
  } else if (p.move === 'offer_topic') {
    text = titles.length
      ? `${voice.offer} ${about}.${material[0] ? ` ${material[0].text}` : ''}`
      : boundaryWords[p.locale].missing_knowledge[style % 3]!;
    usedMaterialKeys = material.map((m) => materialKey(m.reference));
  } else if (p.move === 'topic_overview') {
    text = material.map((m) => m.text).join(' ');
    usedMaterialKeys = material.map((m) => materialKey(m.reference));
  } else {
    const boundary = boundaryWords[p.locale][p.boundary!.kind][style % 3]!;
    const follow = p.questionAllowed
      ? words.questions[Math.floor(style / 3) % 3]
      : titles[0]
        ? `${voice.offer} ${about}.`
        : undefined;
    text = boundary + (follow ? ` ${follow}` : '');
  }
  if (attempt < 8 && p.boundary && context.recentPresenceTexts?.includes(text))
    return realizePresence(plan, context, (style + 1) % 9, attempt + 1);
  return {
    text,
    usedMaterialKeys,
    presenceInspection: { provider: 'deterministic', validation: 'authored' },
  };
}
/** A bounded authored language lattice: different wording is permitted, new assertions are not. */
export function presenceRequest(
  plan: ResponsePlan,
  context: IntelligenceContext,
): PresenceRequest {
  const p = plan.presence!;
  const alternatives = Array.from({ length: 9 }, (_, i) => i).map((offset) => ({
    move: p.move,
    text: realizePresence(plan, context, (p.style + offset) % 9).text,
    topicIds: [...p.selectedTopicIds],
    worldFrameIds: [...p.allowedWorldFrames],
  }));
  return {
    plan: structuredClone(p),
    alternatives: [
      ...new Map(alternatives.map((a) => [a.text, a])).values(),
    ].slice(0, 3),
  };
}
export function validatePresence(
  raw: unknown,
  request: PresenceRequest,
): raw is PresenceRealization {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const r = raw as Record<string, unknown>;
  if (
    Object.keys(r).sort().join() !== 'move,text,topicIds,worldFrameIds' ||
    r.move !== request.plan.move ||
    typeof r.text !== 'string' ||
    r.text.length > 600 ||
    !Array.isArray(r.topicIds) ||
    !Array.isArray(r.worldFrameIds)
  )
    return false;
  return request.alternatives.some(
    (a) =>
      a.text === r.text &&
      JSON.stringify(a.topicIds) === JSON.stringify(r.topicIds) &&
      JSON.stringify(a.worldFrameIds) === JSON.stringify(r.worldFrameIds),
  );
}
