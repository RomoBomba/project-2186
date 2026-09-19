# AURA visibility calibration — runtime review

Measured through actual terminal DOM DEV traces, not the motion demo.
Times below are epoch milliseconds from `Date.now()`; relative values use forming
entry as zero. No cognition or SemanticTransmission timings were modified.

## Baseline

On `/?boot-motion=reduce`, forming began 1789817769086; thinking was skipped at
1789817769101; transmitting ended 1789817769114. This override propagates to the
whole application, not only boot. It is unsuitable for normal-motion acceptance.

On plain `/`, “Привет.”:

| Event                |      Epoch ms | Relative ms |
| -------------------- | ------------: | ----------: |
| forming              | 1789817810321 |           0 |
| thinking fade begins | 1789817810522 |         201 |
| thinking entered     | 1789817810726 |         405 |
| text transmitting    | 1789817810774 |         453 |
| A fade begins        | 1789817811024 |         703 |
| text ready           | 1789817811107 |         786 |
| neutral restored     | 1789817811609 |        1288 |

For “Что такое память?” text transmitting 1789817817964→1789817818656 (692ms).
A only completed at 1789817818383, B never entered. Blink did fire at
1789817825616 and exited 1789817825805. No absent-state-controller defect found.
The old 2400ms transform interpolation also obscured the tiny thinking offset.

## After calibration

Short greeting: forming 1789817957326; thinking fade +101ms; thinking entered
+274ms; text transmitting +453ms; A entered +597ms; text ready +803ms.

Medium “Что такое свобода?”:

| Event             |      Epoch ms | Relative ms |
| ----------------- | ------------: | ----------: |
| forming           | 1789817985849 |           0 |
| thinking entered  | 1789817986124 |         275 |
| text transmitting | 1789817986305 |         456 |
| A entered         | 1789817986452 |         603 |
| B entered         | 1789817986876 |        1027 |
| return fade to A  | 1789817987364 |        1515 |
| text ready        | 1789817987387 |        1538 |
| neutral restored  | 1789817988019 |        2170 |

B stable hold was 488ms. Short single-chunk responses may bypass observable
transmitting entirely; attention still appears and then returns to neutral.
No fake transmission is added after text completion.

Layout C: while input contained “Что такое”, blink entered 1789818055419 and
1789818060918, before submission. Typing did not reset scheduling. The modest
AURA-only thinking pose and registered eye changes were inspected at full and
compact sizes. Blink timing, B softness, Aletheia assets/profile, audio and text
transmission remain outside this pass.

## Review limitation

The connected browser tool supports still screenshots and DOM inspection but no
video recording capability. A requested 15–20s actual-terminal recording and
normal-speed video acceptance were NOT completed. No slideshow or motion-demo
recording is substituted. Final normal-speed visibility remains an author review
item at the plain URL, with reduced-motion preferences off.
