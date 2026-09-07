<script lang="ts">
  import { tick } from 'svelte';
  import type { SavedConfiguration } from '../../core/storage/model';
  import { navigationMessages } from '../../locales/navigation';
  import { systemMessages } from '../../locales/system';
  import { systemActions, menuKey, type SystemAction } from './menu';
  let {
    configuration,
    menu = false,
    active = true,
    onaction,
  }: {
    configuration: SavedConfiguration;
    menu?: boolean;
    active?: boolean;
    onaction: (action: SystemAction) => void;
  } = $props();
  let index = $state(0);
  let root: HTMLElement;
  const copy = $derived(navigationMessages[configuration.language]);
  const labels = $derived(systemMessages[configuration.language]);
  const actions = systemActions;
  $effect(() => {
    const selectedIndex = index; // Read synchronously so Svelte tracks selection.
    if (active)
      void tick().then(() => {
        if (active && index === selectedIndex && root?.isConnected)
          root
            .querySelector<HTMLElement>(`[data-option="${selectedIndex}"]`)
            ?.focus();
      });
  });
  function activate(selectedIndex: number) {
    if (!active) return;
    index = selectedIndex;
    onaction(actions[selectedIndex]!);
  }
  function keydown(event: KeyboardEvent) {
    if (!active || !root?.contains(document.activeElement)) return;
    const next = menuKey(index, event.key, menu);
    if (!next.handled) return;
    event.preventDefault();
    if (event.repeat && next.action) return;
    if (next.action) onaction(next.action);
    else {
      index = next.index;
      root.querySelector<HTMLElement>(`[data-option="${index}"]`)?.focus();
    }
  }
</script>

<svelte:window onkeydown={keydown} />
<main
  role={menu ? 'dialog' : undefined}
  aria-modal={menu ? true : undefined}
  aria-label={menu ? 'SYSTEM / MENU' : undefined}
  class="gate"
  bind:this={root}
  lang={configuration.language}
  inert={!active}
  data-system-mode={menu ? 'menu' : 'returning'}
>
  <header>
    PROJECT 2186 <p>{labels.terminal}</p>
  </header>
  <h1>{menu ? 'SYSTEM / MENU' : copy.detected}</h1>
  <p class="metadata">
    {configuration.character.toUpperCase()} │ {labels.display} / {configuration.layout}
    │ {configuration.displayStandard.toUpperCase()}
  </p>
  <nav aria-label={menu ? 'SYSTEM / MENU' : copy.detected}>
    {#each actions as action, i (action)}
      <button
        type="button"
        data-option={i}
        class:selected={index === i}
        tabindex={i === index ? 0 : -1}
        onfocus={() => (index = i)}
        onclick={() => activate(i)}
        ><span class:chosen={index === i} aria-hidden="true">&gt;</span> 0{i +
          1} / {action === 'return'
          ? menu
            ? copy.return
            : copy.continue
          : copy[action]}</button
      >
    {/each}
  </nav>
  <footer>
    {copy.hint}{#if menu}<span>{copy.cancel}</span>{/if}
  </footer>
</main>

<style>
  .gate {
    position: absolute;
    inset: 0;
    background: var(--display-surface);
    color: var(--display-text-primary);
    padding: 24px 32px;
    border-top: 2px solid var(--display-rule-primary);
    z-index: 5;
  }
  header {
    font-size: 14px;
    letter-spacing: 1px;
  }
  header p {
    font-size: 9px;
    letter-spacing: 0.7px;
    color: var(--display-text-secondary);
    margin: 6px 0 0;
  }
  h1 {
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1px;
    margin: 28px 0 12px;
    color: var(--display-text-secondary);
  }
  .metadata {
    font-size: 10px;
    margin: 0 0 25px;
    color: var(--display-text-muted);
  }
  nav {
    border-left: 1px solid var(--display-rule-secondary);
    padding-left: 12px;
    display: grid;
    gap: 8px;
  }
  button {
    font: inherit;
    font-size: 12px;
    line-height: 24px;
    background: transparent;
    border: 0;
    border-radius: 0;
    color: var(--display-text-secondary);
    text-decoration: none;
    text-align: left;
    padding: 0;
    cursor: pointer;
    outline: none;
  }
  button span {
    visibility: hidden;
    color: var(--display-accent);
  }
  button span.chosen {
    visibility: visible;
  }
  button.selected {
    color: var(--display-text-primary);
  }
  footer {
    position: absolute;
    bottom: 24px;
    left: 32px;
    right: 32px;
    font-size: 9px;
    color: var(--display-text-muted);
    display: flex;
    justify-content: space-between;
    white-space: pre;
  }
</style>
