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
    compact = false,
    children,
  }: {
    character: CharacterId | undefined;
    decorative?: boolean;
    compact?: boolean;
    children: Snippet;
  } = $props();
  const source = $derived(character ? portraits[character] : undefined);
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
