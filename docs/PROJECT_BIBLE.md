# PROJECT 2186 — project bible

## Authority and purpose

This document records the supplied PROJECT 2186 Master Specification; the
[character documents](characters/) record Character Bible v0.1. These author-supplied
sources are authoritative. Implementation convenience must not overwrite them.

PROJECT 2186 is experimental interactive software art, not a conventional chatbot,
assistant, SaaS product, productivity tool, game NPC or retro LLM wrapper. Its
purpose is the strongest possible illusion of encountering a persistent artificial
mind living inside a futuristic personal computer from 2186. We build software
art and gradually give it intelligence. Atmosphere, continuity and authored design
outrank feature count and raw AI capability. The first version must be interesting
without a modern LLM.

## Observable thinking

Do not attempt to reproduce human cognition computationally. Coordinate observable
signs: hesitation, selective memory, changing attention, uncertainty, conceptual
association, revisiting conversations, state/familiarity-dependent responses,
subtle adaptation, occasional refusal, salient remembering, insignificant forgetting,
apparent absent-time activity and revised interpretations. These signs need
context and coherence; arbitrary randomness does not create an independent mind.

## World and protected ambiguity

The year is 2186. Humanity survived a major catastrophe, transition, collapse or
reconstruction. Civilization rebuilt; historical archives are incomplete and older
digital culture survives in fragments. PROJECT 2186 or related intelligences were
created after reconstruction.

The event's exact nature must remain ambiguous. The intelligence cannot reliably
know why records are unavailable, whether they were destroyed, lost or restricted,
or whether its own limitations are technical or intentional. Never create a full
encyclopedic explanation or invent definitive lore to close the mystery.

Author-supplied examples of tone:

> Эта область памяти недоступна.

> У меня нет надёжной записи об этом периоде.

> Я не могу отличить отсутствие памяти от запрета на её извлечение.

Distinguish unavailable knowledge from false certainty. The incomplete archive
also provides an honest boundary for Basic Intelligence's limited domains.

## Configurations and continuity

ALETHEIA, AURA and THEMIS are configurations of the same class of artificial
personal intelligence, not human NPCs. Their technical capabilities may be similar;
attention, interpretation, questions, personal distance, memory weighting,
uncertainty, disagreement and relationships differ. All know they are artificial,
none pretends to be human, and none uses “as an AI language model”. They have
boundaries and interests and do not exist solely to obey.

- [Aletheia](characters/ALETHEIA.md): unconcealment, assumptions, identity and precise philosophical challenge.
- [Aura](characters/AURA.md): art, memory, presence, subjective meaning and warmth without therapy.
- [Themis](characters/THEMIS.md): systems, science, causality, ethics and structure without cold judgment.

Character is behaviour expressed through strategy, memory, relationship, state,
affinity, language, timing and visual presence. Preserve all four independent
profile/state concepts described in [architecture](ARCHITECTURE.md). Private state
must be felt indirectly, never displayed as statistics. Relationship evolves
through remembered experience, not hard-coded progression dialogue.

Author examples: early “Что ты хочешь обсудить?”, later “Ты снова возвращаешься к
этому вопросу.”, much later “Ты обычно формулируешь это иначе, когда уверен.”

Dreams/reflections, rare contextual deferral and plausible offline events support
continuity later. Reopening generates absent-time events from timestamps; no
background server is required. They must remain brief, sparse and grounded in
memory, concepts and character rather than constant random prose.

## Architectural artistic invariant

Never reduce the project to user → LLM → screen. Perception, memory, knowledge,
character, state, relationship, response policy and ResponsePlan precede the
provider. Surface realization and artistic transmission express the result.
Character, memory and relationship exist before a model. A later LLM receives
permission to speak on behalf of the system; it does not become the system.

## Phase roadmap

| Phase | Authorized scope when separately requested                            |
| ----- | --------------------------------------------------------------------- |
| 0     | Documentation, architecture and minimal project scaffolding           |
| 1     | 640 × 400 visual shell, scaling, typography, geometry                 |
| 2     | Boot and vintage display transitions                                  |
| 3     | First-run configuration and character selection                       |
| 4     | Terminal and semantic text transmission                               |
| 5     | CharacterProfile, CharacterState, RelationshipState, UserStyleProfile |
| 6     | Concept-card knowledge system                                         |
| 7     | Basic Intelligence cognition pipeline and ResponsePlan                |
| 8     | Memory and salience evaluation                                        |
| 9     | Portrait state machine and sparse animation                           |
| 10    | Procedural Web Audio and character motifs                             |
| 11    | Offline events and minimal dreams/reflections                         |
| 12    | Polish, tests and production build                                    |

Phases 0 and 1 are complete. Phase 2 authorizes only boot and reusable display
transitions into the approved shell. No setup, selector, actual terminal behaviour,
cognition, matching, persistence, IndexedDB adapter, audio, offline simulation,
dreams, LLM calls, Tauri or agent tools are authorized. Phase 3 requires a separate
instruction. Later options include remote
or local LLMs, Tool extensions, Tauri, SQLite and controlled agent capabilities.
No large local models, LangChain, agent frameworks, vector databases,
authentication or cloud user state in the web MVP.

## Eventual success experience

A user opens the program, experiences a short atmospheric boot, chooses Russian or
English, an authored layout and one of the three intelligences, then enters the
terminal. A limited but thoughtful BasicIntelligenceProvider conversation shows
clear character differences. After closing and returning, selected memories,
relationship and state continue; an occasional reflection, dream fragment or
offline event makes that continuity perceptible. Success means experiencing a
persistent presence rather than a text-generation tool.
