<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { displayScale, logicalDisplay } from './scale';

  let { children }: { children: Snippet } = $props();
  let viewport: HTMLDivElement;
  let scale = $state(0);

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        scale = displayScale(entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  });
</script>

<div class="display-surround">
  <div class="display-viewport" bind:this={viewport}>
    <div
      class="logical-display"
      style:width={`${logicalDisplay.width}px`}
      style:height={`${logicalDisplay.height}px`}
      style:--display-scale={scale}
    >
      {@render children()}
    </div>
  </div>
</div>

<style>
  .display-surround {
    height: 100vh;
    height: 100dvh;
    padding: clamp(8px, 2vmin, 24px);
  }

  .display-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .logical-display {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(var(--display-scale));
    background: var(--background-deep);
    transform-origin: center;
  }
</style>
