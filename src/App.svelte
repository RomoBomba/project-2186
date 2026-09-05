<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { DisplayStandard } from './ui/display/standards';
  import DisplayShell from './ui/display/DisplayShell.svelte';
  import BootExperience from './ui/boot/BootExperience.svelte';
  import SetupExperience from './ui/setup/SetupExperience.svelte';
  import './ui/global.css';
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
      <SetupExperience
        {reducedMotion}
        {active}
        onstandardchange={(value) => {
          standard = value;
        }}
      />
    {/snippet}
  </BootExperience>
</DisplayShell>
