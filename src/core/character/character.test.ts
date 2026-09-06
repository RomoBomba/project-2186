import { describe, expect, it } from 'vitest';
import { characterIds } from './id';
import { characterProfiles } from './profile';
import {
  initialCharacterState,
  transitionCharacterState,
  characterActivities,
} from './state';
import { initialRelationshipState, updateRelationship } from './relationship';
import { createCharacterRuntime, transitionCharacterRuntime } from './runtime';

function withinBounds(record: Record<string, number>) {
  for (const value of Object.values(record)) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
}
describe('authored immutable identity', () => {
  it('contains exactly three frozen profiles with bounded authored values', () => {
    expect(Object.keys(characterProfiles)).toEqual([...characterIds]);
    for (const id of characterIds) {
      const profile = characterProfiles[id];
      expect(profile.id).toBe(id);
      expect(profile.displayName).toBe(id.toUpperCase());
      expect(Object.isFrozen(profile)).toBe(true);
      for (const value of [
        profile.traits,
        profile.interests,
        profile.tendencies,
        profile.speech,
      ])
        expect(Object.isFrozen(value)).toBe(true);
      withinBounds(profile.traits);
      withinBounds(profile.tendencies);
      withinBounds(profile.speech);
      expect(profile.interests.length).toBeGreaterThan(5);
    }
    expect(Object.isFrozen(characterProfiles)).toBe(true);
  });
  it('preserves curiosity, warmth, directness and structure distinctions', () => {
    const { aletheia: a, aura: b, themis: c } = characterProfiles;
    expect(a.traits.curiosity).toBeGreaterThan(b.traits.curiosity);
    expect(a.traits.ambiguityTolerance).toBeGreaterThan(
      c.traits.ambiguityTolerance,
    );
    expect(b.traits.warmth).toBeGreaterThan(a.traits.warmth);
    expect(c.traits.directness).toBeGreaterThan(a.traits.directness);
    expect(c.traits.structureNeed).toBeGreaterThan(b.traits.structureNeed);
    expect(b.tendencies.memoryAffinity).toBeGreaterThan(
      a.tendencies.memoryAffinity,
    );
    expect(c.speech.verbosity).toBeLessThan(a.speech.verbosity);
  });
});
describe('character lifecycle', () => {
  it('initializes safe idle defaults and supports all planned activity identifiers without simulating them', () => {
    expect(characterActivities).toEqual([
      'idle',
      'thinking',
      'reading',
      'resting',
      'dreaming',
    ]);
    for (const profile of Object.values(characterProfiles)) {
      const state = initialCharacterState(profile);
      expect(state.activity).toBe('idle');
      expect(state.lastInteraction).toBeNull();
      expect(state.mood).toBe(0.5);
      expect(state.energy).toBe(0.75);
    }
  });
  it('moves through thinking and idle without mutating its input or inventing mood', () => {
    const initial = initialCharacterState(characterProfiles.aletheia);
    const received = transitionCharacterState(initial, {
      type: 'userMessageReceived',
      at: 10,
    });
    expect(received.curiosity - initial.curiosity).toBeGreaterThan(0);
    expect(received.curiosity - initial.curiosity).toBeLessThan(0.01);
    const started = transitionCharacterState(received, {
      type: 'responseStarted',
      at: 11,
    });
    expect(started.activity).toBe('thinking');
    const completed = transitionCharacterState(started, {
      type: 'responseCompleted',
      at: 12,
    });
    expect(completed.activity).toBe('idle');
    expect(completed.energy).toBeLessThan(initial.energy);
    expect(completed.energy).toBeGreaterThan(initial.energy - 0.002);
    expect(completed.openness - initial.openness).toBeLessThan(0.001);
    expect(initial.activity).toBe('idle');
    expect(initial.lastInteraction).toBeNull();
    expect(completed.mood).toBe(initial.mood);
    expect(completed.lastInteraction).toBe(12);
  });
  it('handles invalid numeric inputs and never moves timestamps backwards', () => {
    const previous = {
      ...initialCharacterState(characterProfiles.aura),
      mood: NaN,
      energy: Infinity,
      curiosity: -4,
      openness: 5,
      lastInteraction: 100,
    };
    const next = transitionCharacterState(previous, {
      type: 'responseCompleted',
      at: NaN,
    });
    withinBounds({
      mood: next.mood,
      energy: next.energy,
      curiosity: next.curiosity,
      openness: next.openness,
    });
    expect(next.lastInteraction).toBe(100);
    expect(
      transitionCharacterState(next, { type: 'responseStarted', at: 10 })
        .lastInteraction,
    ).toBe(100);
  });
  it('changes gradually over repeated interactions and remains bounded', () => {
    let runtime = createCharacterRuntime('themis', 0);
    const initial = structuredClone(runtime);
    for (let i = 0; i < 100; i++) {
      runtime = transitionCharacterRuntime(runtime, {
        type: 'userMessageReceived',
        at: i,
        observation: null,
      });
      runtime = transitionCharacterRuntime(runtime, {
        type: 'responseStarted',
        at: i,
      });
      runtime = transitionCharacterRuntime(runtime, {
        type: 'responseCompleted',
        at: i,
      });
    }
    expect(runtime.characterState.energy).toBeGreaterThan(
      initial.characterState.energy - 0.1,
    );
    expect(
      runtime.characterState.openness - initial.characterState.openness,
    ).toBeLessThan(0.03);
    expect(runtime.characterState.curiosity).toBeLessThan(0.85);
    withinBounds(runtime.relationshipState);
    withinBounds(runtime.disposition);
    expect(JSON.parse(JSON.stringify(runtime))).toEqual(runtime);
  });
});
describe('conservative relationship growth', () => {
  it('begins receptive but unfamiliar; completion is only weak evidence', () => {
    const initial = initialRelationshipState();
    expect(initial).toEqual({
      familiarity: 0.05,
      trust: 0.4,
      intellectualAffinity: 0.5,
      openness: 0.1,
    });
    expect(updateRelationship(initial, { successfulExchange: false })).toEqual(
      initial,
    );
    const next = updateRelationship(initial, { successfulExchange: true });
    const familiarityGrowth = next.familiarity - initial.familiarity;
    expect(familiarityGrowth).toBeGreaterThan(0);
    expect(familiarityGrowth).toBeLessThan(0.005);
    expect(next.trust).toBe(initial.trust);
    expect(next.intellectualAffinity).toBe(initial.intellectualAffinity);
    expect(initial.familiarity).toBe(0.05);
  });
  it('does not equate intellectual affinity with repeated exchanges or establish deep trust automatically', () => {
    let state = initialRelationshipState();
    for (let i = 0; i < 10000; i++)
      state = updateRelationship(state, { successfulExchange: true });
    withinBounds(state);
    expect(state.trust).toBe(initialRelationshipState().trust);
    expect(state.openness).toBeLessThanOrEqual(0.35);
    expect(state.intellectualAffinity).toBe(0.5);
    withinBounds(
      updateRelationship(
        {
          familiarity: NaN,
          trust: Infinity,
          intellectualAffinity: -2,
          openness: 8,
        },
        { successfulExchange: true },
      ),
    );
  });
  it('keeps relationship openness independent of character openness', () => {
    const initial = createCharacterRuntime('aura', 0);
    const next = transitionCharacterRuntime(initial, {
      type: 'userMessageReceived',
      at: 1,
      observation: null,
    });
    expect(next.relationshipState.openness).toBe(
      initial.relationshipState.openness,
    );
    expect(next.characterState.openness).not.toBe(
      next.relationshipState.openness,
    );
  });
});
