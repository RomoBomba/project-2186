<script lang="ts">
  import type { Layout } from './model';
  let { layout }: { layout: Layout } = $props();
</script>

<div class="schematic" data-layout={layout} aria-hidden="true">
  <span class="header-rule"></span>
  <span class="visual"></span>
  <span class="signal"></span>
  <span class="command"></span>
</div>

<style>
  .schematic {
    position: relative;
    width: 128px;
    height: 80px;
    border: 1px solid var(--display-rule-secondary);
  }
  .header-rule {
    position: absolute;
    top: 11px;
    left: 7px;
    right: 7px;
    border-top: 1px solid var(--display-rule-secondary);
  }
  .visual {
    position: absolute;
    top: 21px;
    left: 7px;
    width: 32px;
    height: 39px;
    border: 1px solid var(--display-text-muted);
  }
  .signal {
    position: absolute;
    top: 25px;
    left: 49px;
    width: 16px;
    border-top: 1px solid var(--display-text-muted);
  }
  .command {
    position: absolute;
    bottom: 9px;
    left: 49px;
    right: 7px;
    border-top: 1px solid var(--display-rule-secondary);
  }
  [data-layout='B'] .visual {
    left: auto;
    right: 7px;
  }
  [data-layout='B'] .signal {
    left: 7px;
  }
  [data-layout='B'] .command {
    left: 7px;
    right: 49px;
  }
  [data-layout='C'] .visual {
    left: 7px;
    top: 21px;
    width: 21px;
    height: 21px;
  }
  [data-layout='C'] .signal {
    left: 38px;
  }
  [data-layout='C'] .command {
    left: 7px;
  }
</style>
