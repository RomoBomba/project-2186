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
user or erasing the character. The initial Phase 5 numeric calibration is documented below.
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
Russian content may lead English coverage. Phase 6 implements whole-locale knowledge
resolution and content checks, described below. UI resources remain complete;
knowledge fallback never mixes individual fields between languages.

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

## Phase 5 character domain

`core/character/` now owns the first character-domain implementation. All modules
are plain TypeScript, with no Svelte, DOM, storage, audio, provider or fixture imports.
No CharacterState value is rendered in the artwork. Profile identity, runtime state,
relationship and user style are separate records; no mutable singleton exists.

### Authored identity and numeric conventions

`profile.ts` contains exactly three CharacterProfile records, deeply readonly in the
public type and frozen at runtime (including arrays and nested objects). Stable
fields are id/displayName, seven traits, interests, inquiry/challenge/relational/
memory-affinity tendencies, and speech verbosity/formality/imagery. Interests are
plain authoring identifiers, not a loaded concept graph. Memory affinity is only a
future tendency; no memory mechanism is implemented.

All traits, tendencies, disposition fields and normalized state metrics use 0–1.
`numbers.ts` clamps finite values and replaces non-finite values with safe defaults.
Exceptions: averageSentenceLength is a smoothed word count bounded to 0–100;
lastInteraction is a nonnegative millisecond timestamp (or null before interaction),
bounded to Number.MAX_SAFE_INTEGER. Time is supplied by the application, never read
by pure domain functions. Older/invalid event timestamps cannot reverse interaction time.

Initial trait calibration, following Character Bible v0.1:

| Trait               | ALETHEIA | AURA | THEMIS |
| ------------------- | -------- | ---- | ------ |
| curiosity           | .92      | .80  | .70    |
| introspection       | .92      | .82  | .70    |
| warmth              | .50      | .92  | .50    |
| directness          | .70      | .40  | .94    |
| playfulness         | .30      | .50  | .20    |
| ambiguity tolerance | .92      | .80  | .55    |
| structure need      | .55      | .35  | .94    |

These are provisional artistic calibrations, not measurements of psychology.
Aletheia prioritizes inquiry/challenge; Aura has stronger relational/memory affinity;
Themis has the most compact speech and strongest structure. No profile changes during
conversation, and no LLM, fixture or UI owns identity.

### Pure transitions and conservative development

`state.ts` models mood, energy, curiosity, openness, activity and lastInteraction.
Mood starts at .5 and remains neutral because Phase 5 has no evidence to update it.
Energy starts at .75; curiosity is .55 + .10 × profile curiosity, and openness is
.45 + .08 × profile warmth. Activity supports idle/thinking/reading/resting/dreaming;
the latter three are identifiers only, with no simulation or dream behaviour.

Events are sessionStarted, userMessageReceived, responseStarted, responseCompleted.
Session start establishes idle. Receipt sets thinking and moves curiosity .8% of the
remaining distance toward .85. Response start retains thinking. Completion returns
idle, moves energy .2% toward .4 and current openness .1% toward .65. Changes are
small, deterministic and saturating. No timers or elapsed-time simulation live here.

`relationship.ts` begins at familiarity .05, trust .40, intellectualAffinity .50,
relationship openness .10. Only a successfully completed exchange changes it:
familiarity moves .4% toward 1; openness moves .1% toward .35, preserving higher
supplied openness values. Trust remains unchanged (initially .40): Phase 5 has no
semantic understanding that justifies trust growth from neutral completion. Future
semantic phases may introduce explicit trust-changing signals. Intellectual affinity
stays neutral: question
marks and exchange counts are not evidence of intellectual agreement or shared values.
Relationship openness describes accumulated personal access; CharacterState.openness
is the current internal willingness. They are never aliases or UI statistics.

