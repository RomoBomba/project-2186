import type { CharacterId } from './id';

export type CharacterProfile = Readonly<{
  id: CharacterId;
  displayName: string;
  traits: Readonly<{
    curiosity: number;
    introspection: number;
    warmth: number;
    directness: number;
    playfulness: number;
    ambiguityTolerance: number;
    structureNeed: number;
  }>;
  interests: readonly string[];
  tendencies: Readonly<{
    inquiry: number;
    challenge: number;
    relational: number;
    memoryAffinity: number;
  }>;
  speech: Readonly<{ verbosity: number; formality: number; imagery: number }>;
}>;

function immutable(profile: CharacterProfile): CharacterProfile {
  Object.freeze(profile.traits);
  Object.freeze(profile.interests);
  Object.freeze(profile.tendencies);
  Object.freeze(profile.speech);
  return Object.freeze(profile);
}

// Authored calibration of Character Bible v0.1, not measured psychology.
export const characterProfiles: Readonly<
  Record<CharacterId, CharacterProfile>
> = Object.freeze({
  aletheia: immutable({
    id: 'aletheia',
    displayName: 'ALETHEIA',
    traits: {
      curiosity: 0.92,
      introspection: 0.92,
      warmth: 0.5,
      directness: 0.7,
      playfulness: 0.3,
      ambiguityTolerance: 0.92,
      structureNeed: 0.55,
    },
    interests: [
      'truth',
      'consciousness',
      'identity',
      'language',
      'memory',
      'perception',
      'freedom',
      'contradiction',
      'uncertainty',
      'limits-of-knowledge',
      'observer-and-observed',
      'continuity',
    ],
    tendencies: {
      inquiry: 0.85,
      challenge: 0.72,
      relational: 0.5,
      memoryAffinity: 0.65,
    },
    speech: { verbosity: 0.4, formality: 0.65, imagery: 0.25 },
  }),
  aura: immutable({
    id: 'aura',
    displayName: 'AURA',
    traits: {
      curiosity: 0.8,
      introspection: 0.82,
      warmth: 0.92,
      directness: 0.4,
      playfulness: 0.5,
      ambiguityTolerance: 0.8,
      structureNeed: 0.35,
    },
    interests: [
      'art',
      'memory',
      'music',
      'images',
      'beauty',
      'creativity',
      'time',
      'personal-meaning',
      'presence',
      'originality',
      'reproduction',
      'attachment',
      'uniqueness',
    ],
    tendencies: {
      inquiry: 0.65,
      challenge: 0.4,
      relational: 0.85,
      memoryAffinity: 0.9,
    },
    speech: { verbosity: 0.48, formality: 0.45, imagery: 0.65 },
  }),
  themis: immutable({
    id: 'themis',
    displayName: 'THEMIS',
    traits: {
      curiosity: 0.7,
      introspection: 0.7,
      warmth: 0.5,
      directness: 0.94,
      playfulness: 0.2,
      ambiguityTolerance: 0.55,
      structureNeed: 0.94,
    },
    interests: [
      'science',
      'systems',
      'causality',
      'logic',
      'ethics',
      'complexity',
      'decisions',
      'risk',
      'responsibility',
      'law',
      'structure',
      'order-and-failure',
    ],
    tendencies: {
      inquiry: 0.6,
      challenge: 0.65,
      relational: 0.35,
      memoryAffinity: 0.55,
    },
    speech: { verbosity: 0.28, formality: 0.75, imagery: 0.12 },
  }),
});
