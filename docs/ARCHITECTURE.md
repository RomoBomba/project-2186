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

## Phase 2 boot ownership

Boot is presentation state only, under `src/ui/boot/`. `sequence.ts` defines the
ordered states, acknowledgement count and normal/reduced holds. `startBoot`
provides one cancellable scheduler and semantic step callbacks; it supports skip,
unmount cleanup and acceleration when reduced motion becomes enabled. Completion
never depends on CSS animation events, so disabled animations cannot strand boot.
Future AudioEngine integration can observe these semantic steps; no audio or
generic event bus exists now.

`BootExperience.svelte` owns playback lifetime, Escape handling and the media-query
listener. It maps semantic states onto the display primitive and swaps from
`BootScreen.svelte` to the existing `ReferenceComposition.svelte` while collapsed.
`BootScreen` only presents progress using `src/locales/boot.ts`; it contains no
scheduler, domain logic or real initialization work. Locale resources are typed
and tested for Russian/English parity.

`src/ui/display/DisplayTransition.svelte` is a small child-snippet wrapper with
`phase`, `duration` and `reducedMotion` props. CSS clips the surface for vertical
expansion/collapse and transforms only the activation line. Both its reduced-motion
prop and a CSS media query disable motion. It knows no boot state, viewport scaling,
character data or routing. It marks inaccessible/off/collapsing content inert.
The Phase 1 display shell, scale policy, tokens and reference composition are
unchanged. App mounts BootExperience inside the existing logical surface.

Tests cover state order, acknowledgement progression, terminal completion,
reduced playback, preference-change acceleration, cancellation, skipping and locale
parity. Timing tests enforce the requested duration envelope rather than each
animation millisecond. A development-only `boot-motion=reduce` URL query supports
manual review and is ignored by production playback. Page reload is the replay
mechanism; no persistence or settings are added.

## Phase 3A configuration ownership

`src/ui/setup/model.ts` defines the UI-local sequence `language → layout → standard → audio →
complete` and the serializable `SystemConfiguration` record:

```ts
{
  language: Locale;
  displayStandard: DisplayStandard;
  layout: 'A' | 'B' | 'C';
  audioEnabled: boolean;
}
```

`createSetup` returns a fresh session; `updateSetup` makes immutable, stage-guarded
confirmations and backward navigation. Confirmed values survive navigation inside
this session. No browser storage, persistence adapter, character state or domain
engine is involved. This record can later cross StorageProvider's persistence
boundary when authorized; Phase 3A does not implement that adapter.

`SetupExperience.svelte` owns this model, transient keyboard focus and the two
chosen stage-transition timers. Timers are cancelled on teardown; pending stage
replacement is completed immediately if reduced motion becomes enabled. State
progress does not depend on CSS animation events. `LayoutSchematic.svelte` is purely
presentational CSS geometry. `src/locales/setup.ts` owns all authored setup copy and
language autonyms, with locale-parity tests. No language conditionals in components.

BootExperience now accepts a child snippet with reduced-motion and interaction-ready
values instead of hard-coding ReferenceComposition. App composes SetupExperience as
that child. During the existing boot reveal setup is visible but inert; focus and
input activate only at boot ready. Escape during boot still cancels boot and now
lands on the first setup stage. The established boot timeline, transition primitive,
logical display, scaling, palette and Phase 1 composition remain unchanged.

Setup reuses DisplayTransition only at selected boundaries, with no new animation
system or workflow framework. Completion keeps the typed configuration in its live
model and passes configuration plus interaction readiness to its child snippet.
Phase 3B attaches intelligence selection at this boundary. Tests cover order, language changes, all layout values,
audio revision, completion, guarded actions, back navigation and resource parity.

## Display-standard contract

`src/ui/display/standards.ts` defines exactly `civic`, `phosphor`, `amber`.
`standards.css` is the single authored colour source, providing the same ten
properties for each:

```css
--display-background
--display-surface
--display-text-primary
--display-text-secondary
--display-text-muted
--display-rule-primary
--display-rule-secondary
--display-accent
--display-state-positive
--display-state-dormant
```

Components consume these semantic properties, never raw palette names or
standard-specific colour conditions. Rule widths and lengths remain authored
geometry; colour roles resolve at the consuming element so nested previews cannot
accidentally inherit another standard's resolved border colour.

