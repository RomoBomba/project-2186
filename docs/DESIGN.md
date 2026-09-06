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

The authored logical display is **640 × 400**. Phase 1 implements Layout A as a
static reference composition. Viewport changes scale the entire surface without
rearranging its internal geometry. Layouts B and C remain future authored compositions.

| Layout | Composition                                         |
| ------ | --------------------------------------------------- |
| A      | Visual/portrait channel left                        |
| B      | Visual/portrait channel right                       |
| C      | Compact visual channel integrated into the terminal |

These are composed layouts. No arbitrary draggable or resizable windows.

## Provisional design tokens

These are the original CIVIC palette values. Interface colors now use the semantic
contract in `src/ui/display/standards.css`; typography remains in `src/ui/tokens.css`.
CIVIC retains the approved colors while the two monochrome standards have their own
authored luminance hierarchies.

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

## Phase 1 reference composition

The screen has a thin sage top rule, a compact system header, a 184-logical-pixel
visual column on the left, a 24-pixel gutter and an open communication field on
the right. The dormant command region continues below the right channel, leaving
the lower-left area open. A 16-pixel inset establishes the geometry.
There are no cards, rounded corners, shadows or decorative website content.

The visual channel is empty, with two short registration markers and an image-not-
assigned label. It is not a portrait, animation or a live visual state. The right
field holds a sparse Russian typography specimen. English system labels and Russian
sample text intentionally coexist for Phase 1 review; all copy is in locale resources,
and Russian regions carry `lang="ru"`. These are noncanonical composition placeholders,
not actual initialization, communication or readiness behaviour. The command region
is semantic static text, not an input, disabled widget or interactive prompt.

Void surrounds the deep-blue display. Ivory is primary text; sage, sea-glass and
warm-grey provide secondary hierarchy. Petrol delineates regions, and a single
small amber square marks the readiness specimen. The other palette tokens are
available but unused. No glow, scanlines, blur, noise, CRT effects or motion are
applied. Reduced-motion users therefore receive the same static composition.

### Typography

One replaceable `--font-system` stack uses local/system fonts: SFMono-Regular,
Consolas, Liberation Mono, Menlo, DejaVu Sans Mono, then generic monospace. These
fallbacks support Cyrillic on common platforms without font downloads or CDN
requests. Actual glyph metrics and rasterization remain OS-dependent; a final
bitmap/font choice still requires author review.

| Role                | Logical size / line height |
| ------------------- | -------------------------- |
| Micro metadata      | 9 / 12 px                  |
| Channel label       | 10 / 16 px                 |
| Body specimen       | 12 / 19 px                 |
| Primary state       | 12 / 16 px                 |
| Project designation | 16 / 20 px                 |

Micro metadata is regular weight with 0.3–0.65px tracking. Channel labels use
600 weight and 1px tracking; the primary state uses 600 weight and 0.5px tracking
without increasing its size above the body. Body text stays regular weight with
normal tracking and generous line height for Russian and English. Numeric
labels use tabular figures. No artificial sharpening, aggressive font smoothing,
blur or distortion is applied. Text uses contrasting palette pairs; dimmer petrol
rules are decorative, not a means of communicating essential information.

### Scaling and review limits

The display stays centred within a viewport surround padded by
`clamp(8px, 2vmin, 24px)`. Available width and height determine one uniform scale.
Use a whole-number scale when rounding down retains at least 95% of the full fit;
otherwise use the exact fractional fit. Below 1×, shrink uniformly. This avoids
large wasted areas from strict integer-only scaling. Aspect-ratio differences
produce surrounding negative space, never a mobile rearrangement.

One logical pixel can cover fractional device pixels during fractional scaling
or at noninteger browser zoom/device ratios. Crisp physical-pixel alignment is
therefore best at integer scales, not guaranteed at every viewport. No device-
pixel-ratio-specific font sizing is used. Very narrow windows retain the full
composition at the cost of small text; final accessibility/zoom accommodations
and the preferred minimum viewing size need author review. The scale policy and
component ownership are detailed in [architecture](ARCHITECTURE.md).

Review this first composition's density, blank visual field, proportions, type
sizes and palette before Phase 2. No final terminal behaviour is implied.

### Focused Phase 1 refinement

The visual frame sits 12 logical pixels below the signal channel's heading line,
like an embedded display region. Its image area is 184 × 184 logical pixels;
the width and 24-pixel gutter are unchanged. The signal field is open and unboxed,
with the state text near its upper-left channel alignment, 14 pixels below the
heading row. Numbered labels share `01 / VISUAL`, `02 / SIGNAL`, `03 / COMMAND`
notation; terminology remains provisional. The repeated readiness row and
website-like footer are removed.

