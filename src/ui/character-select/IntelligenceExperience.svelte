<script lang="ts">
  import aletheiaNeutral from '../../assets/portraits/aletheia/neutral.png';
  import { onDestroy, tick } from 'svelte';
  import { characterIds, type CharacterId } from '../../core/character/id';
  import { intelligenceMessages } from '../../locales/intelligence';
  import type { SystemConfiguration } from '../setup/model';
  import DisplayTransition from '../display/DisplayTransition.svelte';
  import ReferenceComposition from '../display/ReferenceComposition.svelte';
  import {
    createSelection,
    updateSelection,
    type SelectionModel,
  } from './model';

  let {
    configuration,
    reducedMotion,
    active,
  }: {
    configuration: SystemConfiguration;
    reducedMotion: boolean;
    active: boolean;
  } = $props();
  let model = $state(createSelection());
  let phase = $state<'hold' | 'collapse' | 'expand'>('hold');
  let root: HTMLElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: SelectionModel | undefined;
  let disposed = false;
  const copy = $derived(intelligenceMessages[configuration.language]);

  $effect(() => {
    if (!active || phase !== 'hold') return;
    const current = model;
    void tick().then(() => {
      if (disposed) return;
      if (current.stage === 'selection')
        root
          ?.querySelector<HTMLElement>(`[data-character="${current.focused}"]`)
          ?.focus({ preventScroll: true });
      else
        root?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    });
  });
  $effect(() => {
    if (reducedMotion && phase !== 'hold') {
      clearTimeout(timer);
      if (pending) model = pending;
      pending = undefined;
      phase = 'hold';
    }
  });
  $effect(() => {
    if (active && phase === 'hold' && model.stage === 'confirmation') {
      const hold = setTimeout(
        () => transition(updateSelection(model, { type: 'settle' })),
        1200,
      );
      return () => clearTimeout(hold);
    }
  });
  onDestroy(() => {
    disposed = true;
    clearTimeout(timer);
  });

  function transition(next: SelectionModel) {
    if (reducedMotion) {
      model = next;
      return;
    }
    pending = next;
    phase = 'collapse';
    timer = setTimeout(() => {
      model = next;
      pending = undefined;
      phase = 'expand';
      timer = setTimeout(() => {
        phase = 'hold';
      }, 360);
    }, 220);
  }
  function confirm(character: CharacterId) {
    if (!active || phase !== 'hold' || model.stage !== 'selection') return;
    transition(updateSelection(model, { type: 'confirm', character }));
  }
  function focus(character: CharacterId) {
    if (model.stage === 'selection' && model.focused !== character)
      model = updateSelection(model, { type: 'focus', character });
  }
  function onkeydown(event: KeyboardEvent) {
    if (
      !active ||
      phase !== 'hold' ||
      model.stage !== 'selection' ||
      !root?.contains(document.activeElement)
    )
      return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      model = updateSelection(model, {
        type: 'move',
        direction: event.key === 'ArrowLeft' ? -1 : 1,
      });
    } else if (event.key === 'Enter' && event.repeat) event.preventDefault();
  }
</script>

<svelte:window {onkeydown} />
<DisplayTransition
  {phase}
  duration={phase === 'collapse' ? 220 : 360}
  {reducedMotion}
