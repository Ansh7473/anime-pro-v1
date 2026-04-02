<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import AnimeCard from "$lib/components/AnimeCard.svelte";

  let watchlist: any[] = $state([]);
  let loading = $state(true);
  let error = $state("");

  onMount(async () => {
    if (!$auth.token) {
      goto("/auth/login?redirect=/watchlist");
      return;
    }

    try {
      const res = await api.getWatchlist($auth.token);
      watchlist = Array.isArray(res) ? res : res.data || [];
    } catch (e: any) {
      error = e.message || "Failed to load watchlist";
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function handleRemove(animeId: string) {
    if (!$auth.token) return;
    try {
      await api.removeFromWatchlist($auth.token, animeId);
      watchlist = watchlist.filter((item) => item.animeId !== animeId);
    } catch (e) {
      console.error(e);
    }
  }
</script>

<svelte:head>
  <title>My Watchlist — AnimePro</title>
</svelte:head>

<div class="watchlist-page container">
  <div class="page-header">
    <h1 class="page-title">My <span class="accent">Watchlist</span></h1>
    <p class="page-subtitle">Track your favorite anime series and movies.</p>
  </div>

  {#if loading}
    <div class="center">
      <div class="spinner"></div>
    </div>
  {:else if error}
    <div class="error-state glass">
      <p>{error}</p>
      <button class="btn-primary" onclick={() => window.location.reload()}
        >Retry</button
      >
    </div>
  {:else if watchlist.length === 0}
    <div class="empty-state glass">
      <div class="empty-icon">📂</div>
      <h2>Your watchlist is empty</h2>
      <p>Start adding anime to keep track of what you want to watch!</p>
      <a href="/" class="btn-primary">Browse Anime</a>
    </div>
  {:else}
    <div class="watchlist-grid">
      {#each watchlist as item}
        <div class="watchlist-item">
          <!-- Build a mock anime object for AnimeCard since we saved the title and poster -->
          <AnimeCard
            anime={{
              id: item.animeId,
              title: item.animeTitle,
              poster: item.animePoster,
              status: item.status,
            }}
          />
          <div class="item-actions">
            <button
              class="btn-remove"
              onclick={() => handleRemove(item.animeId)}
            >
              <span>✕</span> Remove
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .watchlist-page {
    padding: 2rem 0 6rem;
  }
  .page-header {
    margin-bottom: 3rem;
  }
  .page-title {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
  }
  .page-title .accent {
    color: var(--net-red);
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 1rem;
  }

  .watchlist-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 2rem;
  }

  .watchlist-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-actions {
    display: flex;
    justify-content: center;
  }

  .btn-remove {
    background: rgba(229, 9, 20, 0.1);
    color: #f87171;
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }

  .btn-remove:hover {
    background: var(--net-red);
    color: white;
    border-color: var(--net-red);
  }

  .center {
    display: flex;
    justify-content: center;
    padding: 4rem 0;
  }

  .empty-state,
  .error-state {
    text-align: center;
    padding: 4rem 2rem;
    border-radius: var(--radius-xl);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  .empty-state h2 {
    margin-bottom: 0.5rem;
    color: white;
  }
  .empty-state p {
    color: var(--net-text-muted);
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    .watchlist-page {
      padding: 1.5rem 0 5rem;
    }
    .page-header {
      margin-bottom: 2rem;
    }
    .page-title {
      font-size: 2rem;
    }
    .page-subtitle {
      font-size: 0.95rem;
    }
    .watchlist-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 1.5rem;
    }
    .btn-remove {
      padding: 0.35rem 0.7rem;
      font-size: 0.7rem;
    }
    .empty-state,
    .error-state {
      padding: 3rem 1.5rem;
    }
    .empty-icon {
      font-size: 2.5rem;
    }
    .center {
      padding: 3rem 0;
    }
  }

  @media (max-width: 480px) {
    .watchlist-page {
      padding: 1rem 0 4rem;
    }
    .page-header {
      margin-bottom: 1.5rem;
    }
    .page-title {
      font-size: 1.6rem;
    }
    .page-subtitle {
      font-size: 0.9rem;
    }
    .watchlist-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 1rem;
    }
    .btn-remove {
      padding: 0.3rem 0.6rem;
      font-size: 0.65rem;
    }
    .empty-state,
    .error-state {
      padding: 2rem 1rem;
    }
    .empty-icon {
      font-size: 2rem;
    }
    .empty-state h2 {
      font-size: 1.2rem;
    }
    .center {
      padding: 2rem 0;
    }
  }

  @media (max-width: 360px) {
    .page-title {
      font-size: 1.4rem;
    }
    .watchlist-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.8rem;
    }
    .btn-remove {
      padding: 0.25rem 0.5rem;
      font-size: 0.6rem;
    }
  }
</style>
