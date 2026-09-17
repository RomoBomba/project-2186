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
  import { WebAudioEngine } from './infrastructure/audio/web-audio';
  import { audioContextKey } from './infrastructure/audio/model';
  const audio = new WebAudioEngine();
  setContext(audioContextKey, audio);
  const persistence = new Persistence(new IndexedDBStorage());
  setContext(persistenceContext, persistence);
  let restored = $state<SavedConfiguration>();
  let loaded = $state(false);
  onMount(() => {
    let disposed = false;
    const unlock = (event: Event) => {
      if (event.isTrusted) audio.unlock();
    };
    const silence = () => {
      if (document.hidden) audio.cancel();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', silence);
    const pagehide = () => audio.cancel();
    window.addEventListener('pagehide', pagehide);
    if (import.meta.env.DEV)
      window.project2186Audio = {
        inspect: () => audio.inspect(),
        preview: (cue) => audio.play(cue),
      };
    if (import.meta.env.DEV)
      window.project2186Memory = { inspect: () => persistence.inspectStored() };
    void persistence.initialize().then(() => {
      if (disposed) return;
      restored = persistence.configuration;
      if (restored) standard = restored.displayStandard;
      audio.setEnabled(restored?.audioEnabled ?? false);
      loaded = true;
    });
    return () => {
      disposed = true;
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', silence);
      window.removeEventListener('pagehide', pagehide);
      audio.dispose();
      if (import.meta.env.DEV) delete window.project2186Audio;
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