The three rule forms are explicit tokens: a 2px sage primary surface rule, 1px
petrol secondary rules for the visual frame and partial header/command separators,
and 16px sea-glass data markers. Rules do not surround every region. The dormant
command channel has a static `>` and short marker suggesting a future input
position, but no input element, focus target, blinking cursor or behaviour.
The `DISPLAY / A` and `640 × 400` designation stays in place. Palette, shell,
scaling, font stack and phase boundaries are unchanged; no effects were added.

## Phase 2 boot and display transitions

Boot runs on each page load and silently leads into the approved Phase 1 shell.
Reload to replay; Escape skips immediately to the shell. The small `ESC / BYPASS`
hint belongs only to the boot screen, with no permanent replay/debug button.

### Authored rhythm

| State / event                                       | Normal hold, including transition |
| --------------------------------------------------- | --------------------------------- |
| Dormant / void                                      | 180 ms                            |
| Power / short central line establishes horizontally | 160 ms                            |
| Display / vertical expansion                        | 420 ms                            |
| Initialization / display acknowledgement            | 380 ms                            |
| Initialization / archive standby                    | 420 ms                            |
| Initialization / language acknowledgement           | 520 ms                            |
| Identity / PROJECT 2186                             | 1,000 ms                          |
| Collapse / contract to central line                 | 220 ms                            |
| Reveal / expand the existing shell                  | 360 ms                            |
| Ready / static Phase 1 shell                        | No further timer                  |

The authored total is **3.66 seconds**, subject to browser scheduling. Three sparse
whole-line acknowledgements appear without typing or scrolling. Identity follows a
short pause and uses the existing type/palette tokens. Copy is fictional display
acknowledgement, not diagnostics for implemented archive, memory or intelligence
systems, and establishes no detailed hardware lore. Russian and English are
separate resources; the current application locale determines the boot language.

### Display language

A short, one-logical-pixel sea-glass line widens across the logical display. The
deep background and its content then expand vertically from the central line.
For the handoff, the boot surface contracts vertically, content changes while
collapsed, and the unchanged Phase 1 composition expands in the same coordinate
space. Content is clipped, never stretched. This is display geometry rather than
webpage navigation or a page fade.

The same small primitive provides off, power, expand, hold and collapse phases for
future authored screens. No animation framework, audio, glow, curvature, RGB
separation, brightness flash, noise or glitch is added. The line is muted and the
large-area surface remains dark. Boot does not introduce later-phase behaviour.

### Reduced motion and review

With `prefers-reduced-motion: reduce`, no line animation or expansion/collapse runs.
The semantic steps retain their order, with three 60 ms acknowledgements and a
140 ms identity hold: approximately **320 ms** total, then the static shell.
Zero-duration geometry steps do not introduce bright flashes. Enabling reduced
motion during playback cancels the current hold and accelerates the remaining
steps in order. Skipping works in either mode.

In the development server only, `?boot-motion=reduce` forces the same motion-free
path for visual review without changing OS settings. It cannot override a user's
reduced-motion preference with more motion, and it is ignored in production.
Reload without the query to review normal playback. Timing, copy and the intensity
of the muted activation line remain artistic review points before Phase 3.

Phase 2 final readability adjustment: acknowledgement rows alone use 11px text
(previously 10px, a 10% increase), retaining their 16px line height and positions.
The identity block and Phase 1 typography are unchanged. Escape is a true bypass:
it cancels the sequence timer and enters the shell immediately from every boot
step, including expansion/collapse. The localized hint is removed with the boot
screen; no later boot update can resume playback after bypass.

## Phase 3A first-run configuration

Phase 3A originally ended at an intelligence-configuration-required placeholder.
Phase 3B extends the path: boot → linguistic interface → display geometry → display standard
→ audio channel → intelligence selection → confirmation → dormant shell. Boot bypass now enters setup;
it does not bypass configuration. Reload starts a fresh session. No character
selection or terminal entry is implemented in Phase 3A.

Each stage is a separate authored 640 × 400 state. A small PROJECT 2186 header,
numbered stage title, concise instruction and open choice region continue the
approved palette, typography and rule language. English and Russian have equivalent
resources; language names remain autonyms (`РУССКИЙ`, `ENGLISH`). Confirming language
changes all subsequent setup copy, including guidance and completion. It is not a
form containing all parameters, and no settings/save/next interface is introduced.

Choices are semantic buttons presented as numbered text. Arrow keys in either axis
move focus with wrapping; Enter or a click confirms. Native Space activation also
works. Only the current choice is in the option group's Tab sequence, and a separate
back control remains reachable. A small amber `>` plus keyboard-focus underline
identifies focus without relying on colour alone. No radio controls, pills, rounded
cards or hover-dependent interaction. Focus moves to the retained/default choice
on entering a stage; the completion heading receives focus. Controls are inert
until the display has fully expanded, preventing accidental repeated confirmation.

Escape returns from layout to language, standard to layout, and audio to standard,
retaining confirmed values. A matching `ESC / RETURN` / `ESC / ВОЗВРАТ` control makes
revision available to the mouse. Escape has no action at the first language stage.

