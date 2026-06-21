<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getCollectionJsonLd } from "$lib/seo";
  import { onMount } from "svelte";

  let { data } = $props();
  const category = $derived(data.category);

  const titleMap: Record<string, string> = {
    trending: "🔥 Trending Now",
    "trending-now": "🔥 Trending Now",
    popular: "⭐ Most Popular",
    "most-popular": "⭐ Most Popular",
    "all-time-popular": "⭐ All Time Popular",
    seasonal: "📅 This Season",
    "top-airing": "📺 Top Airing",
    upcoming: "🚀 Upcoming",
    movies: "🎬 Movies",
    "highest-rated": "🏆 Highest Rated",
    action: "⚔️ Action",
    romance: "💕 Romance",
  };

  // svelte-ignore state_referenced_locally
  let items: any[] = $state(data.items || []);
  // svelte-ignore state_referenced_locally
  let loading = $state(!data.items?.length);
  // svelte-ignore state_referenced_locally
  let hasNext = $state(data.hasNext || false);
  let currentPage = $state(1);

  $effect(() => {
    // Keep in sync with server-loaded data updates during navigation
    items = data.items || [];
    loading = !data.items?.length;
    hasNext = data.hasNext || false;
    currentPage = 1;
  });

  const pageTitle = $derived(titleMap[category] || category);
  const pageDescription = $derived(
    `Browse ${pageTitle.replace(/[^\w\s&-]/g, "").trim()} anime on WatchAnimez with posters, ratings, genres, and detailed watch pages.`
  );
  const collectionJsonLd = $derived(getCollectionJsonLd(`${pageTitle} — WatchAnimez`, pageDescription, data.canonicalUrl, items));

  onMount(() => {
    if (items.length === 0) loadPage(1);
  });

  async function loadPage(p: number) {
    loading = true;
    try {
      const res = await api.getCategory(category, p);
      items = p === 1 ? res.data : [...items, ...res.data];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head
  ><title>{pageTitle} — WatchAnimez</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={`${pageTitle} — WatchAnimez`} />
  <meta property="og:description" content={pageDescription} /></svelte:head
>

<JsonLd data={collectionJsonLd} />

<div class="page container">
  <h1 class="page-title">{titleMap[category] || category}</h1>
  {#if loading && items.length === 0}
    <div class="center"><div class="spinner"></div></div>
  {:else}
    <div class="grid">
      {#each items as anime (anime.id)}
        <AnimeCard {anime} />
      {/each}
    </div>
    {#if hasNext}
      <div class="center">
        <button
          class="btn-secondary"
          onclick={() => loadPage(currentPage + 1)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    padding-top: 2rem;
  }
  .page-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }
  .grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
  }
  .center {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
  }

  @media (max-width: 768px) {
    .page {
      padding-top: 1.5rem;
    }
    .page-title {
      font-size: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .grid {
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    .center {
      padding: 1.5rem 0;
    }
  }

  @media (max-width: 480px) {
    .page {
      padding-top: 1rem;
    }
    .page-title {
      font-size: 1.3rem;
      margin-bottom: 1rem;
    }
    .grid {
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
    .center {
      padding: 1.25rem 0;
    }
  }

  @media (max-width: 360px) {
    .page-title {
      font-size: 1.2rem;
    }
    .grid {
      gap: 0.7rem;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    }
  }
</style>
