import { expect, it } from 'vitest';
import { characterProfiles } from './profile';
import { createCharacterRuntime } from './runtime';
import {
  deriveBehaviourDisposition,
  maximumStyleInfluence,
} from './behaviour-policy';
it('produces distinct character dispositions deterministically', () => {
  const a = createCharacterRuntime('aletheia', 0);
  const b = createCharacterRuntime('aura', 0);
  const c = createCharacterRuntime('themis', 0);
  expect(a.disposition.questionBias).toBeGreaterThan(
    b.disposition.questionBias,
  );
  expect(a.disposition.challengeBias).toBeGreaterThan(
    b.disposition.challengeBias,
  );
  expect(b.disposition.warmth).toBeGreaterThan(a.disposition.warmth);
  expect(b.disposition.personalDistance).toBeLessThan(
    c.disposition.personalDistance,
  );
  expect(c.disposition.directness).toBeGreaterThan(a.disposition.directness);
  expect(c.disposition.structureBias).toBeGreaterThan(
    b.disposition.structureBias,
  );
  expect(c.disposition.desiredVerbosity).toBeLessThan(
    b.disposition.desiredVerbosity,
  );
  expect(createCharacterRuntime('aletheia', 0)).toEqual(a);
});
it.each(Object.values(characterProfiles))(
  'limits style influence to 15% for $id',
  (profile) => {
    const r = createCharacterRuntime(profile.id, 0);
    const concise = deriveBehaviourDisposition(
      profile,
      r.characterState,
      r.relationshipState,
      { ...r.userStyleProfile, verbosity: 0 },
    );
    const verbose = deriveBehaviourDisposition(
      profile,
      r.characterState,
      r.relationshipState,
      { ...r.userStyleProfile, verbosity: 1 },
    );
    expect(verbose.desiredVerbosity - concise.desiredVerbosity).toBeCloseTo(
      0.055,
    );
    expect({ ...verbose, desiredVerbosity: concise.desiredVerbosity }).toEqual(
      concise,
    );
    for (const value of [concise.desiredVerbosity, verbose.desiredVerbosity])
      expect(Math.abs(value - profile.speech.verbosity)).toBeLessThanOrEqual(
        maximumStyleInfluence,
      );
  },
);
it('responds to current energy/curiosity and relationship without mutating inputs', () => {
  const r = createCharacterRuntime('aura', 0);
  const p = characterProfiles.aura;
  const closer = deriveBehaviourDisposition(
    p,
    { ...r.characterState, curiosity: 0.9, energy: 0.95 },
    { ...r.relationshipState, familiarity: 0.6, trust: 0.5, openness: 0.3 },
    r.userStyleProfile,
  );
  expect(closer.questionBias).toBeGreaterThan(r.disposition.questionBias);
  expect(closer.directness).toBeGreaterThan(r.disposition.directness);
  expect(closer.warmth).toBeGreaterThan(r.disposition.warmth);
  expect(closer.personalDistance).toBeLessThan(r.disposition.personalDistance);
  expect(r.relationshipState.familiarity).toBe(0.05);
});
it('bounds outputs even when supplied invalid numeric inputs', () => {
  const r = createCharacterRuntime('themis', 0);
  const out = deriveBehaviourDisposition(
    characterProfiles.themis,
    { ...r.characterState, energy: NaN, curiosity: Infinity, openness: -10 },
    {
      familiarity: NaN,
      trust: Infinity,
      intellectualAffinity: -1,
      openness: 2,
    },
    { ...r.userStyleProfile, verbosity: NaN },
  );
  for (const value of Object.values(out)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
});

it.each(Object.values(characterProfiles))(
  'increases verbosity convergence with familiarity, capped at 15% for $id',
  (profile) => {
    const runtime = createCharacterRuntime(profile.id, 0);
    const influenceAt = (familiarity: number) => {
      const disposition = (verbosity: number) =>
        deriveBehaviourDisposition(
          profile,
          runtime.characterState,
          { ...runtime.relationshipState, familiarity },
          { ...runtime.userStyleProfile, verbosity },
        );
      expect(disposition(1)).toEqual(disposition(1));
      for (const value of Object.values(disposition(1))) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      return disposition(1).desiredVerbosity - disposition(0).desiredVerbosity;
    };
    expect(influenceAt(0)).toBeCloseTo(0.05);
    expect(influenceAt(0.05)).toBeCloseTo(0.055);
    expect(influenceAt(0.5)).toBeCloseTo(0.1);
    expect(influenceAt(1)).toBeCloseTo(maximumStyleInfluence);
    expect(influenceAt(0.5)).toBeGreaterThan(influenceAt(0.05));
    for (const familiarity of [-1, 0, 0.05, 0.5, 1, 2, NaN, Infinity]) {
      const influence = influenceAt(familiarity);
      expect(influence).toBeGreaterThanOrEqual(0.05 - 1e-12);
      expect(influence).toBeLessThanOrEqual(maximumStyleInfluence + 1e-12);
    }
  },
);
