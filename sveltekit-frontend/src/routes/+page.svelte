<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import { getProxiedImage } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import SkeletonHero from "$lib/components/SkeletonHero.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import HomeMarketing from "$lib/components/HomeMarketing.svelte";
  import AiringSchedule from "$lib/components/AiringSchedule.svelte";
  import HomeSidebar from "$lib/components/HomeSidebar.svelte";

  let { data } = $props();

  /** Catalog tab under the hero */
  let catalogTab = $state<"newest" | "popular" | "topRated">("newest");

  // Personalized data is fetched on the client only (depends on auth).
  let continueWatching: any[] = $state([]);

  // Hero banner: one random pick from each of 3 categories, shuffled per session.
  let heroItems = $state<any[]>([]);

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

  let seasonalItems = $state<any[]>([]);
  let popularItems = $state<any[]>([]);
  let topRatedItems = $state<any[]>([]);
  let movieItems = $state<any[]>([]);
  let trendingItems = $state<any[]>([]);
  let extraLoading = $state(true);

  // Keep tab → grid mapping outside {#await}/{@const} so catalogTab is always reactive.
  let airingItems = $derived(
    seasonalItems.length ? seasonalItems : trendingItems,
  );
  let gridItems = $derived(
    catalogTab === "newest"
      ? airingItems
      : catalogTab === "popular"
        ? popularItems
        : topRatedItems,
  );
  let seeAllHref = $derived(
    catalogTab === "newest"
      ? "/explore/seasonal"
      : catalogTab === "popular"
        ? "/explore/popular"
        : "/explore/highest-rated",
  );
  let justFinishedItems = $derived.by(() => {
    const pool = (topRatedItems.length ? topRatedItems : popularItems).filter(
      (a: any) => {
        const s = String(a?.status || "").toUpperCase();
        return s.includes("FINISH") || s.includes("COMPLETE");
      },
    );
    return (pool.length ? pool : topRatedItems).slice(0, 4);
  });

  function setCatalogTab(tab: "newest" | "popular" | "topRated") {
    catalogTab = tab;
  }

  // Seed list state as soon as the streamed promise resolves (works in SSR hydrate
  // and client). Without this, tabs only update after onMount finishes.
  $effect(() => {
    const p = data.homeData as any;
    if (p && typeof p.then === "function") {
      p.then((homeData: any) => {
        if (!homeData) return;
        popularItems = homeData.popular || popularItems;
        topRatedItems = homeData.topRated || topRatedItems;
        movieItems = homeData.movies || movieItems;
        trendingItems = homeData.trending || trendingItems;
      }).catch(() => {});
    } else if (p && typeof p === "object") {
      popularItems = p.popular || [];
      topRatedItems = p.topRated || [];
      movieItems = p.movies || [];
      trendingItems = p.trending || [];
    }
  });

  $effect(() => {
    const p = data.seasonal as any;
    if (p && typeof p.then === "function") {
      p.then((seasonal: any) => {
        seasonalItems = seasonal?.items || seasonalItems;
        extraLoading = false;
      }).catch(() => {
        extraLoading = false;
      });
    } else if (p && typeof p === "object") {
      seasonalItems = p.items || [];
      extraLoading = false;
    }
  });

  onMount(async () => {
    try {
      // Hero shuffle only (client-only random). Lists already seeded above.
      const homeData: any = await Promise.resolve(data.homeData);
      const seasonal = await Promise.resolve(data.seasonal);
      seasonalItems = seasonal?.items || seasonalItems;
      popularItems = homeData?.popular || popularItems;
      topRatedItems = homeData?.topRated || topRatedItems;
      movieItems = homeData?.movies || movieItems;
      trendingItems = homeData?.trending || trendingItems;
      extraLoading = false;

      const newThisSeason = seasonalItems;
      const romance = homeData?.romance || [];
      const movies = movieItems;
      const pools: any[][] = [newThisSeason, romance, movies].filter(
        (p) => p.length > 0,
      );
      if (pools.length === 0) {
        heroItems = trendingItems.length ? trendingItems : popularItems;
        return;
      }
      const picks = pools.map((pool) => pool[Math.floor(Math.random() * pool.length)]);
      for (let i = picks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [picks[i], picks[j]] = [picks[j], picks[i]];
      }
      heroItems = picks;
    } catch (e) {
      console.warn("Failed to build random hero:", e);
      extraLoading = false;
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

{#if extraLoading}
  <SkeletonHero />
  <div class="home-pad">
    {#each Array(3) as _, i (i)}
      <SkeletonRow />
    {/each}
  </div>
{:else}
  <HeroBanner
    items={heroItems.length > 0
      ? heroItems
      : trendingItems || popularItems}
  />

  <!-- SPOTLIGHT (continues above: HeroBanner) -->

  <!-- TRENDING THIS WEEK -- desidub-style 3-col featured grid -->
  <section class="featured-section home-pad">
    <header class="featured-head">
      <h2 class="featured-title">Trending This Week</h2>
      <a href="/explore/popular" class="featured-more">View all →</a>
    </header>
    {#if extraLoading}
      <SkeletonRow count={8} />
    {:else if trendingItems.length}
      <div class="featured-grid">
        {#each trendingItems.slice(0, 6) as a, i (a.id || a.mal_id || i)}
          <article class="featured-card">
            <a class="featured-thumb" href="/anime/{a.id || a.mal_id}/">
              <img src={getProxiedImage(a.poster || a.image)} alt={a.title || ''} loading="lazy" />
              <span class="featured-rank">#{i + 1}</span>
            </a>
            <div class="featured-body">
              <span class="featured-type">{#if a.type || a.format}{(a.type || a.format).toUpperCase()}{/if}</span>
              <h3 class="featured-name"><a href="/anime/{a.id || a.mal_id}/">{a.title}</a></h3>
              <div class="featured-meta">
                {#if a.score || a.rating}
                  <span class="featured-score">★ {(Number(a.score || a.rating) > 10 ? (Number(a.score || a.rating) / 10).toFixed(1) : Number(a.score || a.rating).toFixed(1))}</span>
                {/if}
                {#if a.episodes}<span class="featured-eps">{a.episodes} Eps</span>{/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>

  <!-- GENRE PILLS (horizontal rail) -->
  <section class="features-strip home-pad">
    <div class="features-track">
      {#each GENRES as g}
        <a class="feature-pill" href={`/explore/${g.slug}`}>{g.label}</a>
      {/each}
    </div>
  </section>

  <!-- Watch History -->
  {#if continueWatching.length > 0}
    <section class="history-section home-pad">
      <header class="featured-head">
        <h2 class="featured-title">Watch History</h2>
        <a href="/profile" class="featured-more">History →</a>
      </header>
      <div class="history-scroll">
        {#each continueWatching as item (item.id + "-" + item.episode)}
          <ContinueCard {item} />
        {/each}
      </div>
    </section>
  {/if}

  <!-- CATALOG + SIDEBAR (desidub: section with grid + aside rail) -->
    <section class="catalog-section home-pad">
    <div class="catalog-wrap">
      <!-- Main column -->
      <div class="catalog-main">
        <header class="catalog-head">
          <div class="catalog-tabs" role="tablist" aria-label="Catalog">
            <button
              type="button"
              role="tab"
              class="catalog-tab"
              class:active={catalogTab === "newest"}
              aria-selected={catalogTab === "newest"}
              onclick={() => setCatalogTab("newest")}
            >NEWEST</button>
            <button
              type="button"
              role="tab"
              class="catalog-tab"
              class:active={catalogTab === "popular"}
              aria-selected={catalogTab === "popular"}
              onclick={() => setCatalogTab("popular")}
            >POPULAR</button>
            <button
              type="button"
              role="tab"
              class="catalog-tab"
              class:active={catalogTab === "topRated"}
              aria-selected={catalogTab === "topRated"}
              onclick={() => setCatalogTab("topRated")}
            >TOP RATED</button>
          </div>
          <a class="featured-more" href={seeAllHref}>See all →</a>
        </header>

        {#if extraLoading && catalogTab === "newest" && gridItems.length === 0}
          <SkeletonRow />
        {:else if gridItems.length}
          <div class="poster-grid">
            {#each gridItems.slice(0, 18) as anime, i (String(anime.id || anime.mal_id || i) + "-" + catalogTab)}
              <AnimeCard {anime} rank={catalogTab === "popular" ? i + 1 : 0} />
            {/each}
          </div>
        {:else}
          <p class="empty-catalog">Nothing here yet — try another tab.</p>
        {/if}
      </div>

      <!-- Aside rail -->
      <aside class="catalog-aside">
        <section class="featured-aside-card">
          <header class="featured-aside-head">
            <span class="aside-dot"></span>
            <h3>TOP AIRING</h3>
          </header>
          <ul class="aside-list">
            {#each airingItems.slice(0, 6) as a, i (a.id || a.mal_id || i)}
              <li>
                <a class="aside-row" href="/anime/{a.id || a.mal_id}/">
                  <img class="aside-thumb" src={getProxiedImage(a.poster || a.image)} alt="" loading="lazy" />
                  <div class="aside-body">
                    <h4 class="aside-title">{a.title || 'Unknown'}</h4>
                    <div class="aside-meta">
                      {#if a.score || a.rating}<span>★ {(Number(a.score || a.rating) > 10 ? (Number(a.score || a.rating) / 10).toFixed(1) : Number(a.score || a.rating).toFixed(1))}</span>{/if}
                      {#if a.type || a.format}<span class="aside-dot-sep">·</span><span>{(a.type || a.format).toUpperCase()}</span>{/if}
                    </div>
                  </div>
                </a>
              </li>
            {/each}
          </ul>
        </section>

        <section class="featured-aside-card">
          <header class="featured-aside-head">
            <span class="aside-dot aside-dot-2"></span>
            <h3>TOP MOVIES</h3>
          </header>
          <ul class="aside-list">
            {#each movieItems.slice(0, 5) as a, i (a.id || a.mal_id || i)}
              <li>
                <a class="aside-row" href="/anime/{a.id || a.mal_id}/">
                  <img class="aside-thumb" src={getProxiedImage(a.poster || a.image)} alt="" loading="lazy" />
                  <div class="aside-body">
                    <h4 class="aside-title">{a.title || 'Unknown'}</h4>
                    <div class="aside-meta">
                      {#if a.score || a.rating}<span>★ {(Number(a.score || a.rating) > 10 ? (Number(a.score || a.rating) / 10).toFixed(1) : Number(a.score || a.rating).toFixed(1))}</span>{/if}
                      <span class="aside-dot-sep">·</span>
                      <span>MOVIE</span>
                    </div>
                  </div>
                </a>
              </li>
            {/each}
          </ul>
        </section>

        <section class="featured-aside-card featured-aside-schedule">
          <header class="featured-aside-head">
            <span class="aside-dot aside-dot-3"></span>
            <h3>SCHEDULE</h3>
          </header>
          <div class="aside-schedule">
            <AiringSchedule />
          </div>
        </section>
      </aside>
    </div>
  </section>
{/if}

<div class="home-marketing-wrap"><HomeMarketing /></div>

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 30vh;
    gap: 1rem;
    color: var(--net-text-muted);
  }

  .home-pad {
    width: 100%;
    max-width: var(--page-max, 1600px);
    margin: 0 auto;
    padding: 0 var(--page-gutter, 2.5rem);
    box-sizing: border-box;
  }
  @media (max-width: 1024px) {
    .home-pad { padding: 0 var(--page-gutter-md, 1.25rem); }
  }
  @media (max-width: 720px) {
    .home-pad { padding: 0 var(--page-gutter-sm, 0.75rem); }
  }

  .genre-rail {
    width: 100%;
    max-width: var(--page-max, 1600px);
    margin: 0.15rem auto 0.4rem;
    padding: 0 var(--page-gutter, 2.5rem);
    box-sizing: border-box;
    position: relative;
    z-index: 4;
  }
  @media (max-width: 1024px) {
    .genre-rail { padding: 0 var(--page-gutter-md, 1.25rem); }
  }
  @media (max-width: 720px) {
    .genre-rail { padding: 0 var(--page-gutter-sm, 0.75rem); }
  }
  .genre-rail-track {
    display: flex;
    gap: 0.45rem;
    overflow-x: auto;
    padding: 0.35rem 0 0.55rem;
    scrollbar-width: none;
  }
  .genre-rail-track::-webkit-scrollbar {
    display: none;
  }
  .genre-pill {
    flex-shrink: 0;
    padding: 0.45rem 0.95rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.88);
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .genre-pill:hover {
    background: rgba(250, 204, 21, 0.26);
    border-color: rgba(255, 138, 61, 0.45);
  }

  .history-section {
    margin-top: 0.55rem;
    margin-bottom: 0.35rem;
  }
  .section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.7rem;
  }
  .section-eyebrow {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 0.15rem;
  }
  .section-title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.02em;
  }
  .section-link {
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
  }
  .section-link:hover {
    color: #fff;
  }
  .history-scroll {
    display: flex;
    gap: 0.85rem;
    overflow-x: auto;
    padding: 0.25rem 0 0.75rem;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .history-scroll::-webkit-scrollbar {
    display: none;
  }

  .home-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
    margin-top: 0.65rem;
    margin-bottom: 1.25rem;
    width: 100%;
  }
  .home-primary {
    min-width: 0;
    width: 100%;
  }
  .home-primary {
    min-width: 0;
  }
  .home-aside {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 0.4rem;
  }

  .catalog-tabs {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
  }
  .catalog-tab {
    appearance: none;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 0.55rem 0.9rem;
    border-radius: 9px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .catalog-tab.active {
    background: rgba(236, 88, 0, 0.18);
    color: #EC5800;
    box-shadow: inset 0 0 0 1px rgba(236, 88, 0, 0.45);
  }
  .catalog-tab:focus-visible {
    outline: 2px solid var(--net-blue, #3b82f6);
    outline-offset: 2px;
  }
  .catalog-tab:hover:not(.active) {
    color: #fff;
  }
  .catalog-see-all {
    margin-left: auto;
    font-size: 0.78rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    padding: 0.4rem 0.55rem;
  }
  .catalog-see-all:hover {
    color: #fff;
  }

  .poster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem 0.85rem;
    width: 100%;
  }
  .poster-grid :global(.card) {
    max-width: none !important;
    width: 100% !important;
  }
  .poster-grid :global(.card-poster) {
    width: 100%;
  }
  .empty-catalog {
    color: rgba(255, 255, 255, 0.45);
    font-weight: 600;
    padding: 2rem 0;
  }

  .schedule-compact {
    background: var(--net-panel, #0c0c0c);
    border: 1px solid var(--net-panel-border, rgba(255, 255, 255, 0.08));
    border-radius: 14px;
    overflow: hidden;
    max-height: 260px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .schedule-compact :global(.airing-section) {
    margin: 0 !important;
    padding: 0.75rem !important;
    border: none !important;
    background: transparent !important;
    max-width: 100%;
  }
  .schedule-compact :global(*) {
    max-width: 100%;
  }
  .schedule-compact :global([role="tablist"]) {
    overflow-x: auto;
    max-width: 100%;
    scrollbar-width: none;
  }
  .schedule-compact :global([role="tablist"])::-webkit-scrollbar { display: none; }


  @media (max-width: 1100px) {
    .home-aside {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .home-pad,
    .genre-rail {
      padding-inline: 0.75rem;
    }
    .home-aside {
      grid-template-columns: 1fr;
    }
    .poster-grid {
      grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
      gap: 0.7rem 0.55rem;
    }
    .section-title {
      font-size: 1.15rem;
    }
    .catalog-tab {
      padding: 0.45rem 0.65rem;
      font-size: 0.72rem;
    }
  }

  .home-marketing-wrap {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255,255,255,0.04);
    max-height: 180px;
    overflow: hidden;
    mask-image: linear-gradient(180deg, #000 35%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 35%, transparent 100%);
    opacity: 0.5;
    pointer-events: none;
  }

  /* ===== DESIDUBANIME-style home layout ===== */
  .featured-section, .history-section, .catalog-section {
    position: relative;
    z-index: 3;
    margin: 1.25rem auto 1rem;
    max-width: var(--page-max, 1600px);
    padding: 0 var(--page-gutter, 2.5rem);
    box-sizing: border-box;
  }
  .featured-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 0.85rem;
    gap: 0.75rem;
  }
  .featured-title {
    margin: 0;
    font-family: var(--net-display-font, 'Outfit'), sans-serif;
    font-size: 1.35rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.01em;
  }
  .featured-more {
    font-size: 0.78rem;
    font-weight: 700;
    color: rgba(236, 88, 0, 0.85);
    text-decoration: none;
    transition: color 0.15s;
  }
  .featured-more:hover { color: #EC5800; }

  .featured-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .featured-card {
    display: flex;
    align-items: stretch;
    background: var(--net-card-bg, #202125);
    border: 1px solid var(--net-border, rgba(255,255,255,0.06));
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.18s;
  }
  .featured-card:hover {
    border-color: rgba(245, 158, 11, 0.35);
  }
  .featured-thumb {
    position: relative;
    width: 90px;
    flex-shrink: 0;
    aspect-ratio: 2 / 3;
    overflow: hidden;
  }
  .featured-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s;
  }
  .featured-card:hover .featured-thumb img { transform: scale(1.05); }
  .featured-rank {
    position: absolute;
    left: 0.45rem;
    top: 0.45rem;
    padding: 0.1rem 0.4rem;
    border-radius: 5px;
    background: rgba(0,0,0,0.72);
    font-size: 0.7rem;
    font-weight: 800;
    color: #fff;
  }
  .featured-body {
    flex: 1;
    min-width: 0;
    padding: 0.7rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    justify-content: space-between;
  }
  .featured-type {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.48);
    text-transform: uppercase;
  }
  .featured-name {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.25;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .featured-name a { color: inherit; text-decoration: none; }
  .featured-name a:hover { color: #EC5800; }
  .featured-meta {
    display: flex;
    gap: 0.45rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(255,255,255,0.55);
  }
  .featured-score { color: #EC5800; }

  .features-strip {
    position: relative;
    z-index: 3;
    margin: 0.5rem auto 0.5rem;
    max-width: var(--page-max, 1600px);
    padding: 0 var(--page-gutter, 2.5rem);
    box-sizing: border-box;
  }
  .features-track {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .feature-pill {
    padding: 0.45rem 0.95rem;
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--net-border, rgba(255,255,255,0.08));
    color: rgba(255,255,255,0.85);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .feature-pill:hover {
    background: rgba(236, 88, 0, 0.12);
    border-color: rgba(236, 88, 0, 0.4);
    color: #fff;
  }

  .history-section { margin: 0.75rem auto; }
  .history-scroll {
    display: flex;
    gap: 0.85rem;
    overflow-x: auto;
    padding: 0.25rem 0 0.85rem;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .history-scroll::-webkit-scrollbar { display: none; }

  .catalog-section { margin: 1rem auto 2rem; }
  .catalog-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 1.25rem;
    align-items: flex-start;
  }
  .catalog-main { min-width: 0; }
  .catalog-head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
    margin: 0 0 0.85rem;
    padding: 0.3rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--net-border, rgba(255,255,255,0.06));
    border-radius: 12px;
  }
  .catalog-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .catalog-tab {
    appearance: none;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.55);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    padding: 0.55rem 0.9rem;
    border-radius: 9px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .catalog-tab.active {
    background: rgba(236, 88, 0, 0.18);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(236, 88, 0, 0.45);
  }
  .catalog-tab:hover:not(.active) { color: #fff; }

  .poster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 1rem 0.95rem;
  }
  .empty-catalog {
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    padding: 2rem 0;
  }

  .catalog-aside {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    position: sticky;
    top: 5rem;
  }
  .featured-aside-card {
    background: var(--net-card-bg, #202125);
    border: 1px solid var(--net-border, rgba(255,255,255,0.07));
    border-radius: 14px;
    padding: 0.8rem 0.85rem 1rem;
  }
  .featured-aside-head {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0 0.1rem 0.55rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin: 0 0 0.7rem;
  }
  .featured-aside-head h3 {
    margin: 0;
    font-family: var(--net-display-font, 'Outfit'), sans-serif;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #fff;
  }
  .aside-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #F59E0B;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.55);
  }
  .aside-dot-2 { background: #EF4444; box-shadow: 0 0 8px rgba(239,68,68,0.55); }
  .aside-dot-3 { background: #22C55E; box-shadow: 0 0 8px rgba(34,197,94,0.55); }
  .aside-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .aside-row {
    display: flex;
    gap: 0.65rem;
    padding: 0.35rem;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
  }
  .aside-row:hover { background: rgba(255,255,255,0.05); }
  .aside-thumb {
    width: 50px;
    height: 70px;
    object-fit: cover;
    border-radius: 7px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.06);
  }
  .aside-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
  }
  .aside-title {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: rgba(255,255,255,0.92);
    line-height: 1.25;
  }
  .aside-meta {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .aside-dot-sep { opacity: 0.5; }

  .featured-aside-schedule { padding: 0.8rem 0.85rem 0.85rem; }
  .aside-schedule :global(.airing-section) {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
  }

  @media (max-width: 1100px) {
    .catalog-wrap { grid-template-columns: 1fr; }
    .catalog-aside { position: static; }
  }
  @media (max-width: 720px) {
    .featured-grid {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      gap: 0.75rem;
      padding-bottom: 0.5rem;
    }
    .featured-grid::-webkit-scrollbar {
      display: none;
    }
    .featured-card {
      flex: 0 0 280px;
      scroll-snap-align: start;
    }
    .featured-section, .catalog-section, .features-strip, .history-section {
      padding-inline: var(--page-gutter-sm, 0.75rem);
    }
    .aside-thumb { width: 44px; height: 62px; }
  }

</style>