`user-style.ts` observes only Unicode words, punctuation-delimited sentences, whether
a question mark occurs, and exclamation density. Russian and English use the same
surface rules; abbreviations are not semantically interpreted. EMA smoothing uses
5% new evidence: verbosity targets min(words/60, 1); averageSentenceLength targets
words/sentences (capped at 100); questionFrequency targets 1 or 0 per message.
EmotionalExpressiveness is explicitly a punctuation-intensity proxy, with observation
target .45 + min(exclamations/words, .3)/3; it does not infer emotion or sentiment.
Formality stays neutral (.5), preferredTopics stays empty, and no raw text is stored.
Empty/punctuation-only messages provide no style observation. Invalid values are
sanitized; there is no NLP, dialogue-act classification or topic extraction.

### BehaviourPolicy and integration boundary

`behaviour-policy.ts` derives eight bounded values: warmth, directness, challengeBias,
questionBias, desiredVerbosity, personalDistance, uncertaintyTolerance, structureBias.
Traits/tendencies dominate. Curiosity influences inquiry/challenge; energy modestly
influences directness, structure and length; familiarity/trust and the two openness
values influence warmth/distance. The only style convergence is desiredVerbosity:
styleInfluence = min(.15, .05 + .10 × normalized familiarity). Thus initial
familiarity .05 gives a 5.5% user weight, gradually rising to at most 15%.
Desired verbosity = authored speech verbosity × (1 − styleInfluence) + smoothed
user verbosity × styleInfluence + the existing (energy − .75) × .05 adjustment;
the final value remains bounded. The limit is an interpolation weight, and changing
user style across its full range can shift desired verbosity at most .15.
There is no punctuation/slang imitation, text generation, strategy selection or
ResponsePlan. Unused profile/style fields remain descriptive data for later phases.

`runtime.ts` applies previous records + typed event → new records → disposition.
It retains CharacterId rather than duplicating the immutable profile in every snapshot.
`ui/terminal/session.ts` resolves this runtime on terminal entry, supplies timestamps,
passes a surface observation on accepted input, emits responseStarted once at the
first transmitted chunk and responseCompleted once at completion. Rejected, duplicate
or cancelled exchanges do not increase relationship values. Completed fixtures and
SemanticTransmission remain completely independent of BehaviourDisposition.

The session exposes `inspectCharacter()` as a detached data snapshot for integration
tests/inspection. It is not attached to window, the DOM, the normal UI or a debug
panel. Profile exports and pure tests provide further inspection without hidden
production controls. Reload/unmount discards the records. All runtime records are
JSON-serializable; future StorageProvider can persist them, with versioning/migrations
when authorized. No persistence, knowledge, memory, BasicIntelligenceProvider or LLM
is included. Review numeric calibration, growth rates and the 15% limit with the author
before using the disposition to drive future response planning.

## Phase 6 authored knowledge

`core/knowledge/model.ts` owns plain serializable ConceptCard data: explicit
ConceptId (`domain.lowercase-slug`), one of five KnowledgeDomain values, complete
locale variants in `content`, related IDs, three character affinities and optional
source metadata. The author-facing field-oriented YAML is converted to this
locale-oriented runtime shape. No technical metadata is added to author cards.
`validation.ts` checks structure, finite affinities in 0–1, normalized alias
uniqueness, globally unique IDs and referential integrity. Invalid values are
rejected, not clamped. Cyclic conceptual links are valid.

### Node infrastructure and author workflow

`infrastructure/knowledge/yaml.ts` alone imports the `yaml` parser (a development
dependency); `repository.ts` reads authored `.yaml`/`.yml` files recursively and
checks their domain directory. Errors retain a source path or offending concept ID.
Duplicate YAML keys, unsupported tags and alias references fail clearly. Sources
accept optional non-empty author/work/chapter/note strings; they never enter matching.

`npm run knowledge:check` runs `check.ts` using Node 24's TypeScript support.
Explicit `.ts` imports in this new boundary/core and allowImportingTsExtensions
permit one checked implementation shared by Node and Vitest, without a second
compiler, runner dependency or generated files. The command accepts --locale,
--text and --id for count/card/match/association inspection. --fixtures explicitly
selects a six-card noncanonical test graph instead of the authored repository.

