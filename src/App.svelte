<script lang="ts">
  import { onDestroy, onMount, setContext } from 'svelte';
  import type { DisplayStandard } from './ui/display/standards';
  import DisplayShell from './ui/display/DisplayShell.svelte';
  import BootExperience from './ui/boot/BootExperience.svelte';
  import SystemExperience from './ui/system/SystemExperience.svelte';
  import './ui/global.css';
  import { Persistence, persistenceContext } from './application/persistence';
  import { IndexedDBStorage } from './infrastructure/storage/indexed-db';
  import type { SavedConfiguration } from './core/storage/model';
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
      {#if loaded}
        <SystemExperience
          {persistence}
          initial={restored}
          {active}
          {reducedMotion}
          onstandardchange={(value) => (standard = value)}
        />
      {/if}
    {/snippet}
  </BootExperience>
</DisplayShell>
