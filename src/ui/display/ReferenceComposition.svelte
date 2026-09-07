<script lang="ts">
  import { tick } from 'svelte';
  import GeometryOverlay from './GeometryOverlay.svelte';
  import type { Layout } from '../setup/model';
  import NeutralPortrait from '../portrait/NeutralPortrait.svelte';
  import { defaultLocale, type Locale } from '../../core/language/locale';
  import { intelligenceMessages } from '../../locales/intelligence';
  import { systemMessages } from '../../locales/system';

  import type { CharacterId } from '../../core/character/id';
  import TerminalCommunication from '../terminal/TerminalCommunication.svelte';
  let {
    locale = defaultLocale,
    layout = 'A',
    onlayoutchange,
    character,
    active,
    reducedMotion,
  }: {
    locale?: Locale;
    layout?: Layout;
    onlayoutchange?: (layout: Layout) => void;
    character: CharacterId;
    active: boolean;
    reducedMotion: boolean;
  } = $props();
  let geometryOpen = $state(false);
  let returnFocus: HTMLElement | null = null;
  function openGeometry() {
    if (!active || geometryOpen) return;
    returnFocus = document.activeElement as HTMLElement | null;
    geometryOpen = true;
  }
  function closeGeometry(value?: Layout) {
    if (value) onlayoutchange?.(value);
    geometryOpen = false;
    void tick().then(() => returnFocus?.focus({ preventScroll: true }));
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'F2' && active) {
      event.preventDefault();
      if (!event.repeat) openGeometry();
    }
  }
  const labels = $derived(systemMessages[locale]);
</script>

