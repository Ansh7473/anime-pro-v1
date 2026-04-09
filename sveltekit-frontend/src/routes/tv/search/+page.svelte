<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { Search as SearchIcon } from 'lucide-svelte';

  import { page } from "$app/state";

  let query = $state("");
  let results = $state<any[]>([]);
  let loading = $state(false);
  let inputElement: HTMLInputElement = $state(null!);

  let isGenre = $state(false);

  // Svelte 5 Debounced Search Effect (Smart Search)
  $effect(() => {
    if (query.trim().length < 2) {
      if (query.trim().length === 0) results = [];
      return;
    }

    const timer = setTimeout(async () => {
      loading = true;
      try {
        const res = isGenre ? await api.getByGenre(query) : await api.search(query);
        results = res.data || [];
      } catch (e) {
        console.error("Search error:", e);
        results = [];
      } finally {
        loading = false;
      }
    }, 600);

    return () => clearTimeout(timer);
  });

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      isGenre = false;
    }
  }

  onMount(() => {
    const q = page.url.searchParams.get("q");
    const genre = page.url.searchParams.get("genre");

    if (genre) {
        isGenre = true;
        query = genre; // This triggers the $effect
    } else if (q) {
        isGenre = false;
        query = q; // This triggers the $effect
    } else {
        inputElement?.focus();
    }
  });
</script>

<div class="tv-search-page">
  <div class="search-input-container">
    <SearchIcon size={48} />
    <input 
      bind:this={inputElement}
      type="text" 
      placeholder="Type to search..." 
      bind:value={query}
      oninput={() => isGenre = false}
      onkeydown={onKeyDown}
      class="tv-search-input"
      tabindex="0"
    />
    <button class="tv-search-btn" onclick={() => { isGenre = false; }}>SEARCH</button>
  </div>

  <div class="search-results">
    {#if loading}
      <div class="row-loading">
        <div class="tv-spinner"></div>
      </div>
    {:else if results.length > 0}
      <div class="results-grid">
        {#each results as anime}
          <div class="result-item">
            <AnimeCard {anime} />
          </div>
        {/each}
      </div>
    {:else if query && !loading}
      <div class="no-results">
        <p>No titles found matching "{query}"</p>
        <span>Try searching for something else.</span>
      </div>
    {:else}
      <div class="search-placeholder">
        <p>Type to search across thousands of titles</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .tv-search-page {
    padding-top: 2rem;
  }

  .search-input-container {
    display: flex;
    align-items: center;
    gap: 2rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 1.5rem 3rem;
    border-radius: 100px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s;
    margin-bottom: 5rem;
  }

  .search-input-container:focus-within {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--net-red);
    box-shadow: 0 0 50px rgba(229, 9, 20, 0.2);
    transform: scale(1.02);
  }

  .tv-search-input {
    flex: 1;
    background: none;
    border: none;
    color: white;
    font-size: 2.5rem;
    font-weight: 700;
    outline: none;
  }

  .tv-search-input::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }

  .tv-search-btn {
    background: var(--net-red);
    color: white;
    font-size: 1.25rem;
    font-weight: 900;
    padding: 1rem 3rem;
    border-radius: 50px;
    transition: all 0.2s;
  }

  .tv-search-btn:hover,
  .tv-search-btn:focus-visible {
    transform: scale(1.1);
    background: white;
    color: black;
  }

  .tv-spinner {
    width: 60px;
    height: 60px;
    border: 6px solid rgba(255,255,255,0.1);
    border-top-color: var(--net-red);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .row-loading {
    display: flex;
    justify-content: center;
    padding: 4rem;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 3rem;
    padding-bottom: 10rem;
  }

  .no-results, .search-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 40vh;
    color: var(--net-text-muted);
    text-align: center;
  }

  .no-results p, .search-placeholder p {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: white;
  }

  .no-results span {
    font-size: 1.25rem;
  }

  .result-item:focus-within {
    transform: scale(1.1);
    z-index: 10;
  }
</style>
