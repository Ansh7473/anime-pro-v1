<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import SkeletonGrid from "$lib/components/SkeletonGrid.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getCollectionJsonLd } from "$lib/seo";
  import { Clock, ChevronLeft, ChevronRight } from "lucide-svelte";

  const TABS = [
    { id: "recently-updated", label: "All Episodes" },
    { id: "subbed-anime", label: "Subbed" },
    { id: "dubbed-anime", label: "Dubbed" },
  ];

  let { data } = $props<{ data: { initialItems: any[]; hasNext: boolean; canonicalUrl: string } }>();

  const pageTitle = "Latest Anime - WatchAnimez";
  const pageDescription =
    "Find recently updated anime, current seasonal shows, subbed anime, and dubbed picks on WatchAnimez.";

  let tab = $state("recently-updated");
  let page = $state(1);
  let animes: any[] = $state([]);
  let loading = $state(true);
  let hasNextPage = $state(false);

  const collectionJsonLd = $derived(
    getCollectionJsonLd(pageTitle, pageDescription, data.canonicalUrl, animes)
  );

  // Consume the streamed initial data (default tab, page 1). Re-seeds on navigation.
  let lastInitial: any = null;
  $effect(() => {
    const p = data.initial;
    if (p === lastInitial) return;
    lastInitial = p;
    tab = "recently-updated";
    page = 1;
    loading = true;
    Promise.resolve(p).then((res) => {
      if (data.initial !== p) return; // stale navigation
      animes = res?.items || [];
      hasNextPage = res?.hasNext || false;
      loading = false;
    });
  });

  async function fetchEpisodes() {
      loading = true;
      try {
        let res: any;
        if (tab === "recently-updated") {
          res = await api.getCurrentSeasonal(page, 24);
        } else if (tab === "subbed-anime") {
          // Search for TV anime (best subbed indicator — original Japanese audio)
          res = await api.getTopAnime("TV", page, 24, "POPULARITY_DESC");
        } else {
          // Dubbed tab — search for movies/TV by popularity (Dubbed anime is sourced, not media-typed)
          // Fall back to top rated for now
          res = await api.getTopAnime("TV", page, 24, "SCORE_DESC");
        }
        animes = res?.data || res?.items || [];
        hasNextPage = res?.pagination?.has_next_page ?? (animes.length >= 24);
      } catch (err) {
        console.error("Failed to fetch latest episodes", err);
      } finally {
        loading = false;
      }
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

  function changeTab(id: string) {
    if (tab === id) return;
    tab = id;
    page = 1;
    fetchEpisodes();
  }

  function prevPage() {
    if (page <= 1) return;
    page--;
    fetchEpisodes();
  }

  function nextPage() {
    if (!hasNextPage) return;
    page++;
    fetchEpisodes();
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

<div class="latest-page">
  <!-- Page Header -->
  <div class="page-header container">
    <div class="header-top">
      <div>
        <h1 class="page-title">Latest Anime</h1>
        <p class="page-subtitle">Recently updated anime, seasonal shows, subbed picks, and dubbed picks</p>
      </div>
      <div class="header-badge">
        <Clock size={16} />
        <span>Latest</span>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs-bar container">
    {#each TABS as t}
      <button
        class="tab-btn"
        class:active={tab === t.id}
        onclick={() => changeTab(t.id)}
      >
        {t.label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="content-section container">
    {#if loading}
          <div class="anime-grid">
            <SkeletonGrid count={24} />
          </div>
        {:else if animes.length > 0}
          <div class="anime-grid">
            {#each animes as anime (anime.id)}
              <AnimeCard {anime} />
            {/each}
          </div>

          <!-- Pagination -->
          <div class="pagination">
            <button class="page-btn" disabled={page === 1} onclick={prevPage}>
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>

            <div class="page-info">
              <span>Page {page}</span>
            </div>

            <button class="page-btn next" disabled={!hasNextPage} onclick={nextPage}>
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        {:else}
          <div class="empty-state">
            <Clock size={40} class="empty-icon" />
            <p>No anime found for this filter. Try another tab.</p>
            <button class="page-btn" onclick={() => changeTab("recently-updated")}>
              Reset to All Episodes
            </button>
          </div>
        {/if}
  </div>
</div>

<style>
  .latest-page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding-bottom: 4rem;
  }

  .page-header {
    padding-top: 2rem;
    margin-bottom: 1.5rem;
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

  /* Tabs */
  .tabs-bar {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    margin-bottom: 2rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .tabs-bar::-webkit-scrollbar { display: none; }

  .tab-btn {
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
  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }
  .tab-btn.active {
    background: var(--net-red);
    border-color: var(--net-red);
    color: white;
  }

  /* Grid */
  .anime-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    margin-bottom: 3rem;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem 0 2rem;
  }
  .page-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.25rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: white;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .page-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--net-red);
  }
  .page-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .page-btn.next {
    background: rgba(229, 9, 20, 0.08);
    border-color: rgba(255, 138, 61, 0.22);
    color: var(--net-red);
  }
  .page-info {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--net-text-muted);
  }

  /* Empty */
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
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.6rem; }
    .page-subtitle { font-size: 0.9rem; }
    .header-badge { display: none; }
    .anime-grid {
      gap: 0.95rem 0.7rem;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    }
    .pagination { gap: 1rem; }
    .page-btn { padding: 0.6rem 1rem; font-size: 0.8rem; }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.4rem; }
    .tab-btn {
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
