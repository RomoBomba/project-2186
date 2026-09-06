<script lang="ts">
  import { onDestroy, tick, type Snippet } from 'svelte';
  import { languageChoices, setupMessages } from '../../locales/setup';
  import DisplayTransition from '../display/DisplayTransition.svelte';
  import { displayStandards, type DisplayStandard } from '../display/standards';
  import StandardPreview from './StandardPreview.svelte';
  import LayoutSchematic from './LayoutSchematic.svelte';
  import {
    createSetup,
    layouts,
    updateSetup,
    type SetupAction,
    type SetupModel,
    type SystemConfiguration,
  } from './model';

  let {
    reducedMotion,
    active,
    onstandardchange,
    children,
  }: {
    children: Snippet<[SystemConfiguration, boolean]>;
    reducedMotion: boolean;
    active: boolean;
    onstandardchange: (standard: DisplayStandard) => void;
  } = $props();
  let model = $state(createSetup());
  let cursor = $state(1);
  let phase = $state<'hold' | 'collapse' | 'expand'>('hold');
  let root = $state<HTMLElement>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: SetupModel | undefined;
  let disposed = false;
  const copy = $derived(setupMessages[model.configuration.language]);
  const stageCopy = $derived(
    {
      language: {
        number: '01',
        title: copy.languageTitle,
        prompt: copy.languagePrompt,
      },
      standard: {
        number: '03',
        title: copy.standardTitle,
        prompt: copy.standardPrompt,
      },
      layout: {
        number: '02',
        title: copy.layoutTitle,
        prompt: copy.layoutPrompt,
      },
      audio: { number: '04', title: copy.audioTitle, prompt: copy.audioPrompt },
      complete: {
        number: '05',
        title: copy.completionTitle,
        prompt: copy.completionPrompt,
      },
    }[model.stage],
  );
  const choiceCount = $derived(
    model.stage === 'layout' || model.stage === 'standard'
      ? 3
      : model.stage === 'complete'
        ? 0
        : 2,
  );

  function selectedIndex() {
    if (model.stage === 'language')
      return languageChoices.findIndex(
        (item) => item.value === model.configuration.language,
      );
    if (model.stage === 'standard')
      return displayStandards.indexOf(model.configuration.displayStandard);
    if (model.stage === 'layout')
      return layouts.indexOf(model.configuration.layout);
    return model.configuration.audioEnabled ? 0 : 1;
  }

  $effect(() => {
    if (active && phase === 'hold' && model.stage !== 'complete') {
      const index = selectedIndex();
      cursor = index;
      void tick().then(() => {
        if (disposed) return;
        const target = root?.querySelector<HTMLElement>(
          `[data-choice="${index}"]`,
        );
        target?.focus({ preventScroll: true });
      });
    }
  });

  // A preference change must also end any in-flight geometric transition promptly.
  $effect(() => {
    if (reducedMotion && phase !== 'hold') {
      clearTimeout(timer);
      if (pending) model = pending;
      pending = undefined;
      phase = 'hold';
    }
  });
  onDestroy(() => {
    disposed = true;
    clearTimeout(timer);
  });

  function apply(action: SetupAction) {
    if (!active || phase !== 'hold') return;
    const next = updateSetup(model, action);
    if (action.type === 'standard')
      onstandardchange(next.configuration.displayStandard);
    const transition = action.type === 'language' || action.type === 'audio';
    if (reducedMotion || !transition) {
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

  function confirm(index: number) {
    if (model.stage === 'language') {
      const choice = languageChoices[index];
      if (choice) apply({ type: 'language', value: choice.value });
    } else if (model.stage === 'standard') {
      const standard = displayStandards[index];
      if (standard) apply({ type: 'standard', value: standard });
    } else if (model.stage === 'layout') {
      const choice = layouts[index];
      if (choice) apply({ type: 'layout', value: choice });
    } else if (model.stage === 'audio')
      apply({ type: 'audio', value: index === 0 });
  }

  function onKeydown(event: KeyboardEvent) {
    if (
      model.stage === 'complete' ||
      !active ||
      phase !== 'hold' ||
      !root?.contains(document.activeElement)
    )
      return;
    if (event.key === 'Escape' && model.stage !== 'language') {
      event.preventDefault();
      if (!event.repeat) apply({ type: 'back' });
    } else if (
      ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key) &&
      choiceCount
    ) {
      event.preventDefault();
      const direction =
        event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1;
      cursor = (cursor + direction + choiceCount) % choiceCount;
      root?.querySelector<HTMLElement>(`[data-choice="${cursor}"]`)?.focus();
    } else if (event.key === 'Enter' && event.repeat) event.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<DisplayTransition
  {phase}
  duration={phase === 'collapse' ? 220 : 360}
  {reducedMotion}
>
  {#if model.stage === 'complete'}
    {@render children(model.configuration, active && phase === 'hold')}
  {:else}
    <main
      class="setup"
      bind:this={root}
      lang={model.configuration.language}
      data-setup-stage={model.stage}
      inert={!active || phase !== 'hold'}
      aria-busy={phase !== 'hold'}
    >
      <header>
        <span>PROJECT 2186</span><span class="metadata">{copy.system}</span
        ><span class="resolution">640 × 400</span>
      </header>
      <div class="stage-title">
        <span class="ordinal">{stageCopy.number} /</span>
        <h1 tabindex="-1">{stageCopy.title}</h1>
      </div>
      <p class="instruction">{stageCopy.prompt}</p>

      {#if model.stage === 'language'}
        <div class="choices text-choices">
          {#each languageChoices as choice, index (choice.value)}
            <button
              type="button"
              data-choice={index}
              tabindex={cursor === index ? 0 : -1}
              onfocus={() => {
                cursor = index;
              }}
              onclick={() => confirm(index)}
              lang={choice.value}
            >
              <span class="pointer" aria-hidden="true">&gt;</span><span
                class="choice-number"
                aria-hidden="true">0{index + 1}</span
              >{choice.label}
            </button>
          {/each}
        </div>
      {:else if model.stage === 'standard'}
        <div class="choices layout-choices">
          {#each displayStandards as standard, index (standard)}
            <button
              type="button"
              data-choice={index}
              tabindex={cursor === index ? 0 : -1}
              onfocus={() => {
                cursor = index;
              }}
              onclick={() => confirm(index)}
            >
              <span class="layout-name"
                ><span class="pointer" aria-hidden="true">&gt;</span><span
                  class="choice-number">0{index + 1} /</span
                ><span class="standard-name">{standard}</span></span
              >
              <StandardPreview {standard} />
            </button>
          {/each}
        </div>
      {:else if model.stage === 'layout'}
        <div class="choices layout-choices">
          {#each layouts as layout, index (layout)}
            <button
              type="button"
              data-choice={index}
              tabindex={cursor === index ? 0 : -1}
              onfocus={() => {
                cursor = index;
              }}
              onclick={() => confirm(index)}
            >
              <span class="layout-name"
                ><span class="pointer" aria-hidden="true">&gt;</span
                >{layout}</span
              >
              <LayoutSchematic {layout} />
              <span class="layout-description"
                >{[copy.layoutA, copy.layoutB, copy.layoutC][index]}</span
              >
            </button>
          {/each}
        </div>
      {:else if model.stage === 'audio'}
        <div class="choices text-choices">
          {#each [copy.enabled, copy.muted] as label, index (index)}
            <button
              type="button"
              data-choice={index}
              tabindex={cursor === index ? 0 : -1}
              onfocus={() => {
                cursor = index;
              }}
              onclick={() => confirm(index)}
            >
              <span class="pointer" aria-hidden="true">&gt;</span><span
                class="choice-number"
                aria-hidden="true">0{index + 1}</span
              >{label}
            </button>
          {/each}
        </div>
        <p class="audio-note">{copy.audioNote}</p>
      {/if}

      <footer>
        <span>{copy.navigate}</span><span>{copy.confirm}</span>
        {#if model.stage !== 'language'}<button
            class="back"
            type="button"
            onclick={() => apply({ type: 'back' })}>{copy.back}</button
          >{/if}
      </footer>
    </main>
  {/if}
</DisplayTransition>

<style>
  .setup {
    width: 100%;
    height: 100%;
    position: relative;
    padding: 24px 32px;
    border-top: 2px solid var(--display-rule-primary);
    background: var(--display-surface);
    color: var(--display-text-primary);
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 22px;
    padding-bottom: 14px;
    font-size: var(--type-label);
    line-height: var(--leading-label);
    letter-spacing: 0.7px;
  }
  .metadata,
  .resolution {
    color: var(--display-text-muted);
    font-size: var(--type-caption);
    letter-spacing: 0.3px;
  }
  .resolution {
    margin-left: auto;
    white-space: nowrap;
  }
  h1,
  p {
    margin: 0;
  }
  .stage-title {
    display: flex;
    gap: 14px;
    margin-top: 28px;
    align-items: baseline;
  }
  .ordinal {
    color: var(--display-text-muted);
    font-size: var(--type-label);
  }
  h1 {
    font-size: var(--type-state);
    line-height: var(--leading-state);
    letter-spacing: 0.6px;
    font-weight: 600;
    outline: none;
  }
  .instruction {
    margin: 9px 0 0 38px;
    font-size: var(--type-label);
    line-height: var(--leading-label);
    color: var(--display-text-secondary);
  }
  .choices {
    margin-top: 30px;
  }
  button {
    appearance: none;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: transparent;
    color: var(--display-text-secondary);
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  button:focus {
    outline: none;
    color: var(--display-text-primary);
  }
  button:focus .pointer {
    visibility: visible;
  }
  button:focus-visible {
    text-decoration: underline;
    text-underline-offset: 5px;
    text-decoration-color: var(--display-text-secondary);
  }
  .pointer {
    visibility: hidden;
    display: inline-block;
    width: 18px;
    color: var(--display-accent);
  }
  .text-choices {
    display: grid;
    gap: 14px;
    width: 280px;
    margin-left: 20px;
  }
  .text-choices button {
    font-size: var(--type-body);
    line-height: 24px;
  }
  .choice-number {
    display: inline-block;
    margin-right: 16px;
    font-size: var(--type-caption);
    color: var(--display-text-muted);
  }
  .layout-choices {
    display: flex;
    gap: 32px;
    margin-left: 20px;
  }
  .layout-choices button {
    width: 148px;
    font-size: var(--type-body);
    line-height: var(--leading-body);
  }
  .layout-name {
    display: block;
    margin-bottom: 10px;
  }
  .standard-name {
    text-transform: uppercase;
    font-size: var(--type-label);
    letter-spacing: 0.4px;
  }
  .layout-name .choice-number {
    margin-right: 6px;
  }
  .layout-description {
    display: block;
    margin-top: 10px;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
  }
  .audio-note {
    margin: 25px 0 0 38px;
    font-size: var(--type-caption);
    color: var(--display-text-muted);
  }
  footer {
    position: absolute;
    bottom: 24px;
    left: 32px;
    right: 32px;
    display: flex;
    gap: 24px;
    align-items: center;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    color: var(--display-text-muted);
  }
  .back {
    margin-left: auto;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    color: var(--display-state-dormant);
  }
  .back:focus-visible {
    outline: 1px solid var(--display-text-muted);
    outline-offset: 4px;
  }
</style>
