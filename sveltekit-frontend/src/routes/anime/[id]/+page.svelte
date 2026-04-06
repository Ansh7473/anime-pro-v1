<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import Row from "$lib/components/Row.svelte";
  import { onMount } from "svelte";

  let anime: any = $state(null);
  let characters: any[] = $state([]);
  let recommendations: any[] = $state([]);
  let loading = $state(true);
  let inWatchlist = $state(false);
  let isFavorite = $state(false);
  let watchlistStatus = $state("");
  let processingWatchlist = $state(false);
  let processingFavorite = $state(false);

  let { data } = $props();
  // Use a derived state for ID to ensure total reactivity across navigations
  const id = $derived(data.id);

  onMount(async () => {
    try {
      const res = await api.getAnime(id);
      anime = res;

      // Check watchlist and favorite status if logged in
      if ($auth.token) {
        Promise.all([
          api.getWatchlistStatus(
            $auth.token,
            id.toString(),
            $auth.currentProfile?.id,
          ),
          api.getFavoriteStatus(
            $auth.token,
            id.toString(),
            $auth.currentProfile?.id,
          ),
        ]).then(([wl, fav]) => {
          inWatchlist = wl.inWatchlist;
          watchlistStatus = wl.status;
          isFavorite = fav.isFavorite;
        });
      }

      // Parallel fetch
      const [chars, recs] = await Promise.all([
        api.getCharacters(id),
        api.getRecommendations(id),
      ]);
      characters = chars;
      recommendations = recs;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function toggleWatchlist() {
    if (!$auth.token) {
      alert("Please login to use the watchlist!");
      return;
    }

    processingWatchlist = true;
    try {
      if (inWatchlist) {
        await api.removeFromWatchlist(
          $auth.token,
          id.toString(),
          $auth.currentProfile?.id,
        );
        inWatchlist = false;
        watchlistStatus = "";
      } else {
        await api.addToWatchlist($auth.token, {
          animeId: id.toString(),
          animeTitle: anime.title,
          animePoster: anime.poster || anime.image,
          profileId: $auth.currentProfile?.id,
          status: "PLANNING",
        });
        inWatchlist = true;
        watchlistStatus = "PLANNING";
      }
    } catch (e) {
      console.error("Watchlist toggle error:", e);
    } finally {
      processingWatchlist = false;
    }
  }

  async function toggleFavorite() {
    if (!$auth.token) {
      alert("Please login to save favorites!");
      return;
    }

    processingFavorite = true;
    try {
      if (isFavorite) {
        await api.removeFromFavorites(
          $auth.token,
          id.toString(),
          $auth.currentProfile?.id,
        );
        isFavorite = false;
      } else {
        await api.addToFavorites($auth.token, {
          animeId: id.toString(),
          animeTitle: anime.title,
          animePoster: anime.poster || anime.image,
          profileId: $auth.currentProfile?.id,
        });
        isFavorite = true;
      }
    } catch (e) {
      console.error("Favorite toggle error:", e);
    } finally {
      processingFavorite = false;
    }
  }
</script>

<svelte:head>
  <title>{anime?.title || "Anime Details"} — AnimePro</title>
</svelte:head>

{#if loading}
  <div class="center"><div class="spinner"></div></div>
{:else if anime}
  <!-- Banner -->
  <div
    class="detail-banner"
    style="background-image: url({anime.bannerImage || anime.image});"
  >
    <div class="banner-gradient"></div>
  </div>

  <div class="detail-content container">
    <div class="detail-grid">
      <!-- Poster -->
      <div class="detail-poster">
        <img src={anime.poster || anime.image} alt={anime.title} />
      </div>

      <!-- Info -->
      <div class="detail-info">
        <h1 class="detail-title">{anime.title}</h1>
        {#if anime.title_japanese}
          <p class="detail-jp">{anime.title_japanese}</p>
        {/if}

        <div class="detail-meta">
          {#if anime.score > 0}<span class="meta-tag"
              >⭐ {anime.score.toFixed(1)}</span
            >{/if}
          {#if anime.type}<span class="meta-tag">{anime.type}</span>{/if}
          {#if anime.episodes}<span class="meta-tag">{anime.episodes} eps</span
            >{/if}
          {#if anime.status}<span class="meta-tag">{anime.status}</span>{/if}
          {#if anime.year && anime.year !== "N/A"}<span class="meta-tag"
              >{anime.year}</span
            >{/if}
        </div>

        {#if anime.genres?.length > 0}
          <div class="detail-genres">
            {#each anime.genres as g}
              <span class="genre-chip"
                >{typeof g === "string" ? g : g.name}</span
              >
            {/each}
          </div>
        {/if}

        <p class="detail-synopsis">
          {anime.synopsis || "No description available."}
        </p>

        <div class="detail-actions">
          <a href="/watch/{id}/1" class="btn-primary">▶ Watch Episode 1</a>
          <button
            class="btn-watchlist"
            class:active={inWatchlist}
            disabled={processingWatchlist}
            onclick={toggleWatchlist}
          >
            {#if processingWatchlist}
              <span class="spinner-small"></span>
            {:else}
              <span class="icon">{inWatchlist ? "✓" : "+"}</span>
              {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
            {/if}
          </button>

          <button
            class="btn-favorite"
            class:active={isFavorite}
            disabled={processingFavorite}
            onclick={toggleFavorite}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            {#if processingFavorite}
              <span class="spinner-small"></span>
            {:else}
              <span class="icon">{isFavorite ? "❤️" : "🤍"}</span>
            {/if}
          </button>
        </div>

        {#if anime.studios?.length > 0}
          <p class="detail-studios">Studios: {anime.studios.join(", ")}</p>
        {/if}
      </div>
    </div>

    <!-- Characters -->
    {#if characters.length > 0}
      <section class="section">
        <h2 class="section-title">Characters</h2>
        <div class="chars-grid">
          {#each characters.slice(0, 12) as c}
            <div class="char-card">
              <img
                src={c.character?.images?.jpg?.image_url || ""}
                alt={c.character?.name || ""}
              />
              <p class="char-name">{c.character?.name || "Unknown"}</p>
              <p class="char-role">{c.role}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Relations -->
    {#if anime.relations?.length > 0}
      <Row title="Related Seasons & Prequels" items={anime.relations} />
    {/if}

    <!-- Recommendations -->
    {#if recommendations.length > 0}
      <Row title="You Might Also Like" items={recommendations} />
    {/if}
  </div>
{/if}

<style>
  .center {
    display: flex;
    justify-content: center;
    padding: 8rem 0;
  }
  .detail-banner {
    position: relative;
    width: 100%;
    height: 45vh;
    background-size: cover;
    background-position: center;
  }
  .banner-gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      var(--net-bg) 0%,
      rgba(10, 10, 10, 0.4) 50%,
      rgba(10, 10, 10, 0.2) 100%
    );
  }
  .detail-content {
    margin-top: -8rem;
    position: relative;
    z-index: 2;
  }
  .detail-grid {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 2rem;
  }
  .detail-poster img {
    width: 100%;
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }
  .detail-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .detail-jp {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    margin-top: 0.25rem;
  }
  .detail-meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }
  .meta-tag {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: var(--net-text-muted);
  }
  .detail-genres {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }
  .genre-chip {
    background: rgba(229, 9, 20, 0.2);
    color: var(--net-red);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .detail-synopsis {
    color: var(--net-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin-top: 1rem;
    max-width: 700px;
  }
  .detail-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.75rem;
  }
  .detail-studios {
    color: var(--net-text-muted);
    font-size: 0.85rem;
    margin-top: 1rem;
  }
  .section {
    margin-top: 3rem;
  }
  .section-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 1rem;
  }
  .char-card {
    text-align: center;
  }
  .char-card img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--net-card-bg);
  }
  .char-name {
    font-size: 0.8rem;
    font-weight: 500;
    margin-top: 0.4rem;
  }
  .char-role {
    font-size: 0.7rem;
    color: var(--net-text-muted);
  }

  @media (max-width: 1024px) {
    .detail-grid {
      grid-template-columns: 180px 1fr;
      gap: 1.5rem;
    }
    .detail-title {
      font-size: 1.8rem;
    }
    .detail-banner {
      height: 40vh;
    }
    .detail-content {
      margin-top: -6rem;
    }
  }

  @media (max-width: 768px) {
    .detail-grid {
      grid-template-columns: 140px 1fr;
      gap: 1rem;
    }
    .detail-title {
      font-size: 1.4rem;
    }
    .detail-banner {
      height: 35vh;
    }
    .detail-content {
      margin-top: -5rem;
    }
    .detail-actions {
      flex-wrap: wrap;
    }
    .btn-watchlist,
    .btn-favorite {
      flex: 1;
      min-width: 140px;
      justify-content: center;
    }
    .chars-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 0.75rem;
    }
    .char-card img {
      width: 60px;
      height: 60px;
    }
    .char-name {
      font-size: 0.75rem;
    }
    .char-role {
      font-size: 0.65rem;
    }
  }

  @media (max-width: 480px) {
    .center {
      padding: 4rem 0;
    }
    .detail-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .detail-poster {
      max-width: 200px;
      margin: 0 auto;
    }
    .detail-title {
      font-size: 1.25rem;
    }
    .detail-jp {
      font-size: 0.85rem;
    }
    .detail-banner {
      height: 30vh;
    }
    .detail-content {
      margin-top: -4rem;
    }
    .detail-meta {
      gap: 0.4rem;
    }
    .meta-tag {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
    }
    .detail-genres {
      gap: 0.3rem;
    }
    .genre-chip {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
    }
    .detail-synopsis {
      font-size: 0.9rem;
      max-width: 100%;
    }
    .detail-actions {
      flex-direction: column;
      width: 100%;
    }
    .btn-watchlist,
    .btn-favorite {
      width: 100%;
    }
    .section {
      margin-top: 2rem;
    }
    .section-title {
      font-size: 1.1rem;
    }
    .chars-grid {
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
      gap: 0.5rem;
    }
    .char-card img {
      width: 50px;
      height: 50px;
    }
    .char-name {
      font-size: 0.7rem;
    }
    .char-role {
      font-size: 0.6rem;
    }
  }

  .btn-watchlist,
  .btn-favorite {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-watchlist:hover:not(:disabled),
  .btn-favorite:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: white;
  }
  .btn-watchlist.active {
    background: rgba(229, 9, 20, 0.1);
    color: var(--net-red);
    border-color: rgba(229, 9, 20, 0.3);
  }
  .btn-favorite.active {
    background: rgba(255, 50, 50, 0.1);
    color: #ff3e3e;
    border-color: rgba(255, 50, 50, 0.3);
  }

  .btn-watchlist:disabled,
  .btn-favorite:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn-watchlist .icon,
  .btn-favorite .icon {
    font-size: 1.1rem;
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
