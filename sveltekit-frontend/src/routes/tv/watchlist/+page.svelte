<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import TVAnimeCard from "$lib/components/tv/TVAnimeCard.svelte";
  import { Clock } from 'lucide-svelte';
  import { fly } from 'svelte/transition';
  import { onMount } from "svelte";

  let watchlist = $state<any[]>([]);
  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    if (!$auth.token) {
        loading = false;
        return;
    }

    try {
        // Assuming there's a getWatchlist or similar, if not we'll handle gracefully
        const res = await api.getWatchlist($auth.token);
        watchlist = Array.isArray(res) ? res : res.data || [];
    } catch (e: any) {
        error = e.message;
        console.error(e);
    } finally {
        loading = false;
    }
  });
</script>

<div class="tv-watchlist-page" in:fly={{ y: 20, duration: 500 }}>
  <header class="section-header">
    <Clock size={40} class="text-white" />
    <h1>Watchlist</h1>
  </header>

  {#if loading}
    <div class="row-loading">
        <div class="tv-spinner"></div>
    </div>
  {:else if watchlist.length > 0}
    <div class="results-grid">
      {#each watchlist as item}
        <div class="result-item">
          <TVAnimeCard anime={{
                id: item.animeId,
                title: item.animeTitle,
                poster: item.animePoster,
            }} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon glass">
        <Clock size={80} />
      </div>
      <h2>Your Watchlist is empty</h2>
      <p>Keep track of anime you want to watch. Your progress on current series will also appear here.</p>
      <a href="/tv" class="tv-btn primary">DISCOVER SOMETHING</a>
    </div>
  {/if}
</div>

<style>
  .row-loading {
    display: flex;
    justify-content: center;
    padding: 4rem;
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
  .section-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 4rem;
  }

  .section-header h1 {
    font-size: 3.5rem;
    font-weight: 900;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 3rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    text-align: center;
    gap: 1.5rem;
  }

  .empty-icon {
    width: 150px;
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    margin-bottom: 2rem;
    color: rgba(255,255,255,0.1);
  }

  .empty-state h2 {
    font-size: 2.5rem;
    font-weight: 800;
  }

  .empty-state p {
    font-size: 1.2rem;
    color: var(--net-text-muted);
    max-width: 500px;
  }

  .tv-btn {
    margin-top: 2rem;
    padding: 1.2rem 3rem;
    background: white;
    color: black;
    border-radius: 100px;
    font-weight: 800;
    text-decoration: none;
    transition: all 0.2s;
  }

  .tv-btn:hover, .tv-btn:focus-visible {
    background: var(--net-red);
    color: white;
    transform: scale(1.1);
  }

  .result-item:focus-within {
    transform: scale(1.1);
    z-index: 10;
  }
</style>
