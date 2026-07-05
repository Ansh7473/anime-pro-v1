<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import SkeletonGrid from "$lib/components/SkeletonGrid.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { Search, Sparkles, SlidersHorizontal } from "lucide-svelte";

  let query = $state("");
  let results: any[] = $state([]);
  let loading = $state(false);
  let hasNext = $state(false);
  let currentPage = $state(1);

  onMount(() => {
    const q = page.url.searchParams.get("q") || "";
    if (q) {
      query = q;
      doSearch(1);
    }
  });

  // Watch query changes in URL
  $effect(() => {
    const currentQ = page.url.searchParams.get("q") || "";
    if (currentQ && currentQ !== query) {
      query = currentQ;
      doSearch(1);
    }
  });

  async function doSearch(p = 1) {
    if (!query.trim()) return;
    loading = true;
    try {
      const res = await api.search(query, p, 24);
      results = p === 1 ? (res.data || []) : [...results, ...(res.data || [])];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error("Search page error:", e);
    } finally {
      loading = false;
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      results = [];
      doSearch(1);
    }
  }
</script>

<svelte:head>
  <title>{query ? `Search results for "${query}"` : 'Search Anime'} - WatchAnimez</title>
  <meta
    name="description"
    content="Search anime by title on WatchAnimez and discover details, ratings, posters, recommendations, and episode pages."
  />
</svelte:head>

<div class="search-page container">
  <div class="search-header-hero">
    <div class="hero-content">
      <h1 class="page-title">
        <Search class="header-icon" size={28} />
        <span>Find Your Favorite <span class="accent-text">Anime</span></span>
      </h1>
      <p class="hero-subtitle">Search over 10,000+ anime titles, movies, OVAs, and special series.</p>
    </div>

    <!-- MAIN SEARCH BAR INPUT -->
    <div class="search-bar-box glass">
      <div class="input-inner">
        <Search size={20} class="input-icon" />
        <input
          type="text"
          bind:value={query}
          placeholder="Search title, character, studio..."
          onkeydown={handleKey}
        />
        {#if query}
          <button class="clear-btn" onclick={() => query = ""}>✕</button>
        {/if}
      </div>

      <button
        class="search-submit-btn"
        onclick={() => {
          results = [];
          doSearch(1);
        }}
      >
        <span>Search</span>
      </button>
    </div>
  </div>

  <!-- SEARCH STATS BAR -->
  {#if query}
    <div class="search-meta-bar">
      <div class="meta-label">
        Showing results for <span class="query-highlight">"{query}"</span>
      </div>
      {#if results.length > 0}
        <div class="results-count-badge">{results.length}+ Anime Titles</div>
      {/if}
    </div>
  {/if}

  <!-- RESULTS GRID -->
  {#if loading && results.length === 0}
    <div class="results-grid">
      <SkeletonGrid count={18} />
    </div>
  {:else if results.length > 0}
    <div class="results-grid">
      {#each results as anime (anime.id)}
        <AnimeCard {anime} />
      {/each}
    </div>

    {#if hasNext}
      <div class="load-more-container">
        <button
          class="load-more-btn"
          onclick={() => doSearch(currentPage + 1)}
          disabled={loading}
        >
          {#if loading}
            <div class="btn-spinner"></div>
            <span>Fetching more...</span>
          {:else}
            <span>Load More Results</span>
          {/if}
        </button>
      </div>
    {/if}
  {:else if !loading && query}
    <div class="empty-results-card glass">
      <Search size={48} class="empty-icon" />
      <h2>No Anime Found</h2>
      <p>We couldn't find any anime matching <strong>"{query}"</strong>.</p>
      <p class="suggestion-text">Try checking for typos, searching with Japanese titles, or browsing by genre.</p>
    </div>
  {:else if !query}
    <div class="initial-search-prompt glass">
      <Sparkles size={40} class="prompt-icon" />
      <h2>Start Exploring</h2>
      <p>Type an anime title above to search our full catalog with instant subtitles and dubbing metadata.</p>
    </div>
  {/if}
</div>

<style>
  .search-page {
    padding-top: 6.5rem;
    padding-bottom: 5rem;
    min-height: 80vh;
  }

  .search-header-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .hero-content {
    max-width: 650px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .page-title {
    font-size: 2.2rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    letter-spacing: -0.02em;
    color: white;
  }

  :global(.header-icon) {
    color: var(--net-red, #e50914);
  }

  .accent-text {
    color: var(--net-red, #e50914);
    text-shadow: 0 0 20px rgba(229, 9, 20, 0.4);
  }

  .hero-subtitle {
    font-size: 0.98rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .search-bar-box {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 650px;
    padding: 0.4rem;
    background: rgba(18, 18, 26, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 18px;
    gap: 0.5rem;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }

  .search-bar-box:focus-within {
    border-color: var(--net-red, #e50914);
    box-shadow: 0 0 25px rgba(229, 9, 20, 0.25);
  }

  .input-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    padding: 0.5rem 0.85rem;
  }

  :global(.input-icon) {
    color: rgba(255, 255, 255, 0.4);
    flex: none;
  }

  .input-inner input {
    width: 100%;
    background: none;
    border: none;
    outline: none;
    color: white;
    font-size: 1.05rem;
    font-weight: 500;
  }

  .input-inner input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .clear-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0.2rem;
  }

  .clear-btn:hover {
    color: white;
  }

  .search-submit-btn {
    background: var(--net-red, #e50914);
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 0.75rem 1.5rem;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: none;
  }

  .search-submit-btn:hover {
    background: #f40612;
    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.4);
    transform: translateY(-1px);
  }

  /* META BAR */
  .search-meta-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .meta-label {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.75);
  }

  .query-highlight {
    font-weight: 700;
    color: white;
  }

  .results-count-badge {
    background: rgba(229, 9, 20, 0.15);
    border: 1px solid rgba(229, 9, 20, 0.3);
    color: #ff4757;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
  }

  /* GRID */
  .results-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .load-more-container {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 0.85rem 2.2rem;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .load-more-btn:hover:not(:disabled) {
    background: rgba(229, 9, 20, 0.2);
    border-color: rgba(229, 9, 20, 0.5);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(229, 9, 20, 0.3);
  }

  .btn-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  /* EMPTY & PROMPT STATES */
  .empty-results-card, .initial-search-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.85rem;
    padding: 4rem 2rem;
    border-radius: 20px;
    background: rgba(18, 18, 24, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin: 2rem 0;
  }

  :global(.empty-icon), :global(.prompt-icon) {
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 0.5rem;
  }

  :global(.prompt-icon) {
    color: #ff4757;
  }

  .empty-results-card h2, .initial-search-prompt h2 {
    color: white;
    font-size: 1.4rem;
    font-weight: 700;
  }

  .empty-results-card p, .initial-search-prompt p {
    color: rgba(255, 255, 255, 0.6);
    max-width: 420px;
    font-size: 0.92rem;
  }

  .suggestion-text {
    font-size: 0.84rem !important;
    color: rgba(255, 255, 255, 0.4) !important;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .search-page {
      padding-top: 5rem;
    }
    .page-title {
      font-size: 1.7rem;
    }
    .results-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.85rem;
    }
    .search-bar-box {
      flex-direction: row;
    }
    .search-submit-btn {
      padding: 0.65rem 1.1rem;
      font-size: 0.88rem;
    }
  }

  @media (max-width: 480px) {
    .results-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 0.75rem;
    }
    .page-title {
      font-size: 1.45rem;
    }
    .hero-subtitle {
      font-size: 0.85rem;
    }
  }
</style>
