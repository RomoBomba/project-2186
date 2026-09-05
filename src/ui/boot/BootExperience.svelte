<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { defaultLocale } from '../../core/language/locale';
  import DisplayTransition from '../display/DisplayTransition.svelte';
  import BootScreen from './BootScreen.svelte';
  import { firstBootStep, startBoot, type BootStep } from './sequence';

  let { children }: { children: Snippet<[boolean, boolean]> } = $props();
  let step = $state<BootStep>(firstBootStep);
  let reducedMotion = $state(false);
  let skip = () => {};
  const transitionPhase = $derived(
    step.state === 'dormant'
      ? 'off'
      : step.state === 'power'
        ? 'power'
        : step.state === 'display' || step.state === 'reveal'
          ? 'expand'
          : step.state === 'collapse'
            ? 'collapse'
            : 'hold',
  );

  onMount(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Dev-only review override; never overrides a user's request for less motion.
    const forceReduced =
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('boot-motion') ===
        'reduce';
    reducedMotion = forceReduced || preference.matches;
    const playback = startBoot((next) => {
      step = next;
    }, reducedMotion);
    skip = playback.skip;
    const onPreferenceChange = () => {
      reducedMotion = forceReduced || preference.matches;
      if (reducedMotion) playback.reduceMotion();
    };
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      playback.cancel();
      preference.removeEventListener('change', onPreferenceChange);
    };
  });

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && step.state !== 'ready') {
      event.preventDefault();
      skip();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="boot-experience" data-boot-state={step.state}>
  <DisplayTransition
    phase={transitionPhase}
    duration={step.duration}
    {reducedMotion}
  >
    {#if step.state === 'ready' || step.state === 'reveal'}
      {@render children(reducedMotion, step.state === 'ready')}
    {:else}
      <BootScreen {step} locale={defaultLocale} />
    {/if}
  </DisplayTransition>
</div>

<style>
  .boot-experience {
    width: 100%;
    height: 100%;
  }
</style>
