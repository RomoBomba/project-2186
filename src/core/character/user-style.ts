import { approach, bounded, unit } from './numbers';
export type UserStyleProfile = {
  verbosity: number;
  formality: number;
  averageSentenceLength: number;
  questionFrequency: number;
  emotionalExpressiveness: number;
  preferredTopics: string[];
};
export type SurfaceObservation = {
  wordCount: number;
  sentenceCount: number;
  hasQuestion: boolean;
  exclamationDensity: number;
};
export function observeSurface(text: string): SurfaceObservation | null {
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  if (!words.length) return null;
  const sentences = text
    .split(/[.!?…]+/u)
    .filter((part) => /[\p{L}\p{N}]/u.test(part)).length;
  return {
    wordCount: words.length,
    sentenceCount: Math.max(1, sentences),
    hasQuestion: text.includes('?'),
    exclamationDensity: Math.min(
      0.3,
      (text.match(/!/gu)?.length ?? 0) / words.length,
    ),
  };
}
export function initialUserStyleProfile(): UserStyleProfile {
  return {
    verbosity: 0.5,
    formality: 0.5,
    averageSentenceLength: 12,
    questionFrequency: 0.5,
    emotionalExpressiveness: 0.5,
    preferredTopics: [],
  };
}
export function updateUserStyle(
  previous: UserStyleProfile,
  observation: SurfaceObservation | null,
): UserStyleProfile {
  const state: UserStyleProfile = {
    verbosity: unit(previous.verbosity),
    formality: unit(previous.formality),
    averageSentenceLength: bounded(previous.averageSentenceLength, 0, 100, 12),
    questionFrequency: unit(previous.questionFrequency),
    emotionalExpressiveness: unit(previous.emotionalExpressiveness),
    preferredTopics: [], // No semantic extraction or topic history in Phase 5.
  };
  if (
    !observation ||
    !Number.isFinite(observation.wordCount) ||
    observation.wordCount <= 0
  )
    return state;
  const words = bounded(observation.wordCount, 0, 10000, 0);
  const sentences = bounded(observation.sentenceCount, 1, 10000, 1);
  const sentenceLength = bounded(words / sentences, 0, 100, 12);
  return {
    ...state,
    verbosity: approach(state.verbosity, unit(words / 60), 0.05),
    averageSentenceLength:
      state.averageSentenceLength +
      (sentenceLength - state.averageSentenceLength) * 0.05,
    questionFrequency: approach(
      state.questionFrequency,
      observation.hasQuestion ? 1 : 0,
      0.05,
    ),
    // This is punctuation intensity, not inferred emotion. Keep its estimate near neutral.
    emotionalExpressiveness: approach(
      state.emotionalExpressiveness,
      0.45 + bounded(observation.exclamationDensity, 0, 0.3, 0) / 3,
      0.05,
    ),
  };
}