Validation runs before npm run dev and npm run build (and therefore npm run check).
An already-running dev server does not watch YAML: authors rerun knowledge:check
or restart dev after editing. Parsing is development/build-time only. No YAML
parser, corpus, debug UI or fixture graph is imported into the current browser
application. The loader returns validated cards ready for graph/matcher composition;
future Phase 7 application integration can deliver these plain records to cognition
without moving YAML parsing into core. No static generated corpus is tracked.
The production authoring directories remain intentionally empty; empty is valid.

### Whole-locale resolution

`resolveConcept` owns all knowledge fallback: requested complete locale first,
otherwise the other complete locale if allowFallback (default true). Its result
identifies requestedLocale, actual locale and fallbackUsed. Disabling fallback can
return undefined. A locale must contain non-empty title/summary and four valid
arrays (which may be empty). Entirely omitted or wholly blank locale variants are
unavailable; partially filled variants fail validation. No merging fragments or
translation occurs. UI locale parity and character dialogue remain separate.

### Explainable matching and bounded association

ConceptMatcher uses only aliases and titles of the resolved locale. NFKC, lowercase,
ё→е, punctuation/whitespace normalization and Unicode letter/number tokenization
are matching-only. Apostrophe/hyphen compounds stay intact. There is no stemming,
Russian declension analysis, NLP, embeddings, neural search or summary-text indexing.

Exact contiguous alias phrase = 100; title phrase = 90. Multi-token overlap requires
at least two unique significant tokens and at least 2/3 coverage, scoring
60 + round(10 × coverage). A lone alias token of at least six code points scores 40 only if it occurs
in title/alias terms of exactly one card in the resolved-locale corpus. Shared
individual tokens do not create weak candidates.
Significant tokens have at least four code points; tiny-only phrases never match.
The default returned-candidate threshold is 65. Score-40 evidence is retained
internally but only returned with an explicit diagnostic option, e.g. minScore: 40.
Finite minScore is clamped to 0–100; non-finite values use 65. A zero threshold
still does not create candidates without evidence. Explicit one-word aliases
remain strong exact matches (100), subject to the existing tiny-token rule;
authors must avoid generic triggers and prefer phrases when a word is ambiguous. Each card takes its strongest evidence; repeated
terms do not accumulate points. Ties use ascending code-unit ConceptId order,
independent of host collation. Results include score, term, matched tokens,
alias/title source, evidence kind and locale/fallback. Default limit 5, hard cap 20.
The matcher returns plausible surface candidates, including possible false positives,
not interpretations or facts about a user. Affinity never changes raw matching.

ConceptGraph exposes get, related and expand. Links are authored and directed,
without inferred causation, equivalence, hierarchy or reverse edges. Expansion is
breadth-first with sorted seeds and sorted neighbours, deduplication and cycle
protection. Seeds are excluded from results. Default depth 1/result limit 6;
hard ceilings 3/20, zero disables expansion. Unknown lookup/seed IDs return nothing.
Graph construction copies validated data; returned cards are detached serializable
records so consumers cannot corrupt the assembled graph. No graph database exists.

`affinityFor(card, CharacterId)` exposes attention metadata separately from search.
Knowledge does not update Phase 5 profiles, state, relationship or user style.
Claims/tensions/questions remain data: they are never printed automatically.
Phase 4 fixture selection, wording, UI and SemanticTransmission remain unchanged.
Phase 7 may consume match evidence, small related sets and affinity when explicitly
authorized; no ResponsePlan, BasicIntelligenceProvider, dialogue-act classification,
reasoning, memory or response generation is introduced here.

## Phase 7 built-in intelligence

The normal terminal response source is now ConversationEngine +
BasicIntelligenceProvider, not the Phase 4 fixture cycle. The fixtures remain only
for isolated tests. No memory, persistent facts, semantic trust updates, external
model, network request or tool capability is introduced. Canonical YAML, Phase 5
calibration, approved presentation and SemanticTransmission timings are unchanged.

### Canonical build delivery

`npm run knowledge:build` uses the existing Node repository loader/validator and
writes `src/generated/knowledge.ts`. The resource contains only canonical validated
ConceptCard records, sorted by ID; arrays preserve authored order. It has a generated
header, no timestamp, and is rewritten only if its content changes. `src/generated/`
is gitignored and excluded from lint/format (but included in TypeScript checking).
No fixtures or YAML parser enter this resource. Invalid YAML stops generation/dev/build.

Generation runs automatically before dev, typecheck, test/test:watch and
intelligence:inspect; build invokes typecheck. Thus a clean checkout needs no
manual generation. After editing YAML during a live dev session, run knowledge:build
again; Vite can reload the generated module. No extra watcher or codegen framework.
`application/intelligence.ts` imports the generated plain data and composes the
stateless graph/matcher/provider. Core knows nothing about YAML, Node or Vite.
Node CLI inspection imports that same composition. Existing character modules use
explicit .ts relative import paths for Node 24 execution; their formulas are unchanged.

### Perception and attention

Perception is a small ordered surface classifier: identity, disagreement,
uncertainty, explanation, greeting, opinion, personal disclosure, then question or
other. Evidence is a matched phrase or punctuation/opening marker, not a psychological
inference. Greeting/identity/explanation/opinion/disclosure patterns use token-boundary
prefixes; disagreement/uncertainty may occur inside the message. English
"what does … mean" is an explicit explanation pattern. Russian and English resources
are separate, using the existing Unicode normalization. First person alone is not
an identity concept or disclosure. No sentiment, morphology or neural parser exists.

Perception carries raw ConceptMatcher results separately. The approved threshold 65
is used, with allowFallback:false. Response material and graph associations must
exist in the requested locale; the provider never inserts another locale's text.

Attention preserves raw matching scores. Within relevance classes, the score is
.85 × (match score / 100) + .15 × character affinity. Relevance classes are ordered
first: exact alias (100), exact title (90), overlap. This guard prevents low-affinity
exact matches from being displaced by weaker matches. Equal attention scores use
ascending ConceptId. Attention is inspectable separately from matching.

At most one associated concept is selected from graph depth 1/limit 6, restricted
to the requested locale. Preference = 1 if also matched + affinity − .2 if its
material appears in recent history; ID breaks ties. Relations remain authored
associations, never inferred causal claims. A candidate association enters the plan
only when connect is selected.

### Policy and serializable intent

Response strategies are greet, identify_self, reflect, clarify, connect,
gentle_challenge, contrast, ask_follow_up and admit_uncertainty. Identity questions
choose identify_self. Greetings without concepts choose greet. No concept + question
chooses admit_uncertainty; other unmatched input chooses clarification. No fixture
fallback or invented facts. A matched greeting can proceed to conceptual discussion.

Otherwise available strategies receive explicit weights from BehaviourDisposition:

- reflect: .8 + .9 warmth + .4 (1 − personalDistance), plus .25 for uncertainty;
- clarify: .5 + .8 structureBias + .2 directness, plus .5 for uncertainty and
  3 for an explanation request;
- gentle_challenge (requires tension): .3 + 1.9 challengeBias + .2 desiredVerbosity
  - .25 uncertaintyTolerance, plus .35 for opinion/disagreement;
- contrast (requires tension): .2 + 1.9 structureBias + .4 directness;
- ask_follow_up (requires question): .2 + 1.9 questionBias, plus .25 for a question;
- connect (requires association): .2 + 1.2 warmth + .5 questionBias
  - (1 − personalDistance), plus .8 when the related concept also matched.

Subtract .18 per recent occurrence of a strategy and 1 for immediate repetition.
Highest weight wins; fixed candidate order breaks equal weights. There is no
character-ID branch in strategy policy. State/relationship/style effects enter only
through the approved disposition, with small indirect energy effects on length and
challenge. Strong constraints (such as identity/unknown handling) precede preferences.

ResponsePlan contains strategy, optional primary/associated IDs, match-strength
knowledgeConfidence (not truth probability), disposition, desiredLength, selected
MaterialRefs, optional questionIntent and certainty. A reference is conceptId +
summary/claim/tension/question + index. It contains no raw transcript, UI timing,
prompts or persistent memory references.

Clarify prefers summary; reflect prefers a claim; challenge selects claim + tension;
contrast selects tension; follow-up selects a claim and a question; connect selects
one claim from each of two related concepts. Only available material is considered.
Unused material is preferred, then least recently used, with authored index as tie
breaker. Oversized units are skipped in favour of smaller kinds where possible.
A plan uses at most two knowledge units. Questions are selected by policy, never
printed solely because a match has questions.

### Provider and surface realization

IntelligenceProvider.respond(context, plan) is asynchronous and returns complete
text plus usedMaterialKeys. Context contains immutable CharacterProfile, disposition,
locale, turnIndex and the selected authored material. There are no model-specific
tokens, temperatures or prompts in the boundary. The provider cannot update state,
relationship or history; the caller owns all transitions.

BasicIntelligenceProvider does deterministic realization without re-matching user
input. `characters/<id>/voice.ts` contains small RU/EN voice resources: greetings,
identity, uncertainty and clarification. Strategy-announcement prefixes have been
removed. Definitions/claims/tensions/questions come directly from selected canonical
material, with no automatic paraphrasing. Greeting,
identity and unknown variants alternate by completed turn index modulo bank length.
No random source or wall clock selects content. Voice is separate from numeric profiles.

Verbosity < .35 allows at most 300 characters/2 sentences; < .65 allows 420/3;
otherwise 480/3. Realization counts the complete composed material against those
limits. It drops whole units rather than slicing words/sentences. If nothing fits,
it uses the character's uncertainty language. KnowledgeConfidence/certainty and
all internal scores remain invisible. A future LLM will receive structured context
and ResponsePlan; it will not own character, state, relationship, memory or the
knowledge source of truth.

### Session ownership and asynchronous terminal boundary

A terminal session owns ResponseHistory: completed turn index, last 6 strategies,
last 8 actually realized material keys. This is anti-repetition metadata, not Phase 8
memory, user facts or long-term topic tracking. It is discarded on reload/unmount.
ConversationEngine is stateless across calls; it returns inspection data and a next
history proposal. The session commits history only when transmission finishes.

Submission still trims/checks input and updates Phase 5 surface style/receipt state.
FORMING covers the provider await; then complete text enters the unmodified
SemanticTransmission scheduler (including its 450 ms forming hold or reduced path).
First visible chunk emits responseStarted, completion emits responseCompleted.
Submissions remain locked while awaiting/transmitting. Cancellation ignores late
provider results and cancels playback; neither history nor relationship gets credit.
Provider rejection restores idle/ready through existing lifecycle operations and
shows localized transmission-failure copy; it does not pretend a successful exchange
or silently use a fixture. No timeout/network implementation is added for Basic.

`npm run intelligence:inspect -- --character aletheia --locale ru --text "память?"`
prints perception, matches, attention, disposition/plan, candidate weights, selected
material references and final text, never entire cards. It uses canonical generation
and the exact browser pipeline, starting a fresh session with the normal receipt
style/state update and synthetic timestamps that do not influence content. Tests can
supply explicit history to inspect repeat turns. No inspection panel enters the artwork.

### Phase 7 surface refinement

`core/intelligence/surface.ts` composes whole authored units without announcing
its strategy. Its small shape vocabulary is direct statement, statement + question,
observation + tension, and two related statements. A unit may already contain more
than one sentence; available material and the existing verbosity budget determine
the final sentence count. Connect separates related statements with a line break;
challenge separates observation and tension when desiredVerbosity >= .35, otherwise
keeps them together. Direct reflection, distinction and follow-up use ordinary
sentence spacing. Missing/oversized units are omitted whole, as before.

Juxtaposition is the neutral connection: the realizer deliberately does not insert
“therefore”, “but” or “and yet” solely because two concepts are related. Such claims
must already be authored in the selected material. No new factual or causal text,
paraphrase rules, generic questions or character-ID strategy branches are added.
The selected authored tension itself expresses Themis's distinction; Aletheia's
observation/question and Aura's paired thoughts no longer carry template labels.

Question frequency remains controlled by the approved disposition-based policy
and its existing repetition penalties. Realization does not append a question to
other strategies or suppress a selected question for a character-specific quota.
Unknown/greeting/identity resources and all timing remain unchanged. The response
is still complete before SemanticTransmission begins.
