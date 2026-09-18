<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { CharacterId } from '../../core/character/id';
  import { portraitSource, type PortraitState } from './states';

  let {
    character,
    state = 'neutral',
    decorative = false,
    compact = false,
    children,
  }: {
    character: CharacterId | undefined;
    state?: PortraitState;
    decorative?: boolean;
    compact?: boolean;
    children: Snippet;
  } = $props();
  const source = $derived(portraitSource(character, state));
</script>

{#if source}
  <img
    src={source}
    alt={decorative ? '' : character?.toUpperCase()}
    width={compact ? 72 : 144}
    height={compact ? 90 : 180}
    class:compact
    draggable="false"
  />
{:else}
  {@render children()}
{/if}

<style>
  img {
    display: block;
    width: 144px;
    height: 180px;
    image-rendering: pixelated;
  }
  img.compact {
    width: 72px;
    height: 90px;
  }
</style>