The default display standard is CIVIC. The default active language is the existing English locale. Russian appears first
in the language list; focus starts on the current language. Layout defaults to A;
audio defaults to muted. These are in-session defaults, subject to author review.

Layout A/B/C options use 128 × 80 CSS schematics: a screen rule, an empty visual
rectangle, a signal marker and a command rule. B moves the visual rectangle to the
right; C integrates a smaller visual region. They are abstract compositions, not
rendered terminal previews or alternative terminal implementations. Choosing a
layout records its identifier only; the approved Layout A source is untouched.

Audio choices record enabled/muted only. Sparse copy states that this is signal
configuration and sound is not yet available. There is no sound generation or
AudioEngine implementation. The final screen explicitly requires intelligence
configuration and labels its selection channel as not yet available. It deliberately
stops there, with revision available, instead of opening the terminal.

Transitions are reserved for language confirmation (entering display configuration)
and final audio confirmation (leaving configuration): the approved 220 ms collapse
and 360 ms expansion, through the existing DisplayTransition primitive. Layout →
audio and all back navigation use direct state replacement within the same surface.
Arrow movement never animates the screen. Reduced motion changes stages immediately;
enabling it during a transition completes that transition promptly. The existing
development `?boot-motion=reduce` preview also applies to setup.

## Authored display standards

There are exactly three machine display standards, not user-customizable themes:

- **01 / CIVIC** is canonical: the approved navy/blue-green ground, teal/sage
  information, ivory primary text and sparse independent amber accent are preserved.
- **02 / PHOSPHOR** has almost-black green grounds, milky pale-green primary text,
  muted medium-green information, darker green metadata and subdued green rules.
  Its accent and positive/dormant states remain within the green spectrum; ivory
  and amber are absent. Luminance, not multicolour categories, establishes hierarchy.
- **03 / AMBER** has brown-black grounds, pale amber primary text, ochre information,
  burnt-amber metadata and dark brown rules. Accent remains warm amber; warm cream
  is reserved in the positive-state token for rare important acknowledgements.

Near-monochrome standards flatten the chromatic separation of the surface and use
brightness within a single phosphor spectrum. They are deliberately darker and
less chromatically varied than CIVIC, without changing the approved typography,
layout geometry or transition rhythm. No neon, glow, scanlines, noise, filters or
other effects are added.

A new stage after language presents three small schematic terminal specimens,
including Latin/Cyrillic text, metadata, rules and a dormant command marker. Each
specimen establishes its own standard using the same actual semantic tokens as the
full interface. These are live CSS schematics, not screenshots, colour swatches or
cards. Labels remain under the currently active standard. Focus previews an option
without changing the machine; Enter or a click confirms and immediately applies
that standard to the full surround and interface before the geometry stage.
Returning to this stage preserves the active standard and all three independent
preview palettes. The setting remains in-session, defaulting to CIVIC on reload.

Standard changes affect chrome, boot/system text, setup, command notation and
rules. Future portraits, digitized images and authored media own their own colour
treatment: no global filter, tint, blend or image-processing operation is applied.
Phase 3B now attaches selection to the setup completion boundary.

## Phase 3B intelligence channels

Three simultaneous open channels occupy the 640 × 400 display horizontally:
ALETHEIA, AURA, THEMIS. Each column is 176 logical pixels wide, separated by 32 pixels,
with 24-pixel outer margins. Sparse calibration fields, an index, identity rule,
philosophical origin and two short behavioural lines introduce configurations rather
than avatar cards. Copy is authored in Russian and English from the Character Bible;
it is provisional UI text, not dialogue or new lore.

Each portrait placeholder has an exact **144 × 180 logical pixel canvas (4:5)**,
with its one-pixel outline outside that canvas. This leaves a consistent head/shoulder
field for future digitized assets. No human silhouette or portrait is simulated.
Registration corners and a quiet central calibration mark identify an empty image
channel. Final art and image degradation remain deferred.

ALETHEIA initially has focus. Left/Right wrap at either end; Enter confirms.
Native buttons also support mouse click and Space, and only the focused channel is
in the Tab sequence. Focus has a `>` marker, extended brighter identity rule and
keyboard underline, so it does not depend on colour. Focus changes are immediate;
there are no hover animations, slides or scaling effects.

Audio completion reuses the existing collapse/expand to reveal selection. Selection
confirmation uses the same 220/360 ms geometry, holds the accepted identity for
1.2 seconds, then transitions into the approved dormant shell with instance metadata.
Reduced motion removes geometry while retaining readable confirmation time. Inputs
are inert during geometric transitions; no conversation or runtime is activated.

All chrome and calibration fields consume the existing semantic display tokens.
CIVIC, PHOSPHOR and AMBER keep the same authored composition; no character overrides
its display standard. Future portraits/media will retain independently authored
colours rather than inheriting a global tint. Review the canvas crop, concise copy
and confirmation dwell before producing final artwork.
