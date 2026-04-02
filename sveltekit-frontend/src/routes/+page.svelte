<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import Row from "$lib/components/Row.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import { onMount } from "svelte";

  let homeData: any = $state(null);
  let loading = $state(true);
  let continueWatching: any[] = $state([]);
  let favorites: any[] = $state([]);

  onMount(async () => {
    try {
      const data = await api.getHome();
      if (!data) throw new Error("No data received");
      homeData = data;
    } catch (e) {
      console.error("Failed to load home data:", e);
      homeData = { trending: [], popular: [], topRated: [] };
    } finally {
      loading = false;
    }
  });

  // Reactive refetch for profile-specific data
  $effect(() => {
    if ($auth.token && $auth.currentProfile?.id) {
      fetchUserContent();
    } else {
      continueWatching = [];
      favorites = [];
    }
  });

  async function fetchUserContent() {
    try {
      const [history, favs] = await Promise.all([
        api.getHistory($auth.token!, $auth.currentProfile?.id).catch(() => []),
        api
          .getFavorites($auth.token!, $auth.currentProfile?.id)
          .catch(() => []),
      ]);

      if (history && Array.isArray(history)) {
        continueWatching = history
          .filter((h: any) => !h.completed)
          .slice(0, 15)
          .map((h: any) => ({
            id: h.animeId,
            title: h.animeTitle,
            poster: h.animePoster,
            episode: h.episodeNumber,
            progress: h.progress,
            duration: h.duration,
          }));
      }

      if (favs && Array.isArray(favs)) {
        favorites = favs.map((f: any) => ({
          id: f.animeId,
          title: f.animeTitle,
          poster: f.animePoster,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch user context:", e);
    }
  }
</script>

<svelte:head>
  <title>AnimePro — Your Premium Anime Destination</title>
  <meta
    name="description"
    content="Discover trending, popular, and top-rated anime all in one place."
  />
</svelte:head>

{#if loading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="spinner-ring">
        <div class="ring"></div>
        <span class="logo-mini">AP</span>
      </div>
      <p>Loading your anime...</p>
    </div>
  </div>
{:else if homeData}
  <!-- Hero Slider Carousel — pass top trending as items -->
  <HeroBanner items={homeData.trending || homeData.popular || []} />

  <div class="home-rows">
    <!-- Continue Watching (logged in + has history) -->
    {#if continueWatching.length > 0}
      <section class="row-section continue-section">
        <div class="row-header">
          <h2 class="row-title">📺 Continue Watching</h2>
          <a href="/history" class="view-all">View All</a>
        </div>
        <div class="continue-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    <!-- My Favorites -->
    {#if favorites.length > 0}
      <Row title="❤️ My Favorites" items={favorites} />
    {/if}

    <Row
      title="🔥 Trending Now"
      items={homeData.trending || []}
      href="/explore/trending"
    />
    <Row
      title="⭐ Most Popular"
      items={homeData.popular || []}
      href="/explore/popular"
    />
    <Row
      title="🏆 Top Rated"
      items={homeData.topRated || []}
      href="/explore/highest-rated"
    />
    <Row
      title="⚔️ Action Masters"
      items={homeData.action || []}
      href="/explore/action"
    />
    <Row
      title="💕 Romance & Slice of Life"
      items={homeData.romance || []}
      href="/explore/romance"
    />
    <Row
      title="🎬 Top Movies"
      items={homeData.movies || []}
      href="/explore/movies"
    />
  </div>
{:else}
  <div class="loading-screen">
    <p>Failed to load. Please try refreshing.</p>
  </div>
{/if}

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    gap: 1rem;
    color: var(--net-text-muted);
  }
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  /* Animated spinner */
  .spinner-ring {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring {
    position: absolute;
    inset: 0;
    border: 3px solid rgba(255, 255, 255, 0.05);
    border-top: 3px solid var(--net-red);
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .logo-mini {
    font-weight: 800;
    font-size: 1.1rem;
    color: var(--net-red);
    letter-spacing: -0.05em;
  }

  .home-rows {
    margin-top: -3rem;
    position: relative;
    z-index: 3;
  }

  /* Continue Watching section */
  .continue-section {
    margin-bottom: 2rem;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 0.75rem;
  }
  .row-title {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .view-all {
    font-size: 0.85rem;
    color: var(--net-red);
    font-weight: 600;
    text-decoration: none;
    opacity: 0.8;
    transition: 0.2s;
  }
  .view-all:hover {
    opacity: 1;
    transform: translateX(3px);
  }

  .continue-scroll {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding: 0.5rem 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
  }
  .continue-scroll::-webkit-scrollbar {
    display: none;
  }

  /* Tablet responsive */
  @media (max-width: 768px) {
    .loading-screen {
      min-height: 70vh;
    }
    .spinner-ring {
      width: 56px;
      height: 56px;
    }
    .logo-mini {
      font-size: 1rem;
    }
    .home-rows {
      margin-top: -2rem;
    }
    .continue-section {
      margin-bottom: 1.5rem;
    }
    .row-header {
      padding: 0 0.75rem;
      margin-bottom: 0.6rem;
    }
    .row-title {
      font-size: 1.15rem;
    }
    .view-all {
      font-size: 0.8rem;
    }
    .continue-scroll {
      gap: 0.85rem;
      padding: 0.4rem 0.75rem;
    }
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .loading-screen {
      min-height: 60vh;
    }
    .spinner-ring {
      width: 48px;
      height: 48px;
    }
    .logo-mini {
      font-size: 0.9rem;
    }
    .home-rows {
      margin-top: -1.5rem;
    }
    .continue-section {
      margin-bottom: 1.25rem;
    }
    .row-header {
      padding: 0 0.5rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1rem;
    }
    .view-all {
      font-size: 0.75rem;
    }
    .continue-scroll {
      gap: 0.75rem;
      padding: 0.3rem 0.5rem;
    }
  }

  /* Small mobile responsive */
  @media (max-width: 360px) {
    .loading-screen {
      min-height: 50vh;
    }
    .spinner-ring {
      width: 40px;
      height: 40px;
    }
    .logo-mini {
      font-size: 0.85rem;
    }
    .home-rows {
      margin-top: -1rem;
    }
    .row-title {
      font-size: 0.95rem;
    }
    .continue-scroll {
      gap: 0.6rem;
      padding: 0.25rem 0.4rem;
    }
  }
</style>
