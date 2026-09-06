import { buildKnowledge } from './build.ts';
console.log(
  `Canonical knowledge: ${await buildKnowledge()} cards generated/verified.`,
);
