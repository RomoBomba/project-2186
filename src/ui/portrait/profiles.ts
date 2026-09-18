import type { CharacterId } from '../../core/character/id';

type Range = readonly [number, number];
export type MotionProfile = {
  formingDelay: number;
  thinkingHold: number;
  thinkingFade: number;
  transmitFade: number;
  alternateFade: number;
  neutralFade: number;
  blinkIn: number;
  blinkHold: number;
  blinkOut: number;
  blinkInterval: Range;
  longBlinkInterval: Range;
  longBlinkChance: number;
  doubleBlinkChance: number;
  doubleBlinkGap: Range;
  firstTransmit: Range;
  laterTransmit: Range;
  alternateChance: number;
  alternateHold?: Range;
  settle: Range;
  driftInterval: Range;
  driftX: number;
  driftY: number;
  driftRotation: number;
  thinkingOffset: readonly [number, number, number];
  settleDuration: number;
};
export const aletheiaMotion: MotionProfile = {
  formingDelay: 190,
  thinkingHold: 300,
  thinkingFade: 140,
  transmitFade: 120,
  alternateFade: 100,
  neutralFade: 160,
  blinkIn: 50,
  blinkHold: 100,
  blinkOut: 65,
  blinkInterval: [5500, 11000],
  longBlinkInterval: [12000, 16000],
  longBlinkChance: 0.15,
  doubleBlinkChance: 0.04,
  doubleBlinkGap: [300, 480],
  firstTransmit: [700, 1000],
  laterTransmit: [800, 1400],
  alternateChance: 0.45,
  settle: [220, 400],
  driftInterval: [14000, 24000],
  driftX: 0.5,
  driftY: 0.35,
  driftRotation: 0.15,
  thinkingOffset: [0, 0, 0],
  settleDuration: 2200,
};
export const auraMotion: MotionProfile = {
  formingDelay: 200,
  thinkingHold: 300,
  thinkingFade: 180,
  transmitFade: 150,
  alternateFade: 130,
  neutralFade: 190,
  blinkIn: 50,
  blinkHold: 100,
  blinkOut: 65,
  blinkInterval: [4500, 9000],
  longBlinkInterval: [10000, 14000],
  longBlinkChance: 0.15,
  doubleBlinkChance: 0.05,
  doubleBlinkGap: [300, 480],
  firstTransmit: [500, 850],
  laterTransmit: [650, 1200],
  alternateChance: 0.5,
  alternateHold: [350, 550],
  settle: [260, 420],
  driftInterval: [10000, 18000],
  driftX: 0.65,
  driftY: 0.45,
  driftRotation: 0.2,
  thinkingOffset: [0.15, 0.3, 0],
  settleDuration: 2400,
};
export const motionProfiles: Partial<Record<CharacterId, MotionProfile>> = {
  aletheia: aletheiaMotion,
  aura: auraMotion,
};
