<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import Row from "$lib/components/Row.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import SkeletonHero from "$lib/components/SkeletonHero.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import HomeMarketing from "$lib/components/HomeMarketing.svelte";

  let { data } = $props();

  // Personalized data is fetched on the client only (depends on auth).
  let continueWatching: any[] = $state([]);

  // Reactive refetch for profile-specific data
  $effect(() => {
    if ($auth.token && $auth.currentProfile?.id) {
      fetchUserContent();
    } else {
      continueWatching = [];
    }
  });

  async function fetchUserContent() {
    try {
      const history = await api
        .getHistory($auth.token!, $auth.currentProfile?.id)
        .catch(() => []);

      if (history && Array.isArray(history)) {
        // Group by animeId and keep the most recently watched episode of each anime
        const uniqueHistoryMap = new Map();
        for (const item of history) {
          if (!item.animeId) continue;
          const existing = uniqueHistoryMap.get(item.animeId);
          if (
            !existing ||
            new Date(item.lastWatchedAt) > new Date(existing.lastWatchedAt)
          ) {
            uniqueHistoryMap.set(item.animeId, item);
          }
        }

        continueWatching = Array.from(uniqueHistoryMap.values())
          .slice(0, 15)
          .map((h: any) => ({
            id: h.animeId,
            title: h.animeTitle,
            poster: h.animePoster,
            episode: h.episodeNumber,
            progress: h.progress,
            duration: h.duration,
            completed: h.completed,
          }));
      }
    } catch (e) {
      console.error("Failed to fetch user context:", e);
    }
  }
</script>

<svelte:head>
  <title>WatchAnimez — Watch Online Anime in Hindi, English, Multi-lang, Japanese for Free | 50+ Sources of Streaming | Leading Website</title>
  <meta
    name="description"
    content="Discover trending, popular, top-rated, seasonal, action, romance, and movie anime on WatchAnimez."
  />
  <meta property="og:title" content="WatchAnimez — Watch Online Anime in Hindi, English, Multi-lang, Japanese for Free" />
  <meta
    property="og:description"
    content="Discover trending, popular, top-rated, seasonal, action, romance, and movie anime on WatchAnimez."
  />
</svelte:head>

{#await data.homeData}
  <!-- Instant shell: skeletons stream first, real content swaps in when the
       backend responds. This is what makes first paint feel instant. -->
  <SkeletonHero />
  <div class="home-rows">
    {#each Array(6) as _, i (i)}
      <SkeletonRow />
    {/each}
  </div>
{:then homeData}
  <!-- Hero Slider Carousel — pass top trending as items -->
  <HeroBanner items={homeData?.trending || homeData?.popular || []} />

  <div class="home-rows">
    <!-- Recent Watches (logged in + has history) -->
    {#if continueWatching.length > 0}
      <section class="row-section continue-section">
        <div class="row-header">
          <h2 class="row-title">📺 Recent Watches</h2>
          <a href="/favorites" class="view-all">View All</a>
        </div>
        <div class="continue-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    <Row title="🔥 Trending Now" items={homeData?.trending || []} href="/explore/trending" />
    <Row title="⭐ Most Popular" items={homeData?.popular || []} href="/explore/popular" />
    <Row title="🏆 Top Rated" items={homeData?.topRated || []} href="/explore/highest-rated" />
    <Row title="⚔️ Action Masters" items={homeData?.action || []} href="/explore/action" />
    <Row title="💕 Romance & Slice of Life" items={homeData?.romance || []} href="/explore/romance" />
    <Row title="🎬 Top Movies" items={homeData?.movies || []} href="/explore/movies" />
  </div>
{:catch}
  <div class="loading-screen">
    <p>Failed to load. Please try refreshing.</p>
  </div>
{/await}

<!-- Static, below-the-fold marketing + SEO content (own code-split chunk).
     Rendered outside {#await} so it is always in the SSR HTML for crawlers. -->
<HomeMarketing />

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 1rem;
    color: var(--net-text-muted);
  }

  .home-rows {
    margin-top: -1rem;
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

  @media (max-width: 768px) {
    .home-rows {
      margin-top: 0;
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

  @media (max-width: 480px) {
    .home-rows {
      margin-top: 0.5rem;
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
</style>
