<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { CharacterId } from '../../core/character/id';
  import { portraitSource } from './states';
  import { preloadPortrait } from './preload';
  import { motionProfiles } from './profiles';
  import {
    createPortraitMotion,
    stillFrame,
    type PortraitMode,
  } from './motion';
  let {
    character,
    compact = false,
    reducedMotion,
    active,
    mode,
    chunk,
  }: {
    character: CharacterId;
    compact?: boolean;
    reducedMotion: boolean;
    active: boolean;
    mode: PortraitMode;
    chunk: number;
  } = $props();
  let frame = $state(stillFrame());
  let history = $state<string[]>([]);
  let loaded = $state(false);
  let visible = $state(true);
  let mediaReduced = $state(false);
  let controller = $state<ReturnType<typeof createPortraitMotion>>();
  onMount(() => {
    let alive = true;
    const motion = createPortraitMotion((value) => {
      untrack(() => {
        if (import.meta.env.DEV && frame.current !== value.current)
          history = [...history, `${value.current}@${Date.now()}`].slice(-16);
        frame = value;
      });
    });
    controller = motion;
    if (motionProfiles[character])
      void preloadPortrait(character).then((ready) => {
        if (alive) loaded = ready;
      });
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => {
      visible = !document.hidden;
      mediaReduced = media.matches;
    };
    refresh();
    document.addEventListener('visibilitychange', refresh);
    media.addEventListener('change', refresh);
    return () => {
      alive = false;
      motion.destroy();
      document.removeEventListener('visibilitychange', refresh);
      media.removeEventListener('change', refresh);
    };
  });
  $effect(() => {
    controller?.configure({
      profile: motionProfiles[character],
      enabled: loaded && !!motionProfiles[character],
      reduced: reducedMotion || mediaReduced,
      visible: visible && active,
    });
  });
  $effect(() => {
    void chunk;
    controller?.observe(mode, true);
  });
</script>

<div
  class="viewport"
  class:compact
  data-portrait-state={frame.next ?? frame.current}
  data-portrait-history={import.meta.env.DEV ? history.join(',') : undefined}
>
  <div
    class="layers"
    style:transform="translate({frame.x}px, {frame.y}px) rotate({frame.rotation}deg)"
    style:transition={reducedMotion || mediaReduced
      ? 'none'
      : `transform ${motionProfiles[character]?.settleDuration ?? 2200}ms ease-in-out`}
  >
    <img
      src={portraitSource(character, frame.current)}
      width={compact ? 72 : 144}
      height={compact ? 90 : 180}
      alt={character.toUpperCase()}
      draggable="false"
    />
    {#if frame.next}
      <img
        class="next"
        width={compact ? 72 : 144}
        height={compact ? 90 : 180}
        src={portraitSource(character, frame.next)}
        alt=""
        draggable="false"
        style:opacity={frame.revealed ? 1 : 0}
        style:transition="opacity {frame.fade}ms linear"
      />
    {/if}
  </div>
</div>

<style>
  .viewport {
    width: 144px;
    height: 180px;
    overflow: hidden;
  }
  .viewport.compact {
    width: 72px;
    height: 90px;
  }
  .layers {
    position: relative;
    width: 100%;
    height: 100%;
  }
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: fill;
    object-position: center;
    image-rendering: pixelated;
  }
  .next {
    opacity: 0;
  }
</style>
