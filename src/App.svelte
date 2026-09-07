<script lang="ts">
  import { onDestroy, onMount, setContext } from 'svelte';
  import type { DisplayStandard } from './ui/display/standards';
  import DisplayShell from './ui/display/DisplayShell.svelte';
  import BootExperience from './ui/boot/BootExperience.svelte';
  import SetupExperience from './ui/setup/SetupExperience.svelte';
  import IntelligenceExperience from './ui/character-select/IntelligenceExperience.svelte';
  import './ui/global.css';
  import { Persistence, persistenceContext } from './application/persistence';
  import { IndexedDBStorage } from './infrastructure/storage/indexed-db';
  import type { SavedConfiguration } from './core/storage/model';
  import ReferenceComposition from './ui/display/ReferenceComposition.svelte';
  const persistence = new Persistence(new IndexedDBStorage());
  setContext(persistenceContext, persistence);
  let restored = $state<SavedConfiguration>();
  let loaded = $state(false);
  onMount(() => {
    let disposed = false;
    if (import.meta.env.DEV)
      window.project2186Memory = { inspect: () => persistence.inspectStored() };
    void persistence.initialize().then(() => {
      if (disposed) return;
      restored = persistence.configuration;
      if (restored) standard = restored.displayStandard;
      loaded = true;
    });
    return () => {
      disposed = true;
      if (import.meta.env.DEV) delete window.project2186Memory;
    };
  });
  let standard = $state<DisplayStandard>('civic');
  $effect(() => {
    document.documentElement.dataset.displayStandard = standard;
  });
  onDestroy(() => {
    delete document.documentElement.dataset.displayStandard;
  });
</script>

<DisplayShell>
  <BootExperience>
    {#snippet children(reducedMotion, active)}
      {#if loaded && restored}
        <ReferenceComposition
          locale={restored.language}
          layout={restored.layout}
          character={restored.character}
          {active}
          {reducedMotion}
          onlayoutchange={(layout) => {
            if (restored) {
              restored.layout = layout;
              persistence.saveConfiguration({ ...restored });
            }
          }}
        />
      {:else if loaded}
        <SetupExperience
          {reducedMotion}
          {active}
          onstandardchange={(value) => {
            standard = value;
          }}
        >
          {#snippet children(configuration, setupActive, onlayoutchange)}
            <IntelligenceExperience
              {configuration}
              onlayoutchange={(layout) => {
                onlayoutchange(layout);
                if (persistence.configuration)
                  persistence.saveConfiguration({
                    ...persistence.configuration,
                    layout,
                  });
              }}
              onselected={(character) =>
                persistence.saveConfiguration({ ...configuration, character })}
              {reducedMotion}
              active={setupActive}
            />
          {/snippet}
        </SetupExperience>
      {/if}
    {/snippet}
  </BootExperience>
</DisplayShell>
