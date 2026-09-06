import { approach, bounded, unit } from './numbers';
import type { CharacterProfile } from './profile';

export const characterActivities = [
  'idle',
  'thinking',
  'reading',
  'resting',
  'dreaming',
] as const;
export type CharacterActivity = (typeof characterActivities)[number];
export type CharacterState = {
  mood: number;
  energy: number;
  curiosity: number;
  openness: number;
  activity: CharacterActivity;
  lastInteraction: number | null;
};
export type CharacterEvent = {
  type:
    | 'sessionStarted'
    | 'userMessageReceived'
    | 'responseStarted'
    | 'responseCompleted';
  at: number;
};
export function initialCharacterState(
  profile: CharacterProfile,
): CharacterState {
  return {
    mood: 0.5,
    energy: 0.75,
    curiosity: 0.55 + 0.1 * unit(profile.traits.curiosity),
    openness: 0.45 + 0.08 * unit(profile.traits.warmth),
    activity: 'idle',
    lastInteraction: null,
  };
}
export function transitionCharacterState(
  previous: CharacterState,
  event: CharacterEvent,
): CharacterState {
  const state: CharacterState = {
    mood: unit(previous.mood),
    energy: unit(previous.energy, 0.75),
    curiosity: unit(previous.curiosity, 0.6),
    openness: unit(previous.openness),
    activity: characterActivities.includes(previous.activity)
      ? previous.activity
      : 'idle',
    lastInteraction:
      previous.lastInteraction === null
        ? null
        : bounded(previous.lastInteraction, 0, Number.MAX_SAFE_INTEGER, 0),
  };
  const at = bounded(
    event.at,
    0,
    Number.MAX_SAFE_INTEGER,
    state.lastInteraction ?? 0,
  );
  if (event.type !== 'sessionStarted')
    state.lastInteraction = Math.max(state.lastInteraction ?? 0, at);
  switch (event.type) {
    case 'sessionStarted':
      return { ...state, activity: 'idle' };
    case 'userMessageReceived':
      return {
        ...state,
        activity: 'thinking',
        curiosity: approach(state.curiosity, 0.85, 0.008),
      };
    case 'responseStarted':
      return { ...state, activity: 'thinking' };
    case 'responseCompleted':
      return {
        ...state,
        activity: 'idle',
        energy: approach(state.energy, 0.4, 0.002),
        openness: approach(state.openness, 0.65, 0.001),
      };
  }
}
