# Design foundation

## Intent

PROJECT 2186 should feel like a highly advanced intelligence whose visual language
evolved from vintage computing. It is software art and an alternative history of
computing, not an imitation operating system or a modern chatbot in a retro frame.
Prioritize presence, restraint, coherence, personality, continuity, curiosity and
mystery. The user should want to stay before the system becomes technically clever.

Draw from scientific terminals, 1980s/1990s multimedia, digitized imagery,
Videotex/Teletext, early scientific visualization and optimistic retrofuturism.
The mood is progressive, utopian, mysterious and restrained. All visual, temporal
and audio choices should feel authored by one fictional technological culture.

## Logical display and composition

The authored logical display target is **640 × 400**. Modern viewport scaling,
font selection and small-screen behaviour require Phase 1 visual review. Do not
implement scaling or screen geometry in Phase 0.

| Layout | Composition                                         |
| ------ | --------------------------------------------------- |
| A      | Visual/portrait channel left                        |
| B      | Visual/portrait channel right                       |
| C      | Compact visual channel integrated into the terminal |

These are composed layouts. No arbitrary draggable or resizable windows.

## Provisional design tokens

These values are documentation tokens only in Phase 0. The palette is provisional
and expected to evolve after visual reference/prototype review.

| Token           | Value     |
| --------------- | --------- |
| background-void | `#07131B` |
| background-deep | `#0B1F2A` |
| blue-slate      | `#123443` |
| petrol          | `#1B5260` |
| muted-teal      | `#2D7278` |
| sea-glass       | `#5A9992` |
| sage            | `#92B6A7` |
| ivory           | `#D8D6B8` |
| warm-grey       | `#A79E88` |
| amber           | `#D3A14A` |
| rust            | `#B96B3D` |
| muted-green     | `#496E58` |

## Eventual experience

First run: short boot → basic system configuration → language → layout → audio
selection → character selection → terminal. Character selection uses three large,
separated portrait regions for ALETHEIA, AURA and THEMIS. Support arrow keys,
Enter and mouse. Avoid modern cards. Major screens use a restrained old-display
collapse/expansion transition.

The terminal contains a header/status area, portrait/visual channel, conversation,
text input and minimal system information. Do not use chat bubbles. Never expose
numeric mood, familiarity, trust or relationship gains. Authored states should
communicate the character's activity without generic “AI is thinking…” labels.

Transmit thought in semantic chunks or short phrases, never letter-by-letter
with a typewriter effect. Timing can use punctuation, phrase length, hesitation
and ResponsePlan pause hints. The response may already be complete internally.
Keep interaction responsive; atmosphere must not become frustrating delay.

## Portrait direction

Use low-resolution digitized portraits inspired by video stills, limited indexed
palettes and dithering, not ordinary modern AI illustrations inside retro frames.
Proposed production: source → crop → reduce resolution → index palette → dither
→ manual cleanup. Approximately 5–7 states per character: neutral, blink,
look-away, thinking, speaking-a, speaking-b, and a rare special/disturbed state.
Portraits are nearly still most of the time; rare motion carries meaning.

- Aletheia: cold illumination, glass, archives, reflections, thin geometry, rare gaze movement.
- Aura: amber within blue/teal, faded photography, gentle dithering, low analog noise,
  rare subtle smile, possibly warmer night lighting.
- Themis: symmetry, grids, diagrams, geometry, petrol/ivory, minimal motion and
  slightly sharper analysis-state changes.

These associations guide later art review; they do not authorize assets or effects now.

## Audio direction

Later use Web Audio API through AudioEngine, without a large sound library.
Oscillators, gain envelopes, filters and noise form a small procedural vocabulary:
boot, key, confirm, error, receive, transition and character motifs. Store motifs
as data. A future constrained synth instruction may specify waveform, frequencies,
durations and envelope; no generative audio AI is required.

## Restrictions

No generic chatbot/SaaS UI, Material Design, modern cards, excessive rounding,
emoji, glossy gradients, generic loading spinners where authored states fit,
continuous avatar motion or excessive glitches/CRT distortion. Avoid generic
cyberpunk, neon magenta, pervasive Matrix green and dystopian corporate clichés.
References guide analysis, not direct copying; see [reference workflow](references/README.md).

Phase 0 implements no final UI, CRT, portraits, animations, transitions or audio.
