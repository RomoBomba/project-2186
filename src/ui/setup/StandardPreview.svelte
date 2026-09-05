<script lang="ts">
  import type { DisplayStandard } from '../display/standards';
  let { standard }: { standard: DisplayStandard } = $props();
</script>

<div class="preview" data-display-standard={standard} aria-hidden="true">
  <div class="miniature">
    <span class="caption">2186 / 01</span>
    <span class="visual"></span>
    <span class="primary">Aa / Яя</span>
    <span class="secondary">02 / ———</span>
    <span class="dormant">···</span>
    <span class="command">&gt; <i></i></span>
  </div>
</div>

<style>
  .preview {
    width: 148px;
    height: 96px;
    padding: 8px 10px;
    background: var(--display-background);
  }
  .miniature {
    position: relative;
    width: 128px;
    height: 80px;
    background: var(--display-surface);
    border-top: 1px solid var(--display-rule-primary);
    color: var(--display-text-primary);
    font-size: 9px;
    line-height: 12px;
  }
  .caption {
    position: absolute;
    top: 5px;
    left: 6px;
    font-size: 7px;
    color: var(--display-text-muted);
  }
  .visual {
    position: absolute;
    top: 23px;
    left: 6px;
    width: 27px;
    height: 37px;
    border: 1px solid var(--display-rule-secondary);
    background: var(--display-background);
  }
  .primary {
    position: absolute;
    top: 23px;
    left: 42px;
  }
  .secondary {
    position: absolute;
    top: 36px;
    left: 42px;
    color: var(--display-text-secondary);
  }
  .dormant {
    position: absolute;
    top: 48px;
    left: 42px;
    color: var(--display-state-dormant);
  }
  .command {
    position: absolute;
    bottom: 4px;
    left: 42px;
    right: 6px;
    border-top: 1px solid var(--display-rule-secondary);
    color: var(--display-accent);
  }
  i {
    display: inline-block;
    width: 12px;
    border-top: 1px solid var(--display-text-muted);
  }
</style>
