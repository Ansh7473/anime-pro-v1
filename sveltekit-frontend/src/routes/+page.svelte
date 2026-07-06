<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import Row from "$lib/components/Row.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import SkeletonHero from "$lib/components/SkeletonHero.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import HomeMarketing from "$lib/components/HomeMarketing.svelte";
  import AiringSchedule from "$lib/components/AiringSchedule.svelte";
  import { rankByPreference } from "$lib/knnRecommend";

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

  // --- Extra discovery sections (client-loaded, below the main rows) ---
  const GENRES = [
    { label: "Action", slug: "action" },
    { label: "Adventure", slug: "adventure" },
    { label: "Comedy", slug: "comedy" },
    { label: "Drama", slug: "drama" },
    { label: "Fantasy", slug: "fantasy" },
    { label: "Romance", slug: "romance" },
    { label: "Sci-Fi", slug: "sci-fi" },
    { label: "Slice of Life", slug: "slice-of-life" },
    { label: "Supernatural", slug: "supernatural" },
    { label: "Mystery", slug: "mystery" },
    { label: "Horror", slug: "horror" },
    { label: "Sports", slug: "sports" },
    { label: "Mecha", slug: "mecha" },
    { label: "Music", slug: "music" },
  ];

  let extraSections = $state<{ title: string; href: string; items: any[] }[]>([]);
  let extraLoading = $state(true);

  onMount(async () => {
    const defs = [
      { title: "🆕 New This Season", href: "/explore/seasonal", fn: () => api.getCurrentSeasonal(1, 20) },
      { title: "🚀 Upcoming Anime", href: "/explore/upcoming", fn: () => api.getUpcoming(1, 20) },
    ];
    const results = await Promise.all(
      defs.map(async (d) => {
        try {
          const r: any = await d.fn();
          const items = r?.data || r?.results || (Array.isArray(r) ? r : []);
          return { title: d.title, href: d.href, items };
        } catch {
          return { title: d.title, href: d.href, items: [] };
        }
      }),
    );
    extraSections = results.filter((s) => s.items.length > 0);
    extraLoading = false;
  });
</script>

<svelte:head>
  <title>WatchAnimez — Free Anime Streaming in Hindi, English & Japanese</title>
  <meta
    name="description"
    content="Stream trending, popular, and top-rated anime for free on WatchAnimez. Watch subbed and dubbed series, movies, and seasonal hits in Hindi, English, and Japanese."
  />
  <meta property="og:title" content="WatchAnimez — Free Anime Streaming in Hindi, English & Japanese" />
  <meta
    property="og:description"
    content="Stream trending, popular, and top-rated anime for free on WatchAnimez. Watch subbed and dubbed series, movies, and seasonal hits in Hindi, English, and Japanese."
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
          <div class="row-title-group">
            <span class="accent-bar"></span>
            <h2 class="row-title">Continue Watching</h2>
          </div>
          <a href="/favorites" class="view-all">View All</a>
        </div>
        <div class="continue-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    {#if continueWatching.length > 0 && (homeData?.popular?.length || homeData?.trending?.length)}
      <Row title="🎯 Recommended For You" items={rankByPreference([...(homeData?.popular || []), ...(homeData?.trending || [])], continueWatching.map((w) => w.anime || w))} />
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

<!-- More discovery sections (client-loaded so they never block first paint) -->
<div class="home-rows extra-rows">
  {#if extraLoading}
    {#each Array(2) as _, i (i)}
      <SkeletonRow />
    {/each}
  {:else}
    {#each extraSections as s (s.title)}
      <Row title={s.title} items={s.items} href={s.href} />
    {/each}
  {/if}

  <!-- Estimated Airing Schedule (miruro-style) -->
  <AiringSchedule />

  <div class="genre-header-gif">
    <img src="https://media.giphy.com/media/v38BvJSInBpII/giphy.gif" alt="Epic anime moment" loading="lazy" />
  </div>

  <!-- Browse by Genre -->
  <section class="genre-section">
    <div class="row-header">
      <h2 class="row-title">🎯 Browse by Genre</h2>
      <a href="/explore" class="view-all">Explore All</a>
    </div>
    <div class="genre-grid">
      {#each GENRES as g}
        <a class="genre-chip" href={`/explore/${g.slug}`}>{g.label}</a>
      {/each}
    </div>
  </section>
</div>

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

  .genre-header-gif {
    display: flex;
    justify-content: center;
    margin-top: 3rem;
  }
  .genre-header-gif img {
    width: 100%;
    max-width: 800px;
    height: 150px;
    object-fit: cover;
    border-radius: 16px;
    mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    opacity: 0.6;
  }

  .extra-rows {
    margin-top: 0;
  }

  /* Browse by Genre */
  .genre-section {
    padding: 0.5rem 1rem 0;
    margin-top: 1rem;
  }
  .genre-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.6rem;
    padding: 0.5rem 0 0;
  }
  .genre-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    background: var(--net-card-bg, #181818);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--net-text, #fff);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  }
  .genre-chip:hover {
    background: var(--net-red, #e50914);
    border-color: var(--net-red, #e50914);
    transform: translateY(-2px);
  }
  @media (max-width: 768px) {
    .genre-section {
      padding: 0.5rem 0.75rem 0;
    }
    .genre-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 0.5rem;
    }
    .genre-chip {
      padding: 0.7rem 0.75rem;
      font-size: 0.82rem;
    }
  }
  @media (max-width: 480px) {
    .genre-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .genre-chip {
      padding: 0.6rem 0.4rem;
      font-size: 0.78rem;
    }
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
    margin-bottom: 0.6rem;
  }
  .row-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .accent-bar {
    width: 4px;
    height: 18px;
    background: white;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .row-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    letter-spacing: 0.01em;
  }
  .view-all {
    font-size: 0.82rem;
    color: #a3a3a3;
    font-weight: 500;
    text-decoration: none;
    transition: color 0.2s;
  }
  .view-all:hover {
    color: white;
  }

  .continue-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0.4rem 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
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
      font-size: 1rem;
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
