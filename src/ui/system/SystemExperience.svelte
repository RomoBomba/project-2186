<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { Persistence } from '../../application/persistence';
  import type {
    SavedConfiguration,
    SystemConfiguration,
  } from '../../core/storage/model';
  import type { CharacterId } from '../../core/character/id';
  import type { DisplayStandard } from '../display/standards';
  import DisplayTransition from '../display/DisplayTransition.svelte';
  import ReferenceComposition from '../display/ReferenceComposition.svelte';
  import SetupExperience from '../setup/SetupExperience.svelte';
  import { createSetup } from '../setup/model';
  import IntelligenceExperience from '../character-select/IntelligenceExperience.svelte';
  import SystemGate from './SystemGate.svelte';
  import {
    selectorReturn,
    type SelectorOrigin,
    type SystemAction,
  } from './menu';
  let {
    persistence,
    initial,
    active,
    reducedMotion,
    onstandardchange,
  }: {
    persistence: Persistence;
    initial?: SavedConfiguration | undefined;
    active: boolean;
    reducedMotion: boolean;
    onstandardchange: (value: DisplayStandard) => void;
  } = $props();
  import { routeForAction, routeAfterConfiguration, type Screen } from './menu';
  let screen = $state<Screen>(untrack(() => (initial ? 'gate' : 'setup')));
  let configuration = $state<SystemConfiguration>(
    untrack(() => (initial ? { ...initial } : createSetup().configuration)),
  );
  let character = $state<CharacterId>(
    untrack(() => initial?.character ?? 'aletheia'),
  );
  let systemOpen = $state(false);
  let terminalMounted = $state(false);
  let sessionKey = $state(0);
  let selectorOrigin = $state<SelectorOrigin>('setup');
  let setupStage = $state<'language' | 'audio'>('language');
  let returnTo = $state<'gate' | 'terminal'>('gate');
  let phase = $state<'hold' | 'collapse' | 'expand'>('hold');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: (() => void) | undefined;
  const saved = $derived({ ...configuration, character });
  function persist() {
    persistence.saveConfiguration({ ...configuration, character });
  }
  function transition(change: () => void) {
    if (phase !== 'hold') return;
    if (reducedMotion) {
      change();
      return;
    }
    pending = change;
    phase = 'collapse';
    timer = setTimeout(() => {
      pending?.();
      pending = undefined;
      phase = 'expand';
      timer = setTimeout(() => (phase = 'hold'), 360);
    }, 220);
  }
  $effect(() => {
    if (reducedMotion && phase !== 'hold') {
      clearTimeout(timer);
      pending?.();
      pending = undefined;
      phase = 'hold';
    }
  });
  onDestroy(() => clearTimeout(timer));
  function action(value: SystemAction) {
    if (!active || phase !== 'hold' || !['gate', 'terminal'].includes(screen))
      return;
    const destination = routeForAction(value);
    if (value === 'return') {
      terminalMounted = true;
      screen = destination;
      return;
    }
    if (value === 'configuration') {
      setupStage = 'language';
      returnTo = terminalMounted ? 'terminal' : 'gate';
      transition(() => (screen = destination));
      return;
    }
    if (value === 'intelligence') {
      selectorOrigin = screen === 'terminal' ? 'terminal' : 'gate';
      transition(() => (screen = 'selection'));
      return;
    }
    setupStage = 'language';
    transition(() => {
      terminalMounted = false;
      sessionKey++;
      screen = destination;
    });
  }
  function configured(value: SystemConfiguration) {
    if (screen !== 'setup' && screen !== 'edit') return;
    const destination = routeAfterConfiguration(screen, returnTo);
    configuration = { ...value };
    onstandardchange(value.displayStandard);
    if (screen === 'edit') {
      persist();
    }
    if (screen === 'setup') selectorOrigin = 'setup';
    screen = destination;
  }
  function cancelSelection() {
    if (screen !== 'selection') return;
    transition(() => {
      const target = selectorReturn(selectorOrigin);
      if (selectorOrigin === 'setup') setupStage = target.setupStage;
      screen = target.screen;
    });
  }
  function selected(value: CharacterId) {
    if (screen !== 'selection') return;
    if (terminalMounted && value !== character) sessionKey++;
    systemOpen = false;
    character = value;
    persist();
    terminalMounted = true;
    screen = 'terminal';
    if (!reducedMotion) {
      phase = 'expand';
      timer = setTimeout(() => (phase = 'hold'), 360);
    }
  }
</script>

<DisplayTransition
  {phase}
  duration={phase === 'collapse' ? 220 : 360}
  {reducedMotion}
>
  <div class="system-experience">
    {#if terminalMounted}
      <div class:hidden={screen !== 'terminal'} inert={screen !== 'terminal'}>
        {#key sessionKey}
          <ReferenceComposition
            locale={configuration.language}
            layout={configuration.layout}
            {character}
            {reducedMotion}
            active={active && screen === 'terminal' && phase === 'hold'}
            onlayoutchange={(layout) => {
              configuration.layout = layout;
              persist();
            }}
            bind:systemOpen
            onsystemaction={action}
            systemConfiguration={saved}
          />
        {/key}
      </div>
    {/if}
    {#if screen === 'gate'}
      <SystemGate
        configuration={saved}
        active={active && phase === 'hold'}
        onaction={action}
      />
    {:else if screen === 'setup' || screen === 'edit'}
      <SetupExperience
        initial={configuration}
        initialStage={setupStage}
        {reducedMotion}
        active={active && phase === 'hold'}
        {onstandardchange}
        oncomplete={configured}
        oncancel={initial || terminalMounted
          ? () => {
              onstandardchange(configuration.displayStandard);
              screen = terminalMounted ? 'terminal' : 'gate';
            }
          : undefined}
      />
    {:else if screen === 'selection'}
      <IntelligenceExperience
        {configuration}
        external
        onlayoutchange={() => {}}
        onselected={selected}
        oncancel={cancelSelection}
        {reducedMotion}
        active={active && phase === 'hold'}
      />
    {/if}
  </div>
</DisplayTransition>

<style>
  .system-experience {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .system-experience > div {
    width: 100%;
    height: 100%;
  }
  .hidden {
    display: none;
  }
</style>
