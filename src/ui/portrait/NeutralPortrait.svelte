<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { CharacterId } from '../../core/character/id';
  import aletheiaNeutral from '../../assets/portraits/aletheia/neutral.png';
  import auraNeutral from '../../assets/portraits/aura/neutral.png';
  import themisNeutral from '../../assets/portraits/themis/neutral.png';

  const portraits: Partial<Record<CharacterId, string>> = {
    aletheia: aletheiaNeutral,
    aura: auraNeutral,
    themis: themisNeutral,
  };
  let {
    character,
    decorative = false,
    children,
  }: {
    character: CharacterId | undefined;
    decorative?: boolean;
    children: Snippet;
  } = $props();
  const source = $derived(character ? portraits[character] : undefined);
</script>

{#if source}
  <img
    src={source}
    alt={decorative ? '' : character?.toUpperCase()}
    width="144"
    height="180"
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
</style>
