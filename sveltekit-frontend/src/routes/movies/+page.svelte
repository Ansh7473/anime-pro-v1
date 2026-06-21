<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getCollectionJsonLd } from "$lib/seo";
  import { onMount } from "svelte";
  import { Film, ChevronDown } from "lucide-svelte";

  let { data } = $props<{ data: { initialItems: any[]; hasNext: boolean; canonicalUrl: string } }>();

  const pageTitle = "Anime Movies - WatchAnimez";
  const pageDescription =
    "Browse popular, trending, top-rated, and upcoming anime movies with poster art, ratings, details, and episode links on WatchAnimez.";

  // svelte-ignore state_referenced_locally
  let items: any[] = $state(data.initialItems || []);
  // svelte-ignore state_referenced_locally
  let loading = $state(items.length === 0);
  // svelte-ignore state_referenced_locally
  let hasNext = $state(data.hasNext || false);

  $effect(() => {
    items = data.initialItems || [];
    hasNext = data.hasNext || false;
  });
  let currentPage = $state(1);
  let activeFilter = $state("Popular");
  const collectionJsonLd = $derived(
    getCollectionJsonLd(pageTitle, pageDescription, data.canonicalUrl, items)
  );

  const filters = ["Popular", "Trending", "Top Rated", "Upcoming"];

  onMount(() => {
    if (items.length === 0) loadPage(1);
  });

  async function loadPage(p: number) {
    loading = true;
    try {
      let res;
      switch (activeFilter) {
        case "Trending":
          res = await api.getTopAnime("MOVIE", p, 20, "TRENDING_DESC");
          break;
        case "Upcoming":
          res = await api.getTopAnime("MOVIE", p, 20, "START_DATE_DESC");
          break;
        case "Top Rated":
          res = await api.getTopAnime("MOVIE", p, 20, "SCORE_DESC");
          break;
        case "Popular":
        default:
          res = await api.getTopAnime("MOVIE", p);
          break;
      }

      items = p === 1 ? res.data : [...items, ...res.data];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function setFilter(f: string) {
    activeFilter = f;
    loadPage(1);
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={data.canonicalUrl} />
</svelte:head>

<JsonLd data={collectionJsonLd} />

<div class="page container">
  <!-- Page Header -->
  <div class="page-header">
    <div class="header-top">
      <div>
        <h1 class="page-title">Anime Movies</h1>
        <p class="page-subtitle">Popular, trending, top-rated, and upcoming anime films</p>
      </div>
      <div class="header-badge">
        <Film size={16} />
        <span>Movies</span>
      </div>
    </div>
  </div>

  <!-- Filters -->
  <div class="filter-bar">
    {#each filters as f}
      <button
        class="filter-btn"
        class:active={activeFilter === f}
        onclick={() => setFilter(f)}
      >
        {f}
      </button>
    {/each}
  </div>

  <!-- Results count -->
  {#if items.length > 0}
    <div class="results-count">
      <span>{items.length} movies found</span>
    </div>
  {/if}

  <!-- Content -->
  {#if loading && items.length === 0}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading anime movies...</p>
    </div>
  {:else}
    <div class="anime-grid">
      {#each items as anime (anime.id)}
        <AnimeCard {anime} />
      {/each}
    </div>

    {#if hasNext}
      <div class="load-more-wrapper">
        <button
          class="load-more-btn"
          onclick={() => loadPage(currentPage + 1)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load more movies"}
          <ChevronDown size={16} />
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    padding-top: 2rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .page-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.3rem;
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 1rem;
  }
  .header-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.4rem 1rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--net-red);
    white-space: nowrap;
  }

  /* Filter Bar */
  .filter-bar {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    margin-bottom: 2rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .filter-bar::-webkit-scrollbar { display: none; }

  .filter-btn {
    flex-shrink: 0;
    padding: 0.6rem 1.25rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: var(--net-text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .filter-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }
  .filter-btn.active {
    background: var(--net-red);
    border-color: var(--net-red);
    color: white;
  }

  .results-count {
    margin-bottom: 1.5rem;
    font-size: 0.88rem;
    color: var(--net-text-muted);
    font-weight: 500;
  }

  /* Grid */
  .anime-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    margin-bottom: 3rem;
  }

  /* Loading */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    gap: 1rem;
    color: var(--net-text-muted);
  }
  .loading-state p {
    font-size: 0.9rem;
  }

  /* Load More */
  .load-more-wrapper {
    display: flex;
    justify-content: center;
    padding: 1rem 0 2rem;
  }
  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 2rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .load-more-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--net-red);
  }
  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.6rem; }
    .page-subtitle { font-size: 0.9rem; }
    .header-badge { display: none; }
    .anime-grid {
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
    }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.4rem; }
    .filter-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }
    .anime-grid {
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    }
  }

  @media (max-width: 360px) {
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
    }
  }
</style>
