<script lang="ts">
  import { onMount } from 'svelte';
  import MovingPortrait from './MovingPortrait.svelte';
  import type { PortraitMode } from './motion';
  let { character = 'aletheia' }: { character?: 'aletheia' | 'aura' } =
    $props();
  let mode = $state<PortraitMode>('ready');
  let chunk = $state(0);
  let reduced = $state(false);
  let active = $state(true);
  onMount(() => {
    const timer = setInterval(() => {
      if (mode === 'transmitting') chunk++;
    }, 350);
    return () => clearInterval(timer);
  });
</script>

<h2>DEV / настоящий контроллер</h2>
<MovingPortrait {character} reducedMotion={reduced} {active} {mode} {chunk} />
{#each ['ready', 'forming', 'transmitting'] as value (value)}
  <button
    onclick={() => {
      mode = value as PortraitMode;
    }}>{value}</button
  >
{/each}
<label><input type="checkbox" bind:checked={reduced} />Reduced motion</label>
<label><input type="checkbox" bind:checked={active} />Active</label>
