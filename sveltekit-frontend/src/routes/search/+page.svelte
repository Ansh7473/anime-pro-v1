<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  let query = $state("");
  let results: any[] = $state([]);
  let loading = $state(false);
  let hasNext = $state(false);
  let currentPage = $state(1);

  onMount(() => {
    const q = page.url.searchParams.get("q") || "";
    if (q) {
      query = q;
      doSearch();
    }
  });

  async function doSearch(p = 1) {
    if (!query.trim()) return;
    loading = true;
    try {
      const res = await api.search(query, p, 24);
      results = p === 1 ? res.data : [...results, ...res.data];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error(e);
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

<svelte:head><title>Search — AnimePro</title></svelte:head>

<div class="search-page container">
  <h1 class="page-title">Search Anime</h1>
  <div class="search-bar">
    <input
      type="text"
      bind:value={query}
      placeholder="Type anime name..."
      onkeydown={handleKey}
    />
    <button
      class="btn-primary"
      onclick={() => {
        results = [];
        doSearch(1);
      }}>Search</button
    >
  </div>

  {#if loading && results.length === 0}
    <div class="center"><div class="spinner"></div></div>
  {:else if results.length > 0}
    <div class="results-grid">
      {#each results as anime (anime.id)}
        <AnimeCard {anime} />
      {/each}
    </div>
    {#if hasNext}
      <div class="center" style="margin-top:2rem;">
        <button
          class="btn-secondary"
          onclick={() => doSearch(currentPage + 1)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      </div>
    {/if}
  {:else if !loading && query}
    <p class="empty">No results found for "{query}"</p>
  {/if}
</div>

<style>
  .search-page {
    padding-top: 2rem;
  }
  .page-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }
  .search-bar {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  .search-bar input {
    flex: 1;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    background: var(--net-card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    outline: none;
  }
  .search-bar input:focus {
    border-color: var(--net-red);
  }
  .results-grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
  }
  .center {
    display: flex;
    justify-content: center;
    padding: 3rem 0;
  }
  .empty {
    color: var(--net-text-muted);
    text-align: center;
    padding: 4rem 0;
    font-size: 1.1rem;
  }

  /* Tablet responsive */
  @media (max-width: 768px) {
    .search-page {
      padding-top: 1.5rem;
    }
    .page-title {
      font-size: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .search-bar {
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .search-bar input {
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
    }
    .results-grid {
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    .center {
      padding: 2rem 0;
    }
    .empty {
      padding: 3rem 0;
      font-size: 1rem;
    }
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .search-page {
      padding-top: 1rem;
    }
    .page-title {
      font-size: 1.3rem;
      margin-bottom: 1rem;
    }
    .search-bar {
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .search-bar input {
      padding: 0.6rem 0.75rem;
      font-size: 0.9rem;
      width: 100%;
    }
    .search-bar button {
      width: 100%;
      padding: 0.6rem 1rem;
    }
    .results-grid {
      gap: 0.75rem;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
    .center {
      padding: 1.5rem 0;
    }
    .empty {
      padding: 2rem 0;
      font-size: 0.95rem;
    }
  }

  /* Small mobile responsive */
  @media (max-width: 360px) {
    .page-title {
      font-size: 1.2rem;
    }
    .search-bar input {
      font-size: 0.85rem;
      padding: 0.55rem 0.7rem;
    }
    .results-grid {
      gap: 0.6rem;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    }
  }
</style>
