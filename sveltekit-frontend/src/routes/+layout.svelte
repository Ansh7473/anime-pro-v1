<script lang="ts">
  import { browser } from "$app/environment";
  import { themeState } from "$lib/stores/theme";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { isTV } from "$lib/stores/device";
  import TVShell from "$lib/components/tv/TVShell.svelte";
  import RegularShell from "$lib/components/RegularShell.svelte";
  
  import "../app.css";
  import "../lib/styles/themes.css";

  let { children } = $props();

  // TV Mode Redirection Logic
  $effect(() => {
    if (!browser) return;
    const p = page.url.pathname as string;
    
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

<div class="app theme-{$themeState.current}" 
     class:tv-mode={$isTV}
     data-gradients={$themeState.gradients}
     data-effect={$themeState.effect}>
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
    background: var(--net-bg);
    color: var(--net-text);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .tv-mode {
    background: #050505;
    color: white;
    overflow: hidden;
  }
</style>
