# Architecture

## Status and dependency direction

This design contract derives from the PROJECT 2186 Master Specification and
Character Bible v0.1. Phase 1 adds a static visual shell to the Phase 0 foundation.
The domain/provider boundaries below remain planned, not runtime implementations.
Do not implement later phases merely because a design appears here.

Use Svelte for presentation and plain TypeScript for domain/conversation logic.
UI invokes domain operations; domain code must not import Svelte, DOM APIs,
IndexedDB, Web Audio, Tauri or provider SDKs. Infrastructure implements explicit
boundaries and application composition connects them. Use HTML/CSS first and Canvas
only where useful. Static hosting must not introduce hosting-vendor dependencies.

## Character ownership

| Concept           | Responsibility                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| CharacterProfile  | Relatively permanent identity, traits, interests, worldview, speech tendencies, behaviour modifiers and affinities |
| CharacterState    | Dynamic mood, energy, curiosity, openness, activity and lastInteraction                                            |
| RelationshipState | Gradual familiarity, trust, intellectualAffinity and relational openness                                           |
| UserStyleProfile  | Verbosity, formality, averageSentenceLength, questionFrequency, emotionalExpressiveness and preferredTopics        |
| BehaviourPolicy   | Uses the separate inputs to select actions while preserving identity                                               |

CharacterState activity includes `idle`, `thinking`, `reading`, `resting`, and
`dreaming`. Character openness and relationship openness are distinct scopes.
Internal values must never become UI scores, hearts or friendship meters.
Adaptation is slow and limited: adjust rhythm or verbosity without copying the
user or erasing the character. Numeric ranges/weights will be decided in Phase 5.
Character differences affect memory selection, concept affinities, strategy,
personal distance, challenge, uncertainty, length, refusal and relationship growth;
they are not just alternate sentence templates.

## Conversation and intelligence (Phases 6–8)

Planned pipeline:

```text
User message → normalization → perception → topic/concept matching
→ dialogue-act classification → memory retrieval → character state
→ relationship state → response policy → ResponsePlan
→ IntelligenceProvider → surface realization → artistic text transmission
→ state update
```

Lightweight deterministic perception uses dictionaries, aliases, phrase patterns,
tokens and weighted rules. Recognize greeting, question, opinion, claim, personal
disclosure, disagreement, uncertainty, emotional expression, explanation requests,
and known/unknown topics. Do not reduce cognition to keyword → canned response.

ResponsePlan decides intent before wording: strategy, topic, concept IDs, stance,
memory reference, tone, question intent, certainty, desired length and pause hints.
Strategies include reflect, clarify, connect, gentle_challenge, agree_partially,
contrast, remember, speculate, ask_follow_up, admit_uncertainty, decline and defer.
Selection considers profile, state, relationship, recent conversation, user style,
topic and recent strategies to avoid repetition. Refusal and hesitation must be
rare, contextual and useful, never random obstacles.

**IntelligenceProvider** is replaceable. **BasicIntelligenceProvider** is first:
limited coherent reasoning/language through authored knowledge and rules, especially
philosophy, art, science, identity and world. It can connect, reflect, remember,
challenge and admit uncertainty. Incomplete archives are preferable to invented
facts. A future RemoteLLMProvider or LocalLLMProvider receives identity, state,
relationship, selected memories, knowledge and ResponsePlan. It may reason or
formulate language; it never owns personality, persistent state or memory.

## Memory and local storage (Phase 8 and later)

- WorkingMemory: recent conversation context.
- SemanticMemory: stable user preferences, interests, projects and appropriate opinions.
- EpisodicMemory: selected meaningful interactions.
- RelationshipMemory: long-term relationship development, informing RelationshipState.

Do not persist every message as an important memory. A replaceable
MemorySalienceEvaluator begins with deterministic signals: preference, biography,
long-term goal, strong emotion, recurrence, named entities, explicit remember
requests and relationship significance. Persist sufficiently salient candidates.
Future model-assisted evaluation must preserve the boundary.

**StorageProvider** owns persistence access, while plain serializable records belong
to the domain. Planned IndexedDBStorage keeps MVP state local: settings, selected
character, character/relationship/user style state, memories, conversation metadata
and offline/world state. Plan versioned serialization and migrations when records
are implemented. IndexedDB must never leak into ConversationEngine. Future
SQLiteStorage in Tauri can replace the adapter without rewriting domain logic.
CloudStorage is only a possible later extension; there is no MVP cloud user state,
authentication or account system. No storage adapter exists in Phase 0.

## Other explicit boundaries

