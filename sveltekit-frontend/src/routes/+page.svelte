<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import SkeletonHero from "$lib/components/SkeletonHero.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import AiringSchedule from "$lib/components/AiringSchedule.svelte";

  let { data } = $props();

  const INITIAL_CATALOG_ITEMS = 20;
  const CATALOG_PAGE_SIZE = 10;
  let catalogTab = $state<"newest" | "popular" | "topRated">("newest");
  let visibleCatalogItems = $state(INITIAL_CATALOG_ITEMS);
  let continueHistory = $state<any[]>([]);
  let heroItems = $state<any[]>([]);
  let seasonalItems = $state<any[]>([]);
  let popularItems = $state<any[]>([]);
  let topRatedItems = $state<any[]>([]);
  let movieItems = $state<any[]>([]);
  let trendingItems = $state<any[]>([]);
  let extraLoading = $state(true);
  let userContentGeneration = 0;

  function titleOf(item: any): string {
    const raw = item?.title || item?.name || item?.userPreferred || item?.title_english;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return raw?.english || raw?.userPreferred || raw?.romaji || raw?.native || "";
  }

  const catalogById = $derived.by(() => {
    const index = new Map<string, any>();
    for (const item of [...seasonalItems, ...popularItems, ...topRatedItems, ...movieItems, ...trendingItems]) {
      const itemId = item?.id || item?.mal_id;
      if (itemId) index.set(String(itemId), item);
    }
    return index;
  });

  const continueWatching = $derived.by(() =>
    continueHistory.map((item: any) => {
      const catalogMatch = catalogById.get(String(item.animeId));
      return {
        id: item.animeId,
        title: item.animeTitle || titleOf(catalogMatch) || `Anime ${item.animeId}`,
        poster: item.animePoster || catalogMatch?.poster || catalogMatch?.image || "",
        episode: item.episodeNumber || 1,
        progress: item.progress,
        duration: item.duration,
      };
    }),
  );

  const GENRES = [
    ["Action", "action"],
    ["Adventure", "adventure"],
    ["Comedy", "comedy"],
    ["Drama", "drama"],
    ["Fantasy", "fantasy"],
    ["Romance", "romance"],
    ["Sci-Fi", "sci-fi"],
    ["Slice of Life", "slice-of-life"],
    ["Supernatural", "supernatural"],
    ["Mystery", "mystery"],
    ["Horror", "horror"],
    ["Sports", "sports"],
  ] as const;

  $effect(() => {
    const token = $auth.token;
    const profileId = $auth.currentProfile?.id;
    const generation = ++userContentGeneration;
    if (token && profileId) void fetchUserContent(token, profileId, generation);
    else continueHistory = [];
  });

  async function fetchUserContent(token: string, profileId: number | string, generation: number) {
    try {
      const history = await api.getHistory(token, profileId).catch(() => []);
      if (generation !== userContentGeneration) return;
      const latest = new Map<string, any>();
      for (const item of Array.isArray(history) ? history : []) {
        if (!item?.animeId) continue;
        const current = latest.get(item.animeId);
        if (!current || new Date(item.lastWatchedAt) > new Date(current.lastWatchedAt)) latest.set(item.animeId, item);
      }
      continueHistory = Array.from(latest.values()).slice(0, 12);
    } catch (error) {
      if (generation === userContentGeneration) console.error("Failed to fetch watch history:", error);
    }
  }

  let airingItems = $derived(seasonalItems.length ? seasonalItems : trendingItems);
  let gridItems = $derived(
    catalogTab === "newest" ? airingItems : catalogTab === "popular" ? popularItems : topRatedItems,
  );
  let visibleGridItems = $derived(gridItems.slice(0, visibleCatalogItems));
  let hasMoreCatalogItems = $derived(visibleCatalogItems < gridItems.length);
  let catalogHref = $derived(
    catalogTab === "newest" ? "/explore/seasonal" : catalogTab === "popular" ? "/explore/popular" : "/explore/highest-rated",
  );

  function setCatalogTab(tab: "newest" | "popular" | "topRated") {
    catalogTab = tab;
    visibleCatalogItems = INITIAL_CATALOG_ITEMS;
  }

  function loadMoreCatalogItems() {
    visibleCatalogItems = Math.min(visibleCatalogItems + CATALOG_PAGE_SIZE, gridItems.length);
  }

  function scoreOf(anime: any) {
    const raw = Number(anime?.score || anime?.rating || 0);
    return raw > 10 ? raw / 10 : raw;
  }

  function chooseHeroes() {
    const candidates = [seasonalItems[0], topRatedItems[0], movieItems[0], trendingItems[0]].filter(Boolean);
    const seen = new Set<string>();
    heroItems = candidates.filter((item: any) => {
      const key = String(item.id || item.mal_id || item.title);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  $effect(() => {
    const promise = data.homeData as any;
    Promise.resolve(promise).then((home: any) => {
      if (data.homeData !== promise || !home) return;
      popularItems = home.popular || [];
      topRatedItems = home.topRated || [];
      movieItems = home.movies || [];
      trendingItems = home.trending || [];
    }).catch(() => {});
  });

  $effect(() => {
    const promise = data.seasonal as any;
    Promise.resolve(promise).then((seasonal: any) => {
      if (data.seasonal !== promise) return;
      seasonalItems = seasonal?.items || [];
    }).catch(() => {});
  });

  onMount(async () => {
    await Promise.allSettled([Promise.resolve(data.homeData), Promise.resolve(data.seasonal)]);
    chooseHeroes();
    extraLoading = false;
  });
</script>

<svelte:head>
  <title>WatchAnimeX - Anime streaming, season charts and airing times</title>
  <meta name="description" content="Browse seasonal anime, check upcoming episode times, and continue your watch history on WatchAnimeX." />
</svelte:head>

{#if extraLoading}
  <SkeletonHero />
  <div class="page-shell loading-rows"><SkeletonRow /><SkeletonRow /></div>
{:else}
  <HeroBanner
    items={heroItems.length ? heroItems : (trendingItems.length ? trendingItems : popularItems)}
    allowTitleArtwork
  />

  <main class="home-surface">
    <section class="lineup-section page-shell" aria-label="Weekly anime lineup">
      <AiringSchedule />
    </section>

    {#if continueWatching.length}
      <section class="history-section page-shell">
        <header class="section-heading">
          <div>
            <h2>Pick up where you stopped</h2>
            <p>Your recent episodes, kept in viewing order.</p>
          </div>
          <a href="/profile">Watch history <span aria-hidden="true">↗</span></a>
        </header>
        <div class="history-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    <section class="discovery-section page-shell">
      <div class="chart-block">
        <header class="section-heading compact">
          <div>
            <h2>Popular this week</h2>
            <p>Six titles from AniList's current popularity feed.</p>
          </div>
          <a href="/explore/popular">Full chart <span aria-hidden="true">↗</span></a>
        </header>
        <ol class="chart-list">
          {#each trendingItems.slice(0, 6) as anime, index (`${anime.id || anime.mal_id}-${index}`)}
            <li>
              <a href={`/anime/${anime.id || anime.mal_id}`}>
                <span class="chart-rank">{String(index + 1).padStart(2, "0")}</span>
                <img src={getProxiedImage(anime.poster || anime.image)} alt="" loading="lazy" />
                <span class="chart-copy">
                  <strong>{anime.title || "Unknown anime"}</strong>
                  <small>{anime.type || anime.format || "Series"}{anime.episodes ? ` · ${anime.episodes} episodes` : ""}</small>
                </span>
                {#if scoreOf(anime)}<span class="chart-score">{scoreOf(anime).toFixed(1)}</span>{/if}
              </a>
            </li>
          {/each}
        </ol>
      </div>

      <nav class="genre-index" aria-label="Browse anime by genre">
        <div class="genre-intro">
          <h2>Find your next mood</h2>
          <p>Move through the catalog by story, pace, or atmosphere.</p>
        </div>
        <div class="genre-links">
          {#each GENRES as genre, index}
            <a href={`/explore/${genre[1]}`}><span>{String(index + 1).padStart(2, "0")}</span>{genre[0]}</a>
          {/each}
        </div>
      </nav>
    </section>

    <section class="catalog-section page-shell">
      <header class="catalog-heading">
        <div>
          <h2>The season desk</h2>
          <p>Current releases, popular titles, and top-rated series.</p>
        </div>
        <div class="catalog-controls">
          <div class="catalog-tabs" role="tablist" aria-label="Choose catalog view">
            <button type="button" role="tab" class:active={catalogTab === "newest"} aria-selected={catalogTab === "newest"} onclick={() => setCatalogTab("newest")}>Current season</button>
            <button type="button" role="tab" class:active={catalogTab === "popular"} aria-selected={catalogTab === "popular"} onclick={() => setCatalogTab("popular")}>Popular</button>
            <button type="button" role="tab" class:active={catalogTab === "topRated"} aria-selected={catalogTab === "topRated"} onclick={() => setCatalogTab("topRated")}>Highest rated</button>
          </div>
          <a class="index-link" href={catalogHref}>Open index <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <div class="catalog-layout">
        <div class="catalog-main">
          {#if visibleGridItems.length}
            <div class="poster-grid">
              {#each visibleGridItems as anime, index (`${anime.id || anime.mal_id}-${catalogTab}-${index}`)}
                <AnimeCard {anime} rank={catalogTab === "popular" ? index + 1 : 0} />
              {/each}
            </div>
            <div class="catalog-pagination" aria-label="Catalog pagination">
              <span>{visibleGridItems.length} of {gridItems.length} titles</span>
              {#if hasMoreCatalogItems}
                <button type="button" onclick={loadMoreCatalogItems}>Show {Math.min(CATALOG_PAGE_SIZE, gridItems.length - visibleGridItems.length)} more</button>
              {:else}
                <a href={catalogHref}>Continue in the full index <span aria-hidden="true">↗</span></a>
              {/if}
            </div>
          {:else}
            <p class="empty-catalog">No titles are available in this view yet.</p>
          {/if}
        </div>

        <aside class="reader-chart" aria-label="Popular catalog list">
          <div class="reader-heading">
            <h3>Popular catalog</h3>
            <span>Sorted by popularity</span>
          </div>
          <ol>
            {#each popularItems.slice(0, 8) as anime, index (`popular-${anime.id || anime.mal_id}-${index}`)}
              <li>
                <a href={`/anime/${anime.id || anime.mal_id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{anime.title || "Unknown anime"}</strong>
                  {#if scoreOf(anime)}<small>{scoreOf(anime).toFixed(1)}</small>{/if}
                </a>
              </li>
            {/each}
          </ol>
        </aside>
      </div>
    </section>

    <section class="utility-section page-shell" aria-label="WatchAnimeX services">
      <div class="utility-links">
        <a href="/download"><span>01</span><strong>Apps</strong><small>Watch on your devices</small><b aria-hidden="true">↗</b></a>
        <a href="/schedule"><span>02</span><strong>Release calendar</strong><small>Plan the week ahead</small><b aria-hidden="true">↗</b></a>
        <a href="https://discord.gg/7v6ZzkJpXV" target="_blank" rel="noopener noreferrer"><span>03</span><strong>Community</strong><small>Talk anime and report issues</small><b aria-hidden="true">↗</b></a>
      </div>
      <div class="home-note">
        <h2>One place to keep your anime moving.</h2>
        <div>
          <p>WatchAnimeX brings seasonal releases, films, schedules, and viewing history into one focused catalog. Search by title, browse by genre, or check the weekly lineup before the next episode lands.</p>
          <p>Profiles keep recent episodes and progress together, so returning to a series takes one click instead of another search.</p>
        </div>
      </div>
    </section>
  </main>
{/if}

<style>
  :global(body) { background: #070706; }
  .home-surface {
    position: relative;
    z-index: 2;
    background: #070706;
    color: #f1eee8;
  }
  .page-shell {
    width: 100%;
    max-width: var(--page-max, 1500px);
    margin-inline: auto;
    padding-left: max(var(--page-gutter, 2.5rem), env(safe-area-inset-left));
    padding-right: max(var(--page-gutter, 2.5rem), env(safe-area-inset-right));
    box-sizing: border-box;
  }
  .loading-rows { padding-block: 2rem; }
  .lineup-section { padding-top: 2.5rem; }
  .history-section, .discovery-section, .catalog-section, .utility-section { padding-top: 5.5rem; }

  .section-heading, .catalog-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }
  .section-heading h2, .catalog-heading h2, .genre-intro h2 {
    margin: 0;
    color: #f7f2e9;
    font: 800 clamp(1.55rem, 2.3vw, 2.35rem)/1.05 var(--net-display-font, system-ui);
    letter-spacing: -0.035em;
  }
  .section-heading p, .catalog-heading p, .genre-intro p {
    margin: 0.45rem 0 0;
    color: #928d85;
    font-size: 0.92rem;
    line-height: 1.55;
  }
  .section-heading > a, .index-link {
    flex: 0 0 auto;
    color: #d8d1c7;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
  }
  .section-heading > a:hover, .index-link:hover { color: #f1a287; }

  .history-scroll {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding: 0 0 0.8rem;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .history-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }

  .discovery-section {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.55fr);
    gap: clamp(2.5rem, 5vw, 6rem);
    align-items: start;
  }
  .section-heading.compact { margin-bottom: 0.8rem; }
  .chart-list, .reader-chart ol { list-style: none; margin: 0; padding: 0; }
  .chart-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2rem; }
  .chart-list li { box-shadow: inset 0 -1px #24201d; }
  .chart-list a {
    min-height: 94px;
    display: grid;
    grid-template-columns: 2.2rem 54px minmax(0, 1fr) auto;
    gap: 0.85rem;
    align-items: center;
    padding: 0.75rem 0;
    color: inherit;
    text-decoration: none;
  }
  .chart-rank { color: #655f58; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
  .chart-list img { width: 54px; height: 72px; object-fit: cover; border-radius: 3px; background: #171513; }
  .chart-copy { min-width: 0; }
  .chart-copy strong { display: block; overflow: hidden; color: #ece7df; font-size: 0.9rem; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
  .chart-copy small { display: block; margin-top: 0.32rem; color: #807b74; font-size: 0.72rem; }
  .chart-score { color: #bfb6ab; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
  .chart-list a:hover .chart-copy strong { color: #efa086; }

  .genre-index { padding-top: 0.1rem; }
  .genre-intro { margin-bottom: 1.2rem; }
  .genre-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .genre-links a {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    min-height: 42px;
    color: #c7c0b7;
    text-decoration: none;
    box-shadow: inset 0 -1px #24201d;
    font-size: 0.84rem;
  }
  .genre-links a span { color: #5f5a54; font-size: 0.66rem; font-variant-numeric: tabular-nums; }
  .genre-links a:hover { color: #f1a287; }

  .catalog-heading { align-items: start; }
  .catalog-controls { display: flex; align-items: center; gap: 1.4rem; }
  .catalog-tabs { display: flex; gap: 0.2rem; padding: 3px; background: #12100f; border-radius: 5px; }
  .catalog-tabs button {
    min-height: 38px;
    padding: 0.55rem 0.85rem;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: #8f8981;
    cursor: pointer;
    font: 700 0.78rem/1 var(--net-body-font, system-ui);
  }
  .catalog-tabs button:hover { color: #e7e0d7; background: #1a1715; }
  .catalog-tabs button.active { color: #1a100d; background: #e8a087; }
  .catalog-tabs button:focus-visible, .catalog-pagination button:focus-visible { outline: 2px solid #f3b29d; outline-offset: 2px; }

  .catalog-layout { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 2.5rem; align-items: start; }
  .poster-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.8rem 1rem; }
  .catalog-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2.5rem;
    padding-top: 1rem;
    box-shadow: inset 0 1px #24201d;
    color: #817b74;
    font-size: 0.78rem;
  }
  .catalog-pagination button, .catalog-pagination a {
    border: 0;
    border-radius: 3px;
    background: #d97859;
    color: #170c09;
    padding: 0.72rem 1rem;
    font: 800 0.78rem/1 var(--net-body-font, system-ui);
    text-decoration: none;
    cursor: pointer;
  }
  .catalog-pagination button:hover, .catalog-pagination a:hover { background: #efa086; }
  .empty-catalog { min-height: 20rem; color: #928d85; }

  .reader-chart { position: sticky; top: 5.5rem; background: #0d0c0b; padding: 1rem 1.1rem; border-radius: 5px; }
  .reader-heading { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.55rem; }
  .reader-heading h3 { margin: 0; color: #eee8df; font-size: 1rem; }
  .reader-heading span { color: #69645e; font-size: 0.65rem; }
  .reader-chart li { box-shadow: inset 0 -1px #211e1b; }
  .reader-chart li:last-child { box-shadow: none; }
  .reader-chart a { display: grid; grid-template-columns: 1.7rem minmax(0, 1fr) auto; gap: 0.55rem; align-items: center; min-height: 58px; color: inherit; text-decoration: none; }
  .reader-chart a > span { color: #625d57; font-size: 0.67rem; }
  .reader-chart strong { overflow: hidden; color: #cfc8be; font-size: 0.78rem; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
  .reader-chart small { color: #8b857d; font-size: 0.68rem; }
  .reader-chart a:hover strong { color: #efa086; }

  .utility-section { padding-bottom: 5rem; }
  .utility-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: #0d0c0b; border-radius: 6px; }
  .utility-links a {
    position: relative;
    min-height: 140px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto 1fr;
    gap: 0.5rem 1rem;
    padding: 1.35rem;
    color: inherit;
    text-decoration: none;
    box-shadow: inset -1px 0 #26221f;
  }
  .utility-links a:last-child { box-shadow: none; }
  .utility-links span { color: #635e58; font-size: 0.7rem; }
  .utility-links strong { color: #eee8df; font-size: 1.05rem; }
  .utility-links small { grid-column: 2; align-self: end; color: #827c75; font-size: 0.78rem; }
  .utility-links b { color: #af6b55; font-size: 1rem; font-weight: 500; }
  .utility-links a:hover { background: #151210; }
  .utility-links a:hover strong, .utility-links a:hover b { color: #efa086; }
  .home-note { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 4rem; margin-top: 4rem; padding-top: 2rem; box-shadow: inset 0 1px #24201d; }
  .home-note h2 { margin: 0; max-width: 16ch; color: #eee8df; font-size: clamp(1.8rem, 3vw, 3.2rem); line-height: 1.02; letter-spacing: -0.045em; }
  .home-note div { columns: 2; column-gap: 2rem; }
  .home-note p { break-inside: avoid; margin: 0; color: #8f8982; font-size: 0.9rem; line-height: 1.7; }

  @media (max-width: 1180px) {
    .discovery-section { grid-template-columns: 1fr; }
    .genre-links { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .catalog-layout { grid-template-columns: 1fr; }
    .reader-chart { position: static; }
    .reader-chart ol { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 2rem; }
  }
  @media (max-width: 900px) {
    .page-shell {
      padding-left: max(var(--page-gutter-md, 1.25rem), env(safe-area-inset-left));
      padding-right: max(var(--page-gutter-md, 1.25rem), env(safe-area-inset-right));
    }
    .section-heading, .catalog-heading { align-items: start; flex-direction: column; gap: 1rem; }
    .catalog-controls { width: 100%; align-items: flex-start; flex-direction: column; gap: 0.75rem; }
    .catalog-tabs { width: 100%; overflow-x: auto; }
    .catalog-tabs button { flex: 1 0 auto; }
    .poster-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .utility-links { grid-template-columns: 1fr; }
    .utility-links a { min-height: 100px; box-shadow: inset 0 -1px #26221f; }
    .utility-links a:last-child { box-shadow: none; }
    .home-note { grid-template-columns: 1fr; gap: 2rem; }
  }
  @media (max-width: 640px) {
    .page-shell {
      padding-left: max(var(--page-gutter-sm, 0.85rem), env(safe-area-inset-left));
      padding-right: max(var(--page-gutter-sm, 0.85rem), env(safe-area-inset-right));
    }
    .lineup-section { padding-top: 1.5rem; }
    .history-section, .discovery-section, .catalog-section, .utility-section { padding-top: 3.5rem; }
    .chart-list { grid-template-columns: 1fr; }
    .genre-links { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .poster-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.4rem 0.7rem; }
    .reader-chart ol { grid-template-columns: 1fr; }
    .catalog-pagination { align-items: stretch; flex-direction: column; gap: 0.9rem; }
    .catalog-pagination button, .catalog-pagination a { text-align: center; }
    .home-note div { columns: 1; }
    .home-note p + p { margin-top: 1rem; }
  }
</style>