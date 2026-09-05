# PROJECT 2186 — agent map

Read [README](README.md), [architecture](docs/ARCHITECTURE.md),
[design](docs/DESIGN.md), [project bible](docs/PROJECT_BIBLE.md), and the relevant
[character bible](docs/characters/) before changing behaviour. Knowledge authoring
lives in [content/knowledge](content/knowledge/README.md); reference guidance lives
in [docs/references](docs/references/README.md).

## Invariants

- This is software art, not a generic chatbot. Create the illusion of encountering
  a persistent artificial mind. Design, atmosphere and continuity outrank feature count.
- Character identity is not owned by an LLM. Keep CharacterProfile, CharacterState,
  RelationshipState and UserStyleProfile separate. Characters know they are artificial,
  never impersonate humans, and avoid generic AI-assistant disclaimers.
- Conversation and domain logic are plain TypeScript independent of Svelte and host APIs.
- Preserve replaceable IntelligenceProvider, StorageProvider and AudioEngine boundaries.
  BasicIntelligenceProvider is planned first. A future LLM supplies reasoning/language
  inside the character system; it never owns character, memory or relationship.
- Keep knowledge, character configuration, memory records and dialogue data-driven
  where practical. Separate UI localization, character dialogue and concept knowledge;
  support Russian and English without scattered component language conditionals.
- Web-first; local IndexedDB user state in the MVP. Future Tauri/SQLite must fit
  StorageProvider without rewriting domain logic. Future tools attach through an
  explicit Tool boundary, never hard-coded into ConversationEngine.
- No large local models, LangChain, agent frameworks, vector databases,
  authentication or cloud user state in the MVP.
- No modern SaaS/chatbot conventions, chat bubbles, arbitrary movable/resizable windows,
  or visible relationship/state statistics. Preserve world-history ambiguity.
- Implement only the authorized phase. Phase 0 is scaffolding and documentation;
  runtime product systems remain deferred. Do not create speculative abstractions.

## Checks and scope

Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, and
`npm run build` before completing a milestone. Test meaningful domain transitions
when introduced. Inspect diff/status. Never commit, push, deploy or start a later
phase without authorization. Keep private references under the gitignored
`docs/references/_private/` directory.