**AudioEngine** will translate semantic audio events into Web Audio synthesis in
infrastructure. UI/domain callers should not manipulate oscillators or audio
contexts. Character motifs and possible future synth instructions are data.
No audio implementation is included now.

**Tool** is a future extension boundary, conceptually `id`, `description`,
`execute(input)`. Tools such as notes, calculator, archive search, drawing, sound,
filesystem or browser attach through this boundary. Do not hard-code them into
ConversationEngine; define concrete contracts only when that phase is authorized.
No agent tools or agent framework in v0.1.

Offline continuity (Phase 11) records lastSeen/lastInteraction and generates sparse
plausible OfflineEvents on reopening: reflection, archive scan, rest or a brief
dream fragment. No persistent background server or continuous closed-app simulation.
Dream material draws on salient memories, recurring concepts and character
interests. Keep dreams rare, brief and ambiguous.

## Language and authored data

Use shared `Locale` identifiers (`ru`, `en`) and keyed resources, not scattered
language conditionals in components. Keep these streams separate:

1. UI/system strings under `src/locales/`.
2. Authored character dialogue under each `src/characters/<id>/` resource area.
3. Bilingual authored concept cards under `content/knowledge/<domain>/`.

Character configuration, dialogue, knowledge and memory records should be
data-driven where practical. Domain behaviour consumes selected resources through
language services; locale resolution/fallback belongs there, not in components.
Russian content may lead English coverage. Proposed later policy: validate missing
translations during content checks; require complete UI strings, and resolve any
partial authored content through one explicit fallback policy reviewed by the author.
Do not silently mix languages throughout a response. No content loader/parser or
fallback engine is implemented yet.

## Planned source map

```text
src/
  core/
    character/        # profile, state, relationship, user style, policies
    conversation/     # orchestration and ResponsePlan
    intelligence/     # provider boundary and Basic Intelligence
    knowledge/        # concept model/graph and matching
    language/         # locale contract and later language services
    memory/           # memory records and salience evaluation
    world/            # incomplete lore and offline event policy
  characters/
    aletheia/         # authored configuration/dialogue
    aura/
    themis/
  infrastructure/
    storage/          # StorageProvider adapters
    audio/            # AudioEngine implementation
    ai/               # optional future external-model adapters
  ui/
    boot/
    setup/
    character-select/
    terminal/
    portrait/
    effects/
  locales/            # UI/system resources
  assets/
```

The map describes ownership, not a demand to create empty modules. Add directories
with the first relevant implementation. Keep provider contracts small; avoid a
generic plugin system or speculative framework.

## Engineering gates

Strict TypeScript includes unchecked-index and exact optional-property checks.
ESLint covers TS/JS/Svelte; Prettier handles formatting; Vitest runs in Node so core
tests remain independent of a browser. Current tests protect localization resource
parity/nonempty content. Later tests must cover character transitions, relationship
changes, response-policy selection, memory salience, concept matching and storage
serialization. Run typecheck, lint, formatting check, tests and production build.

No large local models, LangChain, agent frameworks, vector databases, authentication,
cloud user state, Tauri or tool implementations in this foundation or the web MVP.

## Phase 1 display ownership

`src/ui/display/DisplayShell.svelte` owns viewport measurement, centering and the
fixed logical surface. CSS owns the viewport surround (`100dvh`, with `100vh`
fallback), padding and transforms. A single ResizeObserver measures the available
content area and passes its width/height to `displayScale` in `scale.ts`. The
observer disconnects on unmount. No polling, global resize handler or graphics
framework is needed. The transformed child cannot change the observed parent size.

`logicalDisplay` is the single 640 × 400 size definition. The scale helper computes
`fit = min(availableWidth / 640, availableHeight / 400)`. It uses `floor(fit)` only
when that integer is at least 1 and retains at least 95% of fit; otherwise it keeps
the fractional fit. Zero/invalid dimensions produce zero scale until measurable.
This is presentation mathematics, kept under `ui/`, not character/domain logic.
Unit tests cover fitting, small/portrait/wide bounds, nearby integer preference,
fractional downscaling and unavailable dimensions, not arbitrary composition pixels.

The shell renders a Svelte child snippet. `ReferenceComposition.svelte` owns only
Layout A's fixed CSS grid and semantic static regions. It knows nothing about the
physical viewport. Future authored screens can occupy the same surface; no layout
switching framework or final terminal component exists yet. Palette/type tokens
live in `src/ui/tokens.css`, with a minimal reset in `src/ui/global.css`.

UI copy stays in `src/locales/system.ts`. Phase 1 deliberately displays English
system labels and a Russian specimen to evaluate both scripts; no locale selection,
translation fallback, character dialogue or domain state is introduced.
