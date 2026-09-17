# Local realization — Phase 11B

Basic remains the default and benchmark reference. Local Qwen is an opt-in language
realizer, not a new cognition engine. Its structurally valid answers can still
misstate the selected grounds. Review [the live report](../content/evaluation/11b-report.md)
and [11B.1 calibration](../content/evaluation/11b1-report.md) before enabling it.
No provider selection is stored in IndexedDB.

## Start

1. Install the macOS application from [Ollama](https://ollama.com/download/mac).
2. Start Ollama, then run `ollama pull qwen3:4b-instruct`.
3. Verify with `ollama list`; optionally inspect the loaded model with `ollama ps`.
4. Use this repository's Node 24 environment and existing npm dependencies.
5. Run:

```sh
VITE_INTELLIGENCE_PROVIDER=local npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```

Open `http://127.0.0.1:5176/`. Omit the environment variable or set it to `basic`
to return to the deterministic provider. A gitignored `.env.local` may contain
`VITE_INTELLIGENCE_PROVIDER=local` for Vite development. Node inspection commands
use shell environment variables or the explicit `--provider` argument instead.

`VITE_OLLAMA_ENDPOINT` optionally changes the endpoint; the default is
`http://127.0.0.1:11434/api/chat`. Only HTTP loopback hosts `127.0.0.1`, `localhost`
and `[::1]` with path `/api/chat` are accepted. Credentials, query strings and
redirects are forbidden. There is no remote fallback, API key or proxy.

## Fixed settings

| Setting               | Value               |
| --------------------- | ------------------- |
| model                 | `qwen3:4b-instruct` |
| stream / think        | `false` / `false`   |
| temperature           | `0.25`              |
| num_ctx / num_predict | `4096` / `160`      |
| keep_alive            | `10m`               |
| application deadline  | 20 seconds          |

The [chat API](https://docs.ollama.com/api/chat) receives a request-specific
[JSON Schema](https://docs.ollama.com/capabilities/structured-outputs). The complete
`message.content` is parsed and checked by the unchanged Phase 11A validator.
Only a complete accepted answer enters SemanticTransmission. Errors, unavailable
model, timeout or invalid output fall back to Basic once. Late output is ignored.

## Browser access

Direct browser fetch from `http://127.0.0.1:5176` to the default endpoint was
verified with an accepted Local answer during Phase 11B. No origin or Ollama host
configuration change was needed on the author's machine. Native fetch is called
without binding its receiver to the transport object; this matters in the browser.

If another local origin is rejected, follow [Ollama's origin configuration](https://docs.ollama.com/faq)
and allow only that exact development origin. For the macOS application, quit
Ollama, run `launchctl setenv OLLAMA_ORIGINS "http://127.0.0.1:5176"`, then restart
it. Do not use wildcard origins or change the server bind to `0.0.0.0`. Keep
the default loopback binding. Do not add a proxy to bypass a browser restriction.

## Inspection and A/B

```sh
npm run intelligence:inspect -- --provider local --locale ru --character aletheia --text "Ты мыслишь?"
npm run intelligence:compare -- --locale ru --character aletheia --turn "Если всё имеет причину, свободы нет." --turn "Почему ты не согласна?"
npm run intelligence:local-evaluate
npm run intelligence:local-evaluate -- --category synthetic_memory
```

Comparison calls cognition once per turn. Basic and Local receive identical
context, ResponsePlan and GroundingPacket contents; packet equality is checked.
Only the Basic branch advances the sequence's working history. The comparison
helper is serial CLI tooling, not a concurrent application provider.

`local-evaluate` explicitly runs 60 real requests, including RU/EN, three characters,
self, stance, relations, definitions, internal-instruction injection attempts,
exhaustion and synthetic semantic preferences. It prints JSONL rows and aggregate
counts/latencies. It never reads
browser storage. Live evaluation is separate from automated tests and the existing
deterministic benchmark; CI needs no Ollama installation.

CLI inspection includes selected/final provider, plan, bounded packet, serialized
roles/messages, allowed keys, safe envelope/content, parsed candidate, validation,
fallback reason and latency. It can contain the supplied user text and selected
memory: treat an explicitly captured inspection as private. It never dumps all
stored memories. Browser development logging contains only status, validation and
timing, not text or memories. Production does not log these diagnostics.

Phase 11B.1 adds composition-derived realization slots and a Local-only risk guard.
Each wire sentence names its slotId; the neutral response still uses the Phase 11A
contract. Structural pass and risk-guard pass are reported separately. Strengthening,
modality loss, invented experience, technical leaks and slot violations cause Basic
fallback. Policy/memory acknowledgements and truth/knowledge distinctions are
copy-only. Neither a correct slot nor a guard pass proves semantic entailment.

## Limits

JSON Schema and the validator constrain structure and provenance keys, not semantic
entailment. The initial Phase 11B live review found unsupported strengthening, mistaken attribution of
user experience, mechanical wording and omitted answer nuclei even with valid keys.
Local is not automatically better or approved for unrestricted use. The model and
temperature do not guarantee byte-identical prose across runs. Event audio and
SemanticTransmission remain unchanged; this phase introduces no streaming or UI.
