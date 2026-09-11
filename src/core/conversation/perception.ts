import { reasoningIntent } from '../reasoning/intent.ts';
import type { ReasoningIntent } from '../reasoning/model.ts';
import {
  recognizeSelfQuery,
  type SelfQuery,
  type SelfQueryKind,
} from '../self/query.ts';
import type { Locale } from '../language/locale.ts';
import { conceptTokens } from '../knowledge/normalization.ts';
import type { ConceptMatch } from '../knowledge/matcher.ts';
export type DialogueAct =
  | 'self_question'
  | 'greeting'
  | 'system_identity_question'
  | 'explanation_request'
  | 'question'
  | 'claim_or_opinion'
  | 'uncertainty'
  | 'disagreement'
  | 'personal_disclosure'
  | 'other';
export type Perception = {
  reasoningIntent?: ReasoningIntent;
  selfQuery?: SelfQuery;
  act: DialogueAct;
  evidence: string[];
  isQuestion: boolean;
  matches: ConceptMatch[];
};
const patterns: Record<Locale, Partial<Record<DialogueAct, string[]>>> = {
  ru: {
    greeting: [
      'привет',
      'здравствуй',
      'здравствуйте',
      'добрый вечер',
      'добрый день',
    ],
    system_identity_question: [
      'кто ты',
      'ты кто',
      'а ты кто',
      'кто ты такая',
      'кто ты такой',
      'что ты',
      'что ты такое',
      'как тебя зовут',
      'как твое имя',
      'как тебя называют',
    ],
    explanation_request: ['что такое', 'что значит', 'объясни'],
    disagreement: ['не согласен', 'не согласна', 'я бы поспорил'],
    uncertainty: ['не знаю', 'не уверен', 'не уверена', 'мне кажется'],
    claim_or_opinion: ['я думаю', 'я считаю'],
    personal_disclosure: ['мне нравится', 'я люблю'],
    question: ['почему', 'зачем', 'можно ли', 'какая', 'какой', 'как'],
  },
  en: {
    greeting: ['hello', 'hi', 'good evening', 'good morning'],
    system_identity_question: [
      'who are you',
      'what are you',
      'what is your name',
      "what's your name",
      'and who are you',
    ],
    explanation_request: ['what is', 'explain'],
    disagreement: ['i disagree'],
    uncertainty: ["i'm not sure", 'i am not sure', 'maybe', 'i think'],
    claim_or_opinion: ['i believe'],
    personal_disclosure: ['i like', 'i love'],
    question: ['why', 'how', 'can', 'does', 'is', 'are', 'what'],
  },
};
function perceiveBase(
  text: string,
  locale: Locale,
  matches: ConceptMatch[] = [],
  previousSelf?: SelfQueryKind,
): Perception {
  const tokens = conceptTokens(text);
  const normalized = tokens.join(' ');
  const starts = (phrase: string) =>
    normalized === phrase || normalized.startsWith(phrase + ' ');
  const contains = (phrase: string) =>
    ` ${normalized} `.includes(` ${phrase} `);
  // A leading salutation must not hide the identity question immediately after it.
  // This is one explicit precedence rule, not general multi-intent parsing.
  const greeting = (patterns[locale].greeting ?? []).find(starts);
  if (greeting) {
    const remainder = normalized.slice(greeting.length).trim();
    const identity = (patterns[locale].system_identity_question ?? []).find(
      (phrase) => remainder === phrase,
    );
    if (identity)
      return {
        act: 'system_identity_question',
        evidence: [greeting, identity],
        isQuestion: true,
        matches,
      };
  }
  const selfQuery = recognizeSelfQuery(text, locale, previousSelf);
  if (selfQuery)
    return {
      act: 'self_question',
      selfQuery,
      evidence: [selfQuery.evidence],
      isQuestion: true,
      matches,
    };
  const question =
    text.includes('?') || (patterns[locale].question ?? []).some(starts);
  const order: DialogueAct[] = [
    'system_identity_question',
    'disagreement',
    'uncertainty',
    'explanation_request',
    'greeting',
    'claim_or_opinion',
    'personal_disclosure',
  ];
  for (const act of order) {
    const phrase = (patterns[locale][act] ?? []).find(
      act === 'system_identity_question'
        ? (phrase) => normalized === phrase
        : act === 'uncertainty' || act === 'disagreement'
          ? contains
          : starts,
    );
    if (phrase)
      return {
        act,
        evidence: [phrase],
        isQuestion:
          question ||
          act === 'system_identity_question' ||
          act === 'explanation_request',
        matches,
      };
  }
  if (locale === 'en' && starts('what does') && tokens.includes('mean'))
    return {
      act: 'explanation_request',
      evidence: ['what does … mean'],
      isQuestion: true,
      matches,
    };
  return {
    act: question ? 'question' : 'other',
    evidence: question ? [text.includes('?') ? '?' : 'question opening'] : [],
    isQuestion: question,
    matches,
  };
}

export function perceive(...args: Parameters<typeof perceiveBase>): Perception {
  const result = perceiveBase(...args);
  const intent = reasoningIntent(args[0], args[1]);
  return intent ? { ...result, reasoningIntent: intent } : result;
}
