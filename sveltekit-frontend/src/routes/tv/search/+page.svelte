<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import TVAnimeCard from "$lib/components/tv/TVAnimeCard.svelte";
  import SkeletonGrid from "$lib/components/SkeletonGrid.svelte";
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
      <div class="results-grid">
        <SkeletonGrid count={12} />
      </div>
    {:else if results.length > 0}
      <div class="results-grid">
        {#each results as anime}
          <div class="result-item">
            <TVAnimeCard {anime} />
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
        <p>Type to search the anime catalog</p>
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
    margin-left: 4rem;
    margin-right: 4rem;
  }

  .search-input-container:focus-within {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--net-red);
    box-shadow: 0 0 50px rgba(255, 138, 61, 0.22);
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
    z-index: 10;
  }
  .search-input-container{margin-inline:0;padding:1.25rem 1.5rem;border-radius:4px;background:#0d0c0b;border-color:#332c27}.search-input-container:focus-within{background:#151210;border-color:#df886b;box-shadow:none;transform:none}.tv-search-input{color:#f1ece4}.tv-search-btn{border-radius:3px;background:#df886b;color:#170c09}.tv-search-btn:hover,.tv-search-btn:focus-visible{transform:none;background:#f1a287;color:#170c09;outline:4px solid #f1a287;outline-offset:4px}.results-grid{gap:2rem 1.5rem}.result-item:focus-within{transform:none}
</style>
