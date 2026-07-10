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

  let { data } = $props();

  // Personalized data is fetched on the client only (depends on auth).
  let continueWatching: any[] = $state([]);

  // Hero banner: one random pick from each of 3 categories, shuffled per session.
  // Categories: New This Season, Romance & Slice of Life, Top Movies.
  let heroItems = $state<any[]>([]);

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
    // Use SSR-provided seasonal data (no client-side API calls)
    const seasonal = await data.seasonal;
    const sections = [seasonal].filter(
      (s: any) => s && s.items && s.items.length > 0,
    );
    extraSections = sections;
    extraLoading = false;

    // Build the random hero: 1 random pick from each of the 3 categories, then shuffle.
    // Math.random() runs client-only here, so every page refresh re-rolls the order.
    try {
      const homeData: any = await Promise.resolve(data.homeData);
      const newThisSeason = seasonal?.items || [];
      const romance = homeData?.romance || [];
      const movies = homeData?.movies || [];

      const pools: any[][] = [newThisSeason, romance, movies].filter(
        (p) => p.length > 0,
      );
      if (pools.length === 0) {
        heroItems = homeData?.trending || homeData?.popular || [];
        return;
      }

      const picks = pools.map((pool) => pool[Math.floor(Math.random() * pool.length)]);

      // Fisher–Yates shuffle so the displayed order is random each session.
      for (let i = picks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [picks[i], picks[j]] = [picks[j], picks[i]];
      }
      heroItems = picks;
    } catch (e) {
      console.warn("Failed to build random hero:", e);
    }
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
  <!-- Hero Slider Carousel — 3 random picks (one per category), shuffled per session -->
  <HeroBanner items={heroItems.length > 0 ? heroItems : (homeData?.trending || homeData?.popular || [])} />

  <!-- Cross-device quick rail: wraps on desktop, equal grid on tablet, scroll only when needed -->
  <nav class="quick-rail" aria-label="Quick links">
    <div class="quick-rail-inner">
      <a class="quick-chip" href="/latest"><span class="qc-dot" aria-hidden="true"></span>Latest</a>
      <a class="quick-chip" href="/schedule"><span class="qc-dot muted" aria-hidden="true"></span>Schedule</a>
      <a class="quick-chip hot" href="/explore/popular"><span class="qc-dot" aria-hidden="true"></span>Popular</a>
      <a class="quick-chip" href="/movies"><span class="qc-dot muted" aria-hidden="true"></span>Movies</a>
      <a class="quick-chip" href="/explore"><span class="qc-dot muted" aria-hidden="true"></span>Browse</a>
    </div>
  </nav>

  <div class="home-rows">
    <!-- Jump back in (logged in + has history) -->
    {#if continueWatching.length > 0}
      <section class="row-section continue-section">
        <div class="row-header">
          <div class="row-title-group">
            <span class="accent-bar"></span>
            <div class="title-stack">
              <span class="row-eyebrow">Pick up where you left off</span>
              <h2 class="row-title">Jump Back In</h2>
            </div>
          </div>
          <a href="/profile" class="view-all" aria-label="Open your profile history">History →</a>
        </div>
        <div class="continue-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Seasonal + Upcoming (client-loaded, slotted high so fresh content is visible early) -->
    {#if extraLoading}
      {#each Array(2) as _, i (i)}
        <SkeletonRow />
      {/each}
    {:else}
      {#each extraSections as s (s.title)}
        <Row title={s.title} items={s.items} href={s.href} eyebrow="Fresh this season" />
      {/each}
    {/if}

    <div class="catalog-band">
      <Row
        title="Most Popular"
        items={homeData?.popular || []}
        href="/explore/popular"
        eyebrow="Trending worldwide"
        showRank={true}
      />
      <Row
        title="Top Rated"
        items={homeData?.topRated || []}
        href="/explore/highest-rated"
        eyebrow="Critically loved"
      />
      <Row
        title="Romance & Slice of Life"
        items={homeData?.romance || []}
        href="/explore/romance"
        eyebrow="Feel-good picks"
      />
      <Row
        title="Top Movies"
        items={homeData?.movies || []}
        href="/explore/movies"
        eyebrow="Cinema night"
      />
    </div>
  </div>
{:catch}
  <div class="loading-screen">
    <p>Failed to load. Please try refreshing.</p>
  </div>
{/await}

<!-- More discovery sections (client-loaded so they never block first paint) -->
<div class="home-rows extra-rows">
  <AiringSchedule />

  <!-- Browse by Genre — mosaic tiles (no cheap gif) -->
  <section class="genre-section">
    <div class="genre-header">
      <div class="genre-title-group">
        <span class="genre-eyebrow">Discover</span>
        <h2 class="genre-title">Browse by Genre</h2>
      </div>
      <a href="/explore" class="genre-explore">Explore all →</a>
    </div>
    <div class="genre-grid">
      {#each GENRES as g, i}
        <a class="genre-chip" href={`/explore/${g.slug}`} data-i={i % 6}>
          <span class="genre-label">{g.label}</span>
          <span class="genre-arrow" aria-hidden="true">→</span>
        </a>
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

  /* ========== Quick rail — equal 5-up grid on every device ==========
     No horizontal scroll, no cut-off chips, safe-area aware. */
  .quick-rail {
    position: relative;
    z-index: 4;
    width: 100%;
    max-width: 100%;
    margin: 0;
    box-sizing: border-box;
    overflow: hidden; /* never page-level X scroll */
    padding:
      0.7rem
      max(0.7rem, env(safe-area-inset-right, 0px))
      0.4rem
      max(0.7rem, env(safe-area-inset-left, 0px));
  }
  .quick-rail-inner {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.4rem;
    width: 100%;
    max-width: 920px;
    margin-inline: auto;
    box-sizing: border-box;
  }
  .quick-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.28rem;
    min-width: 0; /* allow grid shrink */
    width: 100%;
    min-height: 40px;
    padding: 0.35rem 0.25rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.92);
    font-size: clamp(0.62rem, 2.8vw, 0.8rem);
    font-weight: 700;
    line-height: 1.1;
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-sizing: border-box;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      transform 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .quick-chip.hot {
    background: rgba(229, 9, 20, 0.16);
    border-color: rgba(229, 9, 20, 0.45);
  }
  .qc-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--net-red, #e50914);
    box-shadow: 0 0 8px rgba(229, 9, 20, 0.55);
    flex-shrink: 0;
  }
  .qc-dot.muted {
    background: rgba(255, 255, 255, 0.35);
    box-shadow: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .quick-chip:hover {
      background: rgba(229, 9, 20, 0.16);
      border-color: rgba(229, 9, 20, 0.4);
      transform: translateY(-1px);
    }
  }
  .quick-chip:active {
    transform: scale(0.96);
    background: rgba(229, 9, 20, 0.2);
    border-color: rgba(229, 9, 20, 0.5);
  }
  .quick-chip:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  /* Very small phones: hide dots so labels fit */
  @media (max-width: 380px) {
    .quick-rail {
      padding-inline: max(0.5rem, env(safe-area-inset-left, 0px))
        max(0.5rem, env(safe-area-inset-right, 0px));
      padding-block: 0.55rem 0.3rem;
    }
    .quick-rail-inner {
      gap: 0.28rem;
    }
    .quick-chip {
      min-height: 36px;
      padding: 0.28rem 0.15rem;
      font-size: 0.6rem;
      gap: 0;
    }
    .qc-dot {
      display: none;
    }
  }

  @media (min-width: 481px) and (max-width: 768px) {
    .quick-rail-inner {
      gap: 0.45rem;
    }
    .quick-chip {
      min-height: 42px;
      padding: 0.4rem 0.35rem;
      font-size: 0.74rem;
      gap: 0.32rem;
    }
    .qc-dot {
      width: 6px;
      height: 6px;
    }
  }

  @media (min-width: 769px) {
    .quick-rail {
      padding: 0.9rem 1.25rem 0.5rem;
    }
    .quick-rail-inner {
      gap: 0.55rem;
    }
    .quick-chip {
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-size: 0.84rem;
      gap: 0.4rem;
    }
    .qc-dot {
      width: 6px;
      height: 6px;
    }
  }

  @media (orientation: landscape) and (max-height: 500px) {
    .quick-rail {
      padding-top: 0.4rem;
      padding-bottom: 0.2rem;
    }
    .quick-chip {
      min-height: 34px;
      padding-block: 0.25rem;
    }
  }

  .home-rows {
    margin-top: 0.45rem;
    padding: 0 2rem;
    position: relative;
    z-index: 3;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  .catalog-band {
    margin-top: 0.25rem;
  }

  .extra-rows {
    margin-top: 0.25rem;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  /* ========== Genre mosaic ========== */
  .genre-section {
    padding: 1.25rem 1rem 1.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.025) 0%,
      transparent 70%
    );
  }
  .genre-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }
  .genre-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .genre-eyebrow {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(229, 9, 20, 0.95);
  }
  .genre-title {
    margin: 0;
    font-size: 1.18rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    line-height: 1.15;
  }
  .genre-explore {
    flex-shrink: 0;
    font-size: 0.78rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    padding: 0.4rem 0.7rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    white-space: nowrap;
    transition:
      color 0.2s,
      border-color 0.2s,
      background 0.2s;
  }
  .genre-explore:hover {
    color: #fff;
    border-color: rgba(229, 9, 20, 0.4);
    background: rgba(229, 9, 20, 0.12);
  }
  .genre-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 0.55rem;
  }
  .genre-chip {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 48px;
    padding: 0.75rem 0.9rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.09);
    color: #fff;
    font-weight: 700;
    font-size: 0.88rem;
    text-decoration: none;
    overflow: hidden;
    transition:
      transform 0.18s ease,
      background 0.18s ease,
      border-color 0.18s ease,
      box-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .genre-chip::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.55;
    pointer-events: none;
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(229, 9, 20, 0.22),
      transparent 55%
    );
  }
  .genre-chip[data-i="1"]::before {
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(59, 130, 246, 0.2),
      transparent 55%
    );
  }
  .genre-chip[data-i="2"]::before {
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(168, 85, 247, 0.2),
      transparent 55%
    );
  }
  .genre-chip[data-i="3"]::before {
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(34, 197, 94, 0.16),
      transparent 55%
    );
  }
  .genre-chip[data-i="4"]::before {
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(251, 191, 36, 0.16),
      transparent 55%
    );
  }
  .genre-chip[data-i="5"]::before {
    background: radial-gradient(
      120% 100% at 0% 0%,
      rgba(236, 72, 153, 0.18),
      transparent 55%
    );
  }
  .genre-label {
    position: relative;
    z-index: 1;
    letter-spacing: -0.01em;
  }
  .genre-arrow {
    position: relative;
    z-index: 1;
    opacity: 0.45;
    font-size: 0.9rem;
    transition:
      opacity 0.18s,
      transform 0.18s;
  }
  @media (hover: hover) and (pointer: fine) {
    .genre-chip:hover {
      background: rgba(229, 9, 20, 0.16);
      border-color: rgba(229, 9, 20, 0.45);
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
    }
    .genre-chip:hover .genre-arrow {
      opacity: 1;
      transform: translateX(2px);
    }
  }
  .genre-chip:active {
    transform: scale(0.97);
    background: rgba(229, 9, 20, 0.22);
    border-color: rgba(229, 9, 20, 0.5);
  }
  .genre-chip:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  /* Jump Back In */
  .continue-section {
    margin-bottom: 1.85rem;
    padding-top: 0.35rem;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 0.7rem;
    gap: 0.75rem;
  }
  .row-title-group {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }
  .title-stack {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }
  .row-eyebrow {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(229, 9, 20, 0.95);
    line-height: 1.2;
  }
  .accent-bar {
    width: 4px;
    height: 28px;
    background: linear-gradient(180deg, #fff 0%, rgba(229, 9, 20, 0.9) 100%);
    border-radius: 2px;
    flex-shrink: 0;
  }
  .row-title {
    font-size: 1.18rem;
    font-weight: 800;
    color: white;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    line-height: 1.15;
  }
  .view-all {
    font-size: 0.82rem;
    color: #a3a3a3;
    font-weight: 700;
    text-decoration: none;
    transition: color 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
  }
  .view-all:hover {
    color: white;
  }

  .continue-scroll {
    display: flex;
    gap: 0.9rem;
    overflow-x: auto;
    padding: 0.45rem 1rem 0.95rem;
    scroll-padding-inline: 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  .continue-scroll::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    .home-rows {
      margin-top: 0.4rem;
      padding: 0;
    }
    .continue-section {
      margin-bottom: 1.45rem;
      margin-inline: 0;
      padding: 0.85rem 0 0.35rem;
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.03) 0%,
        transparent 100%
      );
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .row-header {
      padding: 0 0.85rem;
      margin-bottom: 0.6rem;
    }
    .row-title {
      font-size: 1.08rem;
    }
    .row-eyebrow {
      font-size: 0.64rem;
    }
    .accent-bar {
      height: 26px;
    }
    .view-all {
      font-size: 0.8rem;
    }
    .continue-scroll {
      gap: 0.75rem;
      padding: 0.35rem 0.85rem 0.85rem;
      scroll-padding-inline: 0.85rem;
    }
    .genre-section {
      padding: 1.1rem 0.85rem 1.35rem;
    }
    .genre-title {
      font-size: 1.08rem;
    }
    .genre-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .genre-chip {
      min-height: 46px;
      padding: 0.7rem 0.8rem;
      font-size: 0.84rem;
      border-radius: 11px;
    }
  }

  @media (max-width: 480px) {
    .home-rows {
      margin-top: 0.35rem;
    }
    .continue-section {
      margin-bottom: 1.2rem;
      padding-top: 0.75rem;
    }
    .row-header {
      padding: 0 0.7rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1.02rem;
    }
    .row-eyebrow {
      font-size: 0.6rem;
    }
    .view-all {
      font-size: 0.76rem;
    }
    .accent-bar {
      height: 24px;
      width: 3px;
    }
    .continue-scroll {
      gap: 0.7rem;
      padding: 0.3rem 0.7rem 0.8rem;
      scroll-padding-inline: 0.7rem;
    }
    .genre-section {
      padding: 1rem 0.7rem 1.5rem;
      /* Clear fixed bottom nav */
      padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
    }
    .genre-header {
      margin-bottom: 0.7rem;
    }
    .genre-title {
      font-size: 1.02rem;
    }
    .genre-eyebrow {
      font-size: 0.6rem;
    }
    .genre-explore {
      font-size: 0.72rem;
      padding: 0.32rem 0.55rem;
    }
    .genre-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .genre-chip {
      min-height: 44px;
      padding: 0.65rem 0.7rem;
      font-size: 0.78rem;
      border-radius: 10px;
    }
    .genre-arrow {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 360px) {
    .row-header {
      padding: 0 0.6rem;
    }
    .continue-scroll {
      gap: 0.6rem;
      padding-inline: 0.6rem;
      scroll-padding-inline: 0.6rem;
    }
    .genre-section {
      padding-inline: 0.6rem;
    }
    .genre-chip {
      padding: 0.6rem 0.55rem;
      font-size: 0.74rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .quick-chip,
    .genre-chip,
    .genre-arrow {
      transition: none;
    }
  }
</style>