SystemConfiguration now includes `displayStandard`. Confirming its UI stage sends
the typed value to App, which applies `data-display-standard` to the document root.
This includes body negative space, logical display, boot, setup and terminal chrome.
The root attribute is removed on App teardown. No persistence, generic provider,
theme framework, dependency or background service is introduced. The reviewed boot
still runs before setup, so a fresh reload boots in default CIVIC; all boot colour
consumers nevertheless use the same semantic contract.

`StandardPreview.svelte` establishes that same attribute locally for each specimen.
Nested standard declarations define all ten roles and cannot leak into siblings.
Authored media must use independent asset colours; this interface contract never
filters or recolours pixels in images or portraits. Tests verify the exact authored
standard set, complete token parity and at least 4.5:1 contrast for primary,
secondary and muted text against each surface. Setup tests cover standard selection,
retention, stage order and fresh-session defaults.

## Phase 3B selection ownership

`core/character/id.ts` defines exactly `aletheia`, `aura`, `themis` as CharacterId.
This is configuration identity only, with no runtime profile or state. App composes
IntelligenceExperience inside SetupExperience's completion snippet, so the existing
audio-stage collapse reveals the selection in the same display. Configuration stays
in the live setup model; nothing is persisted. The setup order is language → layout
→ display standard → audio, as specified for Phase 3B.

`ui/character-select/model.ts` owns an explicit UI union: selection (focused identity),
confirmation (selected identity), shell (selected identity). Navigation wraps and
confirmation locks the identity. The component owns disposable transition timers
and a 1.2-second confirmation hold. Reduced motion completes pending geometry
immediately; teardown cancels all scheduled work. Existing DisplayTransition handles
all geometry. No animation event drives progression.

The final ReferenceComposition receives CharacterId and Locale as props, displaying
minimal instance metadata. Layout B/C remain configuration values; the actual shell
is still approved Layout A. Selection copy is UI localization in
`locales/intelligence.ts`, separate from future authored character dialogue.

## Phase 4 terminal interaction

ReferenceComposition preserves Layout A geometry and hosts TerminalCommunication's
SIGNAL and COMMAND regions. Selection passes CharacterId, Locale, reduced-motion and
interaction readiness; focus enters the real command field after expansion finishes.
B/C remain stored configuration choices and still route to Layout A. Active B/C
compositions are future work.

`ui/terminal/session.ts` owns a session-only transcript and the communication UI
states (ready/forming/transmitting). It accepts trimmed commands up to 512 UTF-16 code units,
appends ordered user/intelligence records, and blocks submissions during playback.
The selected identity is configuration, not CharacterState. No storage, memory
extraction or persistence is introduced; reload/unmount discards the session.

`fixtures/phase4-responses.ts` is an explicitly temporary communication-review fixture
boundary. It cycles three authored responses for each CharacterId and Locale. It
never receives or analyzes user text: no keywords, perception, cognition or simulated
intelligence. This is **not BasicIntelligenceProvider**. Future ConversationEngine /
IntelligenceProvider integration will replace this boundary when authorized.

`ui/terminal/SemanticTransmission.ts` separates complete text from presentation as
`TransmissionChunk { text, pauseAfter }`. Deterministic punctuation and clause and word-count
heuristics preserve text losslessly and never split words. Its cancellable
scheduler emits ordered chunks and a single completion, supports shortening an active
transmission for reduced motion, and cancels timers on session disposal. It is a
presentation primitive, not ResponsePlan, and imports no domain engine or framework.
Optional UI-only `TransmissionHints` supply `formingDelay` and zero-based
`pauseAfter` overrides to the scheduler. Existing chunk `pauseAfter` values remain
the default; invalid hints fall back to authored timing. Reduced motion bypasses
normal delays and overrides. No ResponsePlan or provider is implemented. Future
ResponsePlan / IntelligenceProvider may supply semantic structure or pause hints;
raw LLM token streaming must never become the default terminal presentation.

TerminalCommunication owns the input draft, scroll-follow preference and completed-
response accessibility announcement. Component teardown cancels the session; no stale
callbacks or queued commands survive. The read-only-during-transmission policy retains
keyboard focus. One polite announcement per completed response avoids rapid live-region
updates. Tests cover fixture/locale parity, submission guards, ordering, segmentation,
punctuation, completion, cancellation and reduced-motion scheduling.