>
  <div
    class="experience"
    bind:this={root}
    inert={!active || phase !== 'hold'}
    data-intelligence-stage={model.stage}
  >
    {#if model.stage === 'shell'}
      <ReferenceComposition
        locale={configuration.language}
        character={model.selected}
      />
    {:else}
      <main
        class="intelligence"
        lang={configuration.language}
        aria-labelledby="intelligence-title"
      >
        <header>
          <span>PROJECT 2186</span><span class="resolution">640 × 400</span>
        </header>
        <h1 id="intelligence-title" tabindex="-1">
          {model.stage === 'selection' ? copy.title : copy.accepted}
        </h1>
        {#if model.stage === 'selection'}
          <div class="channels">
            {#each characterIds as character, index (character)}
              <button
                type="button"
                class:focused={model.focused === character}
                data-character={character}
                tabindex={model.focused === character ? 0 : -1}
                aria-label={character.toUpperCase()}
                aria-describedby={`${character}-copy`}
                onfocus={() => focus(character)}
                onclick={() => confirm(character)}
              >
                <span class="register" aria-hidden="true"
                  >0{index + 1} / <span>{copy.channel}</span></span
                >
                <span class="portrait" aria-hidden="true">
                  {#if character === 'aletheia'}
                    <img
                      src={aletheiaNeutral}
                      alt=""
                      width="144"
                      height="180"
                      draggable="false"
                    />
                  {:else}
                    <span class="calibration"></span><span class="canvas-label"
                      >144 × 180 / {String(index + 1).padStart(2, '0')}</span
                    >
                  {/if}
                </span>
                <span class="identity"
                  ><span class="pointer" aria-hidden="true">&gt;</span
                  >{character.toUpperCase()}</span
                >
                <span id={`${character}-copy`} class="character-copy"
                  ><span class="origin"
                    >{copy.characters[character].origin}</span
                  ><span class="description"
                    >{copy.characters[character].description}</span
                  ></span
                >
              </button>
            {/each}
          </div>
          <footer>
            <span>{copy.navigate}</span><span>{copy.confirm}</span><span
              class="count">01—03</span
            >
          </footer>
        {:else}
          <p class="accepted" role="status">
            <span>{copy.instance} /</span>
            {model.selected.toUpperCase()}
          </p>
        {/if}
      </main>
    {/if}
  </div>
</DisplayTransition>

<style>
  img {
    display: block;
    width: 144px;
    height: 180px;
    image-rendering: pixelated;
  }

  .experience {
    width: 100%;
    height: 100%;
  }
  .intelligence {
    height: 100%;
    padding: 16px 24px;
    position: relative;
    border-top: 2px solid var(--display-rule-primary);
    color: var(--display-text-primary);
    background: var(--display-surface);
  }
  header {
    display: flex;
    justify-content: space-between;
    font-size: var(--type-label);
    line-height: 16px;
    letter-spacing: 0.7px;
  }
  .resolution {
    color: var(--display-text-muted);
    font-size: var(--type-caption);
    letter-spacing: 0;
  }
  h1 {
    margin: 10px 0 8px;
    font-size: var(--type-label);
    font-weight: 400;
    line-height: 16px;
    letter-spacing: 1px;
    color: var(--display-text-secondary);
    outline: none;
  }
  .channels {
    display: grid;
    grid-template-columns: repeat(3, 176px);
    gap: 32px;
  }
  button {
    appearance: none;
    border: 0;
    border-radius: 0;
    padding: 0;
    font: inherit;
    text-align: left;
    background: transparent;
    color: var(--display-text-secondary);
    cursor: pointer;
    outline: none;
  }
  .register {
    display: block;
    font-size: var(--type-caption);
    line-height: 12px;
    color: var(--display-text-muted);
    margin-bottom: 8px;
  }
  .register > span {
    margin-left: 5px;
    font-size: 8px;
    letter-spacing: 0.25px;
  }
  .portrait {
    display: block;
    position: relative;
    width: 144px;
    height: 180px;
    margin-left: 16px;
    background: var(--display-background);
    outline: 1px solid var(--display-rule-secondary);
  }
  .portrait::before,
  .portrait::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: var(--display-text-muted);
    border-style: solid;
  }
  .portrait::before {
    top: 5px;
    left: 5px;
    border-width: 1px 0 0 1px;
  }
  .portrait::after {
    bottom: 5px;
    right: 5px;
    border-width: 0 1px 1px 0;
  }
  .calibration {
    position: absolute;
    left: 64px;
    top: 70px;
    width: 16px;
    height: 32px;
    border-top: 1px solid var(--display-rule-secondary);
    border-bottom: 1px solid var(--display-rule-secondary);
  }
  .canvas-label {
    position: absolute;
    bottom: 16px;
    width: 100%;
    text-align: center;
    font-size: 8px;
    line-height: 12px;
    color: var(--display-text-muted);
  }
  .identity {
    display: block;
    position: relative;
    border-top: 1px solid var(--display-rule-secondary);
    padding-top: 8px;
    margin-top: 12px;
    font-size: 13px;
    line-height: 16px;
    letter-spacing: 1.5px;
  }
  .pointer {
    display: inline-block;
    width: 16px;
    visibility: hidden;
    color: var(--display-accent);
  }
  .focused .pointer {
    visibility: visible;
  }
  .focused .identity {
    border-color: var(--display-rule-primary);
    color: var(--display-text-primary);
  }
  button:focus-visible .identity {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .character-copy,
  .origin,
  .description {
    display: block;
  }
  .origin {
    margin-top: 7px;
    min-height: 12px;
    font-size: 9px;
    line-height: 12px;
    color: var(--display-text-muted);
  }
  .description {
    margin-top: 8px;
    font-size: 10px;
    line-height: 14px;
    white-space: pre-line;
  }
  footer {
    position: absolute;
    bottom: 16px;
    left: 24px;
    right: 24px;
    display: flex;
    gap: 24px;
    font-size: var(--type-caption);
    line-height: 12px;
    color: var(--display-text-muted);
  }
  .count {
    margin-left: auto;
  }
  .accepted {
    margin: 72px 0 0 24px;
    font-size: 16px;
    letter-spacing: 1px;
  }
  .accepted span {
    display: block;
    margin-bottom: 14px;
    font-size: var(--type-label);
    color: var(--display-text-muted);
  }
</style>
