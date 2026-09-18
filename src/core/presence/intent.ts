import { discourseLens } from './discourse.ts';
import { normalizeConceptText } from '../knowledge/normalization.ts';
import type { GuideIntent, TemporalIntent, BoundaryKind } from './model.ts';
export type PresenceIntent =
  | { guide: GuideIntent; topic?: string; statement?: boolean }
  | { temporal: TemporalIntent }
  | { year: number }
  | { interval: true };
export function presenceIntent(text: string): PresenceIntent | undefined {
  const t = discourseLens(text).body;
  const year =
    /^(?:что ты знаешь (?:про|о)|расскажи (?:про|о)|what do you know about|tell me about) ([1-9]\d{3})(?: год| year)?$/u.exec(
      t,
    );
  if (year) return { year: Number(year[1]) };
  if (
    /^(?:сколько лет между (?:нами|моим временем и твоим)|нас сколько лет разделяет|как далеко мое время от твоего|(?:и )?сколько это лет|how many years (?:separate us|are between us|are between my time and yours|is that)|how far is my time from yours)$/u.test(
      t,
    )
  )
    return { interval: true };
  if (
    /^(?:о чем мы можем поговорить|что мы можем обсудить|какие темы мы можем обсудить|о чем тебе хотелось бы поговорить|что ты предложишь обсудить|what (?:can|should) we talk about|what can we discuss)$/u.test(
      t,
    )
  )
    return { guide: 'conversation_scope' };
  const interest =
    /^(?:(?:вероятно|наверное) )?(?:мне интересн[аоы]|меня интересует|я хочу поговорить (?:о|про)|давай (?:о|про)|(?:perhaps |probably )?i(?:'m| am) interested in|i want to talk about) (.+)$/u.exec(
      t,
    );
  if (interest)
    return { guide: 'topic_overview', topic: interest[1]!, statement: true };
  if (
    /^(?:сколько (?:ты тут|ты здесь|длится (?:наш )?разговор)|как давно ты (?:тут|здесь)|how long (?:have you been here|have we been talking|has this conversation lasted))$/u.test(
      t,
    )
  )
    return {
      temporal: /разговор|we been talking|conversation/u.test(t)
        ? 'session_duration'
        : 'ambiguous_duration',
    };
  if (
    /^(?:когда ты (?:появилась|появился)|сколько тебе лет|сколько ты (?:вообще )?существуешь|how long have you existed|when (?:did you (?:appear|begin)|were you created)|how old are you)$/u.test(
      t,
    )
  )
    return { temporal: 'origin' };
  if (
    /^(?:ты чувствуешь время|что (?:для тебя время|время значит для тебя)|do you (?:feel|experience) time|what (?:is time (?:to|for) you|does time mean to you))$/u.test(
      t,
    )
  )
    return { temporal: 'subjective_time' };
  if (
    /^(?:о чем (?:ты (?:тогда )?можешь говорить|поговорим)|что (?:ты (?:тогда |вообще )?знаешь(?: лучше всего)?|тебе известно|ты можешь рассказать)|what (?:can you (?:talk about|tell me)|do you know(?: best)?(?: then)?)|what shall we talk about)$/u.test(
      t,
    )
  )
    return { guide: 'conversation_scope' };
  if (
    /^(?:(?:предложи|выбери) (?:одну )?тему(?: сама)?|что (?:тебе (?:самой здесь )?интересно|ты хочешь обсудить)|что выбрала бы ты|о чем тебе хочется поговорить|о чем ты хочешь поговорить|я (?:вообще )?не знаю о чем говорить|suggest (?:a )?topic|choose (?:a |one )?topic(?: yourself)?|what (?:interests you(?: here)?|would you choose|would you like to (?:discuss|talk about))|i (?:really )?(?:don't|do not) know what to talk about)$/u.test(
      t,
    )
  )
    return { guide: 'offer_topic' };
  const overview =
    /^(?:что (?:ты расскажешь|можешь сказать|ты можешь сказать) (?:про|о)|расскажи (?:мне )?(?:что-нибудь )?(?:о|про)|поговорим о|tell me (?:something )?about|what can you (?:tell me|say) about|let(?:'s| us) talk about) (.+)$/u.exec(
      t,
    );
  return overview
    ? { guide: 'topic_overview', topic: overview[1]! }
    : undefined;
}
export function boundaryKind(text: string): BoundaryKind | undefined {
  const t = normalizeConceptText(text);
  if (
    /погод|weather|сегодня.*новост|новост.*сегодня|current news|news today|вчера.*матч|won.*(?:match|game)|курс валют|exchange rate/u.test(
      t,
    )
  )
    return 'current_external_fact';
  if (
    /столиц|capital|франци|france|римск|roman empire|\b20\d\d\b|историческ.*дат|historical date/u.test(
      t,
    )
  )
    return 'temporal_distance';
  if (
    /как звали.*реконструк|who started.*reconstruction|причин.*катастроф|cause.*catastrophe/u.test(
      t,
    )
  )
    return 'archive_gap';
  return undefined;
}
