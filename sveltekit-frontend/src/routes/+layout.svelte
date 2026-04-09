<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { isTV } from "$lib/stores/device";
  import TVShell from "$lib/components/tv/TVShell.svelte";
  import RegularShell from "$lib/components/RegularShell.svelte";

  let { children } = $props();

  // TV Mode Redirection Logic
  $effect(() => {
    const p = page.url.pathname as string;
    if ($isTV) {
      // Redirect web navigation routes to TV Hub, but allow /anime, /watch, and /explore
      if ((p !== '/tv' && !p.startsWith('/tv/')) && !p.startsWith('/anime') && !p.startsWith('/watch') && !p.startsWith('/explore')) {
        goto('/tv');
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
