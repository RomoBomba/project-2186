# PROJECT 2186

Experimental software art: an encounter with a persistent artificial mind inside
an alternative-history personal computer from 2186. Presence, restraint, memory,
character and atmosphere matter more than feature count or raw model capability.

## Phase 3A status

Boot now leads into sequential linguistic interface, display standard, display geometry and audio
channel configuration. Keyboard arrows and Enter, or clicking a choice, confirm
in-session values; Escape revisits the previous stage. Completion stops at an
intelligence-configuration-required placeholder. Character selection is deferred.

The approved 640 × 400 display, scaling and transitions are preserved. CIVIC is
the default display identity; PHOSPHOR and AMBER provide authored monochrome standards. No terminal
input, conversation, storage, portraits or sound is implemented. Reload restarts
boot and configuration; Escape bypasses boot only. For development-only reduced-
motion review, open `/?boot-motion=reduce`.

## Development

Use Node.js 24.x and npm (verified with Node 24.20.0 / npm 11.19.0).
The npm package identifier is `project-2186`; the product name is **PROJECT 2186**.

```sh
npm ci --cache .npm-cache
npm run dev
```

| Command                | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Vite development server                                           |
| `npm run typecheck`    | Svelte diagnostics and strict TypeScript, including configuration |
| `npm run lint`         | ESLint for JavaScript, TypeScript and Svelte; zero warnings       |
| `npm run format`       | Format supported files with Prettier                              |
| `npm run format:check` | Check formatting without changing files                           |
| `npm test`             | Run Vitest once                                                   |
| `npm run test:watch`   | Watch unit tests                                                  |
| `npm run build`        | Typecheck and generate the production bundle in `dist/`           |
| `npm run preview`      | Preview the built bundle locally                                  |
| `npm run check`        | Run all checks, including production build                        |

Svelte is the only direct runtime dependency. Development dependencies provide
Vite/Svelte compilation, TypeScript/Svelte checking, ESLint and its language
integrations, Prettier/Svelte formatting and Vitest. No UI kit, router, state
framework, YAML runtime parser or AI/storage/audio library is needed in Phase 0.
The lockfile records resolved dependencies. Generated output, dependencies and the
repository-local npm cache are ignored.

## Documentation map

- [Agent invariants](AGENTS.md)
- [Architecture and planned source boundaries](docs/ARCHITECTURE.md)
- [Design, palette and authored layouts](docs/DESIGN.md)
- [World, product principles and phase roadmap](docs/PROJECT_BIBLE.md)
- [Aletheia](docs/characters/ALETHEIA.md), [Aura](docs/characters/AURA.md),
  [Themis](docs/characters/THEMIS.md)
- [Knowledge authoring and proposed YAML schema](content/knowledge/README.md)
- [Visual reference workflow](docs/references/README.md)

The source tree grows as phases introduce real modules. The architecture document
maps future locations; empty source scaffolds and placeholder implementations are
intentionally unnecessary. Five `.gitkeep` files preserve the requested empty
knowledge authoring directories in Git.

## Author review before later phases

Review visual references before fixing palette, typography, scaling behaviour or
portrait production. Review the proposed concept-card validation rules and
translation fallback policy before Phase 6. English is only the development-shell
default; first-run language choice is implemented in Phase 3A. Character trait descriptions
remain qualitative until behaviour modelling is authorized. Review Phase 3A configuration before proceeding; Phase 3B requires a separate instruction.
