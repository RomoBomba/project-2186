<script lang="ts">
  import { moveGeometry } from './geometry';
  import { tick } from 'svelte';
  import type { Locale } from '../../core/language/locale';
  import { setupMessages } from '../../locales/setup';
  import LayoutSchematic from '../setup/LayoutSchematic.svelte';
  import { layouts, type Layout } from '../setup/model';

  let {
    layout,
    locale,
    onapply,
    oncancel,
  }: {
    layout: Layout;
    locale: Locale;
    onapply: (layout: Layout) => void;
    oncancel: () => void;
  } = $props();
  let cursor = $state(0);
  let root: HTMLElement;
  const copy = $derived(setupMessages[locale]);
  $effect(() => {
    cursor = layouts.indexOf(layout);
    void tick().then(() =>
      root
        ?.querySelector<HTMLButtonElement>(`[data-choice="${cursor}"]`)
        ?.focus(),
    );
  });
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
    } else if (
      ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      cursor = moveGeometry(cursor, event.key);
      root
        .querySelector<HTMLButtonElement>(`[data-choice="${cursor}"]`)
        ?.focus();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const buttons = Array.from(root.querySelectorAll('button'));
      const index = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      buttons[
        (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length
      ]?.focus();
    } else if (event.key === 'Enter' && event.repeat) event.preventDefault();
  }
</script>

<div
  class="geometry-mode"
  role="dialog"
  aria-modal="true"
  aria-labelledby="geometry-title"
  tabindex="-1"
  bind:this={root}
  onkeydown={keydown}
  lang={locale}
>
  <h2 id="geometry-title">{copy.layoutTitle}</h2>
  <div class="choices">
    {#each layouts as choice, index (choice)}
      <button
        type="button"
        data-choice={index}
        aria-pressed={layout === choice}
        onfocus={() => (cursor = index)}
        onclick={() => onapply(choice)}
      >
        <span class="name"
          ><span class="pointer" aria-hidden="true"
            >{cursor === index ? '>' : ' '}</span
          ><span class="letter">{choice}</span></span
        >
        <LayoutSchematic layout={choice} />
        <span class="description"
          >{[copy.layoutA, copy.layoutB, copy.layoutC][index]}</span
        >
      </button>
    {/each}
  </div>
  <footer>
    <span>{copy.navigate}</span><span>{copy.apply}</span><button
      type="button"
      onclick={oncancel}>{copy.back}</button
    >
  </footer>
</div>

<style>
  .geometry-mode {
    position: absolute;
    inset: 64px 24px;
    z-index: 4;
    padding: 20px 16px;
    background: var(--display-surface);
    color: var(--display-text-primary);
    border-block: 1px solid var(--display-rule-primary);
    outline: none;
  }
  h2 {
    margin: 0 0 26px;
    font-size: var(--type-label);
    font-weight: 400;
    letter-spacing: 1px;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(3, 148px);
    justify-content: space-between;
    gap: 24px;
  }
  button {
    appearance: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--display-text-secondary);
    font: inherit;
    text-align: left;
    padding: 0;
    cursor: pointer;
  }
  .choices button {
    width: 148px;
    font-size: var(--type-caption);
  }
  button:focus-visible {
    outline: 1px solid var(--display-rule-primary);
    outline-offset: 5px;
  }
  .name {
    display: block;
    white-space: nowrap;
    margin-bottom: 12px;
  }
  .pointer {
    display: inline-block;
    width: 12px;
    color: var(--display-accent);
    white-space: pre;
  }
  .choices button[aria-pressed='true'] .letter {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .description {
    display: block;
    margin-top: 10px;
    white-space: nowrap;
    line-height: var(--leading-caption);
    color: var(--display-text-secondary);
  }
  footer {
    display: flex;
    justify-content: space-between;
    margin-top: 26px;
    font-size: var(--type-caption);
    color: var(--display-text-muted);
  }
</style>