<svelte:window onkeydown={keydown} />
<div class="terminal-surface">
  <main
    inert={geometryOpen}
    class="composition"
    data-layout={layout}
    lang={locale}
    aria-labelledby="project-title"
  >
    <header class="system-header">
      <div>
        <h1 id="project-title" tabindex="-1">PROJECT <span>2186</span></h1>
        <p class="caption terminal-label">{labels.terminal}</p>
      </div>
      <div class="display-designation caption">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={geometryOpen}
          aria-keyshortcuts="F2"
          onclick={openGeometry}>{labels.display} / {layout}</button
        >
      </div>
    </header>

    <section class="visual-channel" aria-labelledby="visual-label">
      <h2 id="visual-label" class="label">
        <span class="channel-index">01 /</span>{labels.visualChannel}
      </h2>
      <figure class="portrait-module">
        <div class="visual-field">
          <NeutralPortrait {character} compact={layout === 'C'}>
            <div class="empty-register" aria-hidden="true"></div>
            <p class="caption absent-image">{labels.noImage}</p>
          </NeutralPortrait>
        </div>
        <figcaption class="caption channel-footnote">
          <span>{intelligenceMessages[locale].instance} /</span>
          {character.toUpperCase()}
        </figcaption>
      </figure>
    </section>

    <TerminalCommunication {character} {locale} {active} {reducedMotion} />
  </main>
  {#if geometryOpen}
    <div class="geometry-backdrop"></div>
    <GeometryOverlay
      {layout}
      {locale}
      onapply={closeGeometry}
      oncancel={() => closeGeometry()}
    />
  {/if}
</div>

<style>
  .geometry-backdrop {
    position: absolute;
    inset: 0;
    background: var(--display-background);
    z-index: 3;
  }
  .terminal-surface {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .composition {
    width: 100%;
    height: 100%;
    padding: 16px;
    display: grid;
    grid-template-columns: 184px 1fr;
    grid-template-rows: 48px 238px 62px;
    gap: 8px 24px;
    border-top: 2px solid var(--display-rule-primary);
    color: var(--display-text-primary);
    font-size: var(--type-body);
    line-height: var(--leading-body);
    font-variant-numeric: tabular-nums;
  }

  h1,
  h2,
  p {
    margin: 0;
    font-weight: 400;
  }
  .caption {
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    letter-spacing: 0.3px;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--type-label);
    line-height: var(--leading-label);
    font-weight: 600;
    letter-spacing: 0;
    font-size: 8px;
    white-space: nowrap;
    color: var(--display-text-secondary);
  }
  .channel-index {
    color: var(--display-text-muted);
    font-weight: 400;
    letter-spacing: 0;
  }

  .system-header {
    position: relative;
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
  }
  .system-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 448px;
    border-bottom: 1px solid var(--display-rule-secondary);
  }
  h1 {
    outline: none;
    font-size: var(--type-title);
    line-height: var(--leading-title);
    letter-spacing: 1px;
  }
  h1 span {
    color: var(--display-text-secondary);
  }
  .terminal-label {
    margin-top: 4px;
    color: var(--display-text-muted);
    letter-spacing: 0.65px;
  }
  .display-designation {
    display: grid;
    align-content: start;
    gap: 5px;
    text-align: right;
    color: var(--display-state-dormant);
  }
  .display-designation button {
    appearance: none;
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .display-designation button:focus-visible {
    outline: 1px solid var(--display-rule-primary);
    outline-offset: 4px;
  }

  .visual-channel {
    grid-column: 1;
    grid-row: 2;
    padding-top: 12px;
    width: 144px;
    justify-self: center;
    display: grid;
    grid-template-rows: 24px 1fr;
  }
  .portrait-module {
    width: 144px;
    margin: 2px auto 0;
  }
  .visual-field {
    width: 144px;
    height: 180px;
    place-self: center;
    position: relative;
    display: grid;
    place-items: center;
    outline: 1px solid var(--display-rule-secondary);
    background: var(--display-background);
  }
  .empty-register {
    width: 16px;
    height: 32px;
    border-top: 1px solid var(--display-text-muted);
    border-bottom: 1px solid var(--display-text-muted);
  }
  .absent-image {
    position: absolute;
    bottom: 10px;
    color: var(--display-text-muted);
    letter-spacing: 0.2px;
  }
  .channel-footnote {
    margin-top: 6px;
    white-space: nowrap;
    color: var(--display-text-muted);
  }
  /* B mirrors channel placement, never text direction or semantic DOM order. */
  .composition[data-layout='B'] {
    grid-template-columns: 1fr 184px;
    --signal-column: 1;
    --command-column: 1;
  }
  [data-layout='B'] .visual-channel {
    grid-column: 2;
  }
  [data-layout='B'] .system-header::after {
    left: auto;
    right: 0;
  }
  /* C gives the full-width reading surface its own row beneath the inset. */
  .composition[data-layout='C'] {
    grid-template-columns: 1fr;
    grid-template-rows: 126px 160px 62px;
    --signal-column: 1;
    --command-column: 1;
  }
  [data-layout='C'] .system-header {
    grid-row: 1;
    display: block;
  }
  [data-layout='C'] .display-designation {
    margin-top: 18px;
    justify-items: start;
    text-align: left;
  }
  [data-layout='C'] .system-header::after {
    width: 100%;
  }
  [data-layout='C'] .visual-channel {
    grid-row: 1;
    justify-self: end;
    align-self: start;
    width: 144px;
    padding-top: 0;
    grid-template-rows: 14px 1fr;
    z-index: 1;
  }
  [data-layout='C'] .label {
    justify-content: flex-end;
    text-align: right;
    font-size: var(--type-caption);
    line-height: 12px;
    letter-spacing: 0;
    gap: 6px;
  }
  [data-layout='C'] .portrait-module {
    width: 144px;
    margin: 0;
  }
  [data-layout='C'] .visual-field {
    width: 72px;
    height: 90px;
    margin-left: auto;
    place-self: end;
  }
  [data-layout='C'] .channel-footnote {
    text-align: right;
    margin-top: 4px;
    font-size: 8px;
    letter-spacing: 0;
  }
</style>
