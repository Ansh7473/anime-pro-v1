<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { isTV } from "$lib/stores/device";
  import TVShell from "$lib/components/tv/TVShell.svelte";
  import RegularShell from "$lib/components/RegularShell.svelte";

  import { browser } from "$app/environment";

  let { children } = $props();

  // TV Mode Redirection Logic
  $effect(() => {
    if (!browser) return;
    const p = page.url.pathname;
    
    if ($isTV) {
      if ((p !== '/tv' && !p.startsWith('/tv/')) && !p.startsWith('/anime') && !p.startsWith('/watch') && !p.startsWith('/explore')) {
        goto('/tv', { replaceState: true });
      }
    } else {
      if (p === '/tv' || p.startsWith('/tv/')) {
        goto('/', { replaceState: true });
      }
    }
  });
</script>

<div class="app" class:tv-mode={$isTV}>
  {#if $isTV}
    <TVShell>
      {@render children()}
    </TVShell>
  {:else}
    <RegularShell>
      {@render children()}
    </RegularShell>
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .tv-mode {
    background: #050505;
    color: white;
    overflow: hidden;
  }
</style>
