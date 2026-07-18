<script lang="ts">
  import { browser } from "$app/environment";
  import { themeState } from "$lib/stores/theme";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { isTV } from "$lib/stores/device";
  import TVShell from "$lib/components/tv/TVShell.svelte";
  import RegularShell from "$lib/components/RegularShell.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getSiteJsonLd, SITE_NAME } from "$lib/seo";
  import { SEARCH_ENGINE_META_VERIFICATIONS } from "$lib/seo-verification";
  import { adsAllowedOn, loadPopunder } from "$lib/ads";

  import "../app.css";
  import "../lib/styles/themes.css";

  let { children, data } = $props();
  const siteJsonLd = $derived(getSiteJsonLd(data.canonicalUrl));

  // Monetag popunder: load only on free content pages, never on ad-free /
  // non-content routes. Deferred so it never blocks first paint. Once loaded
  // the third-party script persists for the session (popunders can't be
  // unloaded), so it's injected the first time an allowed page is visited.
  $effect(() => {
    if (!browser) return;
    if (!adsAllowedOn(page.url.pathname as string)) return;
    const t = setTimeout(loadPopunder, 2000);
    return () => clearTimeout(t);
  });

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

<svelte:head>
  <link rel="canonical" href={data.canonicalUrl} />
  <meta name="robots" content={data.robotsContent} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={data.canonicalUrl} />
  <meta name="twitter:card" content="summary_large_image" />
  {#each SEARCH_ENGINE_META_VERIFICATIONS as verification}
    <meta name={verification.name} content={verification.content} />
  {/each}
</svelte:head>

<JsonLd data={siteJsonLd} />

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
    min-height: 100dvh;
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
