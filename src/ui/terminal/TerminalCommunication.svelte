<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { conversationEngine } from '../../application/intelligence';
  import type { CharacterId } from '../../core/character/id';
  import type { Locale } from '../../core/language/locale';
  import { systemMessages } from '../../locales/system';
  import { terminalMessages } from '../../locales/terminal';
  import {
    createCommunicationSession,
    maximumCommandLength,
    type CommunicationSession,
  } from './session';
  let {
    character,
    locale,
    active,
    reducedMotion,
  }: {
    character: CharacterId;
    locale: Locale;
    active: boolean;
    reducedMotion: boolean;
  } = $props();
  let session = $state<CommunicationSession>({ state: 'ready', records: [] });
  let command = $state('');
  let announcement = $state('');
  let input = $state<HTMLInputElement>();
  let viewport = $state<HTMLDivElement>();
  let followLatest = true;
  let controller: ReturnType<typeof createCommunicationSession> | undefined;
  const labels = $derived(systemMessages[locale]);
  const copy = $derived(terminalMessages[locale]);
  const busy = $derived(session.state !== 'ready');

  $effect(() => {
    session = { state: 'ready', records: [] };
    command = '';
    announcement = '';
    const current = createCommunicationSession(
      character,
      locale,
      (next) => {
        session = next;
      },
      (record) => {
        announcement = `${record.speaker.toUpperCase()} / ${record.text}`;
      },
      conversationEngine,
      untrack(() => reducedMotion),
    );
    controller = current;
    return () => current.cancel();
  });
  $effect(() => {
    if (reducedMotion) controller?.reduceMotion();
  });
  $effect(() => {
    if (active && input) input.focus({ preventScroll: true });
  });
  $effect(() => {
    const records = session.records;
    const currentViewport = viewport;
    if (!records.length || !currentViewport) return;
    void tick().then(() => {
      if (followLatest && currentViewport.isConnected)
        currentViewport.scrollTop = currentViewport.scrollHeight;
    });
  });
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!active) return;
    if (controller?.submit(command)) {
      command = '';
      announcement = '';
      followLatest = true;
    }
  }
</script>

<section
  class="signal"
  aria-labelledby="communication-label"
  data-channel-state={session.state}
>
  <h2 id="communication-label">
    <span>02 /</span>{labels.communicationChannel}
  </h2>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable transcript must accept keyboard scrolling without becoming an interactive widget.) -->
  <div
    class="transcript"
    role="region"
    aria-label={copy.history}
    tabindex="0"
    bind:this={viewport}
    onscroll={() => {
      if (viewport)
        followLatest =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
          16;
    }}
  >
    {#if session.records.length === 0}
      <div class="opening">
        <p>{copy.opening}</p>
        <p>{copy.waiting}</p>
      </div>
    {:else}
      <ol>
        {#each session.records as record (record.id)}
          <li>
            <span class="record-label"
              >{record.speaker === 'user'
                ? copy.you
                : record.speaker.toUpperCase()} / {String(record.id).padStart(
                3,
                '0',
              )}</span
            >
            <p dir="auto">{record.text}</p>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
  <p class="channel-state">
    <span class="marker" aria-hidden="true"></span>{copy[session.state]}<span
      class="instance">{character.toUpperCase()}</span
    >
  </p>
</section>
<form class="command-channel" onsubmit={submit}>
  <div class="command-heading">
    <h2><span>03 /</span>{labels.commandChannel}</h2>
  </div>
  <div class="command-line">
    <span class="prompt" aria-hidden="true">&gt;</span>
    <input
      bind:this={input}
      bind:value={command}
      aria-label={copy.command}
      aria-describedby="command-hint"
      aria-disabled={busy || !active}
      readonly={busy || !active}
      maxlength={maximumCommandLength}
      autocomplete="off"
      spellcheck={false}
      enterkeyhint="send"
      onkeydown={(event) => {
        if (event.key === 'Enter' && (event.isComposing || event.repeat))
          event.preventDefault();
      }}
    />
  </div>
  <p id="command-hint" class="hint">{copy.hint}</p>
</form>
<div class="announcement" role="status" aria-live="polite" aria-atomic="true">
  {announcement}
</div>

<style>
  .signal {
    grid-column: 2;
    grid-row: 2;
    display: grid;
    grid-template-rows: 24px minmax(0, 1fr) 18px;
    min-width: 0;
    min-height: 0;
  }
  h2,
  p {
    margin: 0;
    font-weight: 400;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--type-label);
    line-height: var(--leading-label);
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--display-text-secondary);
  }
  h2 > span {
    color: var(--display-text-muted);
    font-weight: 400;
    letter-spacing: 0;
  }
  .transcript {
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
    padding: 4px 8px 8px 14px;
    outline: none;
  }
  .transcript::-webkit-scrollbar {
    display: none;
  }
  .transcript:focus-visible {
    box-shadow: inset 1px 0 var(--display-rule-primary);
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li + li {
    margin-top: 12px;
  }
  .record-label {
    display: block;
    margin-bottom: 3px;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    letter-spacing: 0.5px;
    color: var(--display-text-muted);
  }
  li p {
    font-size: var(--type-body);
    line-height: 17px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .opening {
    padding: 10px 0 0 20px;
  }
  .opening p:first-child {
    font-size: var(--type-state);
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .opening p + p {
    margin-top: 7px;
    color: var(--display-text-secondary);
    font-size: var(--type-label);
  }
  .channel-state {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    color: var(--display-text-muted);
  }
  .marker {
    width: 16px;
    border-top: 1px solid var(--display-rule-secondary);
  }
  [data-channel-state='transmitting'] .marker {
    border-color: var(--display-accent);
  }
  .instance {
    margin-left: auto;
    color: var(--display-text-secondary);
  }
  .command-channel {
    grid-column: 2;
    grid-row: 3;
    min-width: 0;
    padding-top: 7px;
    border-top: 1px solid var(--display-rule-secondary);
  }
  .command-channel:focus-within {
    border-color: var(--display-rule-primary);
  }
  .command-line {
    display: flex;
    gap: 8px;
    align-items: center;
    height: 24px;
  }
  .prompt {
    width: 16px;
    color: var(--display-text-secondary);
  }
  .command-channel:focus-within .prompt {
    color: var(--display-accent);
  }
  input {
    width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    font: inherit;
    font-size: var(--type-body);
    color: var(--display-text-primary);
    caret-color: var(--display-text-primary);
    outline: none;
  }
  input:focus-visible {
    box-shadow: 0 1px var(--display-rule-secondary);
  }
  .hint {
    font-size: 8px;
    line-height: 10px;
    letter-spacing: 0.25px;
    color: var(--display-text-muted);
  }
  .announcement {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
