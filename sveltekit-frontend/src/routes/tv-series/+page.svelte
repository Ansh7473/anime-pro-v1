<script lang="ts">
  import { api, mergeUniqueAnime } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import SkeletonGrid from "$lib/components/SkeletonGrid.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getCollectionJsonLd } from "$lib/seo";
  import { Radio, ChevronDown } from "lucide-svelte";

  let { data } = $props<{
    data: {
      initial: Promise<{ items: any[]; hasNext: boolean }>;
      canonicalUrl: string;
    };
  }>();

  const pageTitle = "Anime TV Series - WatchAnimeX";
  const pageDescription =
    "Browse popular, airing, upcoming, and top-rated anime TV series with descriptions, ratings, episode pages, and recommendations on WatchAnimeX.";

  let items: any[] = $state([]);
  let loading = $state(true);
  let appending = $state(false);
  let hasNext = $state(false);
  let currentPage = $state(1);
  let activeFilter = $state("Popular");

  // Consume streamed initial data and invalidate any older filter request.
  let lastInitial: any = null;
  let loadGeneration = 0;
  $effect(() => {
    const p = data.initial;
    if (p === lastInitial) return;
    lastInitial = p;
    const generation = ++loadGeneration;
    loading = true;
    activeFilter = "Popular";
    currentPage = 1;
    Promise.resolve(p).then((res) => {
      if (data.initial !== p || generation !== loadGeneration) return;
      items = res?.items || [];
      hasNext = res?.hasNext || false;
      loading = false;
    });
  });
  const collectionJsonLd = $derived(
    getCollectionJsonLd(pageTitle, pageDescription, data.canonicalUrl, items)
  );

  const filters = ["Popular", "Airing", "Upcoming", "Top Rated"];

  async function loadPage(p: number, filter = activeFilter) {
    if (p > 1 && appending) return;
    const generation = ++loadGeneration;
    if (p === 1) loading = true;
    else appending = true;
    try {
      let res;
      switch (filter) {
        case "Airing":
          res = await api.search("", p, 20, { format: "TV", status: "RELEASING", sort: ["TRENDING_DESC"] });
          break;
        case "Upcoming":
          res = await api.search("", p, 20, { format: "TV", status: "NOT_YET_RELEASED", sort: ["POPULARITY_DESC"] });
          break;
        case "Top Rated":
          res = await api.getTopAnime("TV", p, 20, "SCORE_DESC");
          break;
        case "Popular":
        default:
          res = await api.getTopAnime("TV", p);
          break;
      }

      if (generation !== loadGeneration || filter !== activeFilter) return;
      const incoming = Array.isArray(res.data) ? res.data : [];
      items = p === 1 ? mergeUniqueAnime([], incoming) : mergeUniqueAnime(items, incoming);
      hasNext = Boolean(res.pagination?.has_next_page);
      currentPage = Number(res.pagination?.current_page) || p;
    } catch (e) {
      if (generation === loadGeneration) console.error(e);
    } finally {
      if (generation === loadGeneration) {
        loading = false;
        appending = false;
      }
    }
  }

  function setFilter(f: string) {
    if (f === activeFilter) return;
    activeFilter = f;
    void loadPage(1, f);
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
        <h1 class="page-title">TV Series</h1>
        <p class="page-subtitle">Popular, airing, upcoming, and top-rated anime series</p>
      </div>
      <div class="header-badge">
        <Radio size={16} />
        <span>TV Series</span>
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
      <span>{items.length} series found</span>
    </div>
  {/if}

  <!-- Content -->
  {#if loading}
    <div class="anime-grid">
      <SkeletonGrid count={18} />
    </div>
  {:else if items.length > 0}
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
          disabled={appending}
        >
          {appending ? "Loading..." : "Load more series"}
          <ChevronDown size={16} />
        </button>
      </div>
    {/if}
  {:else}
    <div class="empty-state">
      <Radio size={40} class="empty-icon" />
      <p>No series found. Please try again.</p>
      <button class="load-more-btn" onclick={() => loadPage(1)}>
        Retry
      </button>
    </div>
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
    border: 1px solid rgba(255, 138, 61, 0.22);
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
    transition: color 0.2s, background-color 0.2s, border-color 0.2s;
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

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--net-text-muted);
    }
    .empty-icon {
      opacity: 0.4;
      margin-bottom: 1rem;
    }
    .empty-state p {
      font-size: 0.95rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 768px) {
    .page-title { font-size: 1.6rem; }
    .page-subtitle { font-size: 0.9rem; }
    .header-badge { display: none; }
    .anime-grid {
      gap: 0.95rem 0.7rem;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.4rem; }
    .filter-btn {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }
    .anime-grid {
      gap: 0.85rem 0.6rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 360px) {
    .anime-grid {
      gap: 0.7rem 0.5rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
