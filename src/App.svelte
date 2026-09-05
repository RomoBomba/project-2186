<script lang="ts">
  import { defaultLocale } from './core/language/locale';
  import { systemMessages } from './locales/system';

  const messages = systemMessages[defaultLocale];
</script>

<main>
  <h1>PROJECT 2186</h1>
  <p>{messages.foundationStatus}</p>
</main>
