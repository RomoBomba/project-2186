<script lang="ts">
  import type { Locale } from '../../core/language/locale';
  import { bootMessages } from '../../locales/boot';
  import type { BootStep } from './sequence';

  let { step, locale }: { step: BootStep; locale: Locale } = $props();
  const copy = $derived(bootMessages[locale]);
  const showIdentity = $derived(
    step.state === 'identity' || step.state === 'collapse',
  );
</script>

<section
  class="boot-screen"
  lang={locale}
  aria-label={copy.acknowledgement}
  aria-busy="true"
>
  <p class="designation">2186 / <span>{copy.acknowledgement}</span></p>
  <div class="acknowledgements">
    <p class:acknowledged={step.lines >= 1}>
      <span>{copy.display}</span><span>{copy.ready}</span>
    </p>
    <p class:acknowledged={step.lines >= 2}>
      <span>{copy.archive}</span><span class="standby">{copy.standby}</span>
    </p>
    <p class:acknowledged={step.lines >= 3}>
      <span>{copy.language}</span><span>{copy.ready}</span>
    </p>
  </div>
  <div class="identity" class:acknowledged={showIdentity}>
    <h1>PROJECT <span>2186</span></h1>
    <p>{copy.identity}</p>
  </div>
  <p class="skip-hint">{copy.skip}</p>
</section>

<style>
  .boot-screen {
    width: 100%;
    height: 100%;
    padding: 48px 40px;
    color: var(--sage);
    font-size: var(--type-label);
    line-height: var(--leading-label);
    font-variant-numeric: tabular-nums;
  }
  h1,
  p {
    margin: 0;
    font-weight: 400;
  }
  .designation {
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    letter-spacing: 0.5px;
    color: var(--sea-glass);
  }
  .designation span {
    margin-left: 12px;
  }
  .acknowledgements {
    font-size: 11px;
    width: 352px;
    margin-top: 32px;
  }
  .acknowledgements p {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    visibility: hidden;
  }
  .acknowledgements .acknowledged,
  .identity.acknowledged {
    visibility: visible;
  }
  .standby {
    color: var(--warm-grey);
  }
  .identity {
    margin-top: 34px;
    padding-left: 16px;
    border-left: 2px solid var(--amber);
    visibility: hidden;
  }
  h1 {
    font-size: var(--type-title);
    line-height: var(--leading-title);
    letter-spacing: 1px;
    color: var(--ivory);
  }
  h1 span {
    color: var(--sage);
  }
  .identity p {
    margin-top: 6px;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    letter-spacing: 0.5px;
  }
  .skip-hint {
    position: absolute;
    left: 40px;
    bottom: 24px;
    font-size: var(--type-caption);
    line-height: var(--leading-caption);
    color: var(--sea-glass);
  }
</style>
