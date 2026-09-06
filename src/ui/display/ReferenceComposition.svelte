<script lang="ts">
  import { defaultLocale, type Locale } from '../../core/language/locale';
  import { systemMessages } from '../../locales/system';

  import type { CharacterId } from '../../core/character/id';
  import { intelligenceMessages } from '../../locales/intelligence';
  let {
    locale = defaultLocale,
    character,
  }: { locale?: Locale; character?: CharacterId } = $props();
  const labels = $derived(systemMessages[locale]);
  // Deliberately bilingual typography specimen; no language-selection behaviour.
  const specimen = systemMessages.ru;
</script>

<main class="composition" lang={locale} aria-labelledby="project-title">
  <header class="system-header">
    <div>
      <h1 id="project-title" tabindex="-1">PROJECT <span>2186</span></h1>
      <p class="caption terminal-label">{labels.terminal}</p>
    </div>
    <div class="display-designation caption">
      <span>{labels.display} / A</span>
      <span class="resolution">640 × 400</span>
    </div>
  </header>

  <section class="visual-channel" aria-labelledby="visual-label">
    <h2 id="visual-label" class="label">
      <span class="channel-index">01 /</span>{labels.visualChannel}
    </h2>
    <div class="visual-field">
      <div class="empty-register" aria-hidden="true"></div>
      <p class="caption absent-image">{labels.noImage}</p>
    </div>
    <p class="caption channel-footnote" lang="ru">{specimen.visualChannel}</p>
  </section>

  <section class="communication-channel" aria-labelledby="communication-label">
    <h2 id="communication-label" class="label">
      <span class="channel-index">02 /</span>{labels.communicationChannel}
    </h2>
    <div class="communication-field" lang="ru">
      <p class="ready">
        <span class="status-mark" aria-hidden="true"></span>{specimen.ready}
      </p>
      <p class="waiting">{specimen.waiting}</p>
    </div>
    <div class="system-channel">
      <span class="data-marker" aria-hidden="true"></span>
      <p class="caption">
        {character
          ? `${intelligenceMessages[locale].instance} / ${character.toUpperCase()}`
          : labels.systemChannel}
      </p>
    </div>
  </section>

  <section class="command-channel" aria-labelledby="command-label">
    <h2 id="command-label" class="label">
      <span class="channel-index">03 /</span>{labels.commandChannel}
    </h2>
    <div class="command-position">
      <span class="prompt" aria-hidden="true">&gt;</span>
      <span class="data-marker" aria-hidden="true"></span>
      <p class="caption" lang="ru">{specimen.inactive}</p>
    </div>
  </section>
</main>

<style>
  .composition {
    width: 100%;
    height: 100%;
    padding: 16px;
    display: grid;
    grid-template-columns: 184px 1fr;
    grid-template-rows: 48px 238px 62px;
    gap: 8px 24px;
    border-top: 2px solid var(--display-rule-primary);
    color: var(--display-text-primary);
    font-size: var(--type-body);
    line-height: var(--leading-body);
    font-variant-numeric: tabular-nums;
  }

  h1,
  h2,
  p {
    margin: 0;
    font-weight: 400;
  }
  .caption {
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    letter-spacing: 0.3px;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: var(--type-label);
    line-height: var(--leading-label);
    font-weight: 600;
    letter-spacing: 1px;
    color: var(--display-text-secondary);
  }
  .channel-index {
    color: var(--display-text-muted);
    font-weight: 400;
    letter-spacing: 0;
  }

  .system-header {
    position: relative;
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
  }
  .system-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 448px;
    border-bottom: 1px solid var(--display-rule-secondary);
  }
  h1 {
    outline: none;
    font-size: var(--type-title);
    line-height: var(--leading-title);
    letter-spacing: 1px;
  }
  h1 span {
    color: var(--display-text-secondary);
  }
  .terminal-label {
    margin-top: 4px;
    color: var(--display-text-muted);
    letter-spacing: 0.65px;
  }
  .display-designation {
    display: grid;
    align-content: start;
    gap: 5px;
    text-align: right;
    color: var(--display-state-dormant);
  }
  .resolution {
    letter-spacing: 0;
  }

  .visual-channel {
    padding-top: 12px;
    display: grid;
    grid-template-rows: 24px 184px 18px;
  }
  .visual-field {
    position: relative;
    display: grid;
    place-items: center;
    border: 1px solid var(--display-rule-secondary);
    background: var(--display-background);
  }
  .empty-register {
    width: 16px;
    height: 32px;
    border-top: 1px solid var(--display-text-muted);
    border-bottom: 1px solid var(--display-text-muted);
  }
  .absent-image {
    position: absolute;
    bottom: 10px;
    color: var(--display-text-muted);
    letter-spacing: 0.2px;
  }
  .channel-footnote {
    align-self: end;
    color: var(--display-text-muted);
  }

  .communication-channel {
    display: grid;
    grid-template-rows: 24px 1fr 18px;
  }
  .communication-field {
    padding: 14px 0 0 34px;
  }
  .ready {
    position: relative;
    font-size: var(--type-state);
    line-height: var(--leading-state);
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .status-mark {
    position: absolute;
    left: -14px;
    top: 6px;
    width: 3px;
    height: 3px;
    background: var(--display-accent);
  }
  .waiting {
    margin-top: 7px;
    color: var(--display-text-secondary);
  }
  .system-channel {
    display: flex;
    gap: 18px;
    align-items: center;
    color: var(--display-text-muted);
  }
  .data-marker {
    display: block;
    flex: 0 0 16px;
    width: 16px;
    border-top: 1px solid var(--display-text-muted);
  }

  .command-channel {
    grid-column: 2;
    padding-top: 10px;
    border-top: 1px solid var(--display-rule-secondary);
  }
  .command-position {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 9px;
    color: var(--display-state-dormant);
  }
  .prompt {
    width: 20px;
    color: var(--display-text-primary);
    font-size: var(--type-body);
    line-height: var(--leading-body);
  }
  .command-position p {
    margin-left: auto;
    letter-spacing: 0.7px;
  }
</style>
