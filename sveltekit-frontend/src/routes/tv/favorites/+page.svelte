<script lang="ts">
  import { auth } from "$lib/stores/auth";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { Heart } from 'lucide-svelte';
  import { fly } from 'svelte/transition';

  // In a real app, you'd fetch favorites from the API
  // Using a derived state or store for now
  let favorites = $derived($auth.user?.favorites || []);
</script>

<div class="tv-favorites-page" in:fly={{ y: 20, duration: 500 }}>
  <header class="section-header">
    <Heart size={40} fill="var(--net-red)" class="text-red-500" />
    <h1>My Favorites</h1>
  </header>

  {#if favorites.length > 0}
    <div class="results-grid">
      {#each favorites as anime}
        <div class="result-item">
          <AnimeCard {anime} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon glass">
        <Heart size={80} />
      </div>
      <h2>Your list is empty</h2>
      <p>Items you add to your favorites will appear here for quick access.</p>
      <a href="/tv" class="tv-btn primary">START BROWSING</a>
    </div>
  {/if}
</div>

<style>
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
