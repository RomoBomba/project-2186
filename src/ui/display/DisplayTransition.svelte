<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    phase,
    duration,
    reducedMotion = false,
    children,
  }: {
    phase: 'off' | 'power' | 'expand' | 'hold' | 'collapse';
    duration: number;
    reducedMotion?: boolean;
    children: Snippet;
  } = $props();
</script>

<div
  class="transition"
  data-phase={phase}
  class:reduced={reducedMotion}
  style:--duration={`${duration}ms`}
>
  <div
    class="surface"
    inert={phase === 'off' || phase === 'power' || phase === 'collapse'}
  >
    {@render children()}
  </div>
  <div class="activation-line" aria-hidden="true"></div>
</div>

<style>
  .transition {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--display-background);
  }
  .surface {
    width: 100%;
    height: 100%;
    background: var(--display-surface);
  }
  [data-phase='off'] .surface,
  [data-phase='power'] .surface {
    visibility: hidden;
  }
  .activation-line {
    display: none;
    position: absolute;
    top: calc(50% - 0.5px);
    left: 0;
    width: 100%;
    height: 1px;
    background: var(--display-text-muted);
  }
  [data-phase='power'] .activation-line {
    display: block;
    animation: establish var(--duration) ease-out both;
  }
  [data-phase='expand'] .surface {
    animation: expand var(--duration) cubic-bezier(0.2, 0.6, 0.3, 1) both;
  }
  [data-phase='collapse'] .surface {
    animation: expand var(--duration) ease-in reverse both;
  }
  [data-phase='collapse'] .activation-line {
    display: block;
    animation: settle var(--duration) ease-in both;
  }

  @keyframes establish {
    from {
      transform: scaleX(0.025);
    }
    to {
      transform: scaleX(1);
    }
  }
  @keyframes expand {
    from {
      clip-path: inset(49.875% 0);
    }
    to {
      clip-path: inset(0);
    }
  }
  @keyframes settle {
    0%,
    75% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .reduced .surface {
    animation: none;
    clip-path: none;
  }
  .reduced .activation-line {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .surface {
      animation: none !important;
      clip-path: none;
    }
    .activation-line {
      display: none !important;
    }
  }
</style>
