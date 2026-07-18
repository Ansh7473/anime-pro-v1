<script lang="ts">
  import { api, mergeUniqueAnime } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import SkeletonGrid from "$lib/components/SkeletonGrid.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { getCollectionJsonLd } from "$lib/seo";

  let { data } = $props();
  const category = $derived(data.category);

  const categoryCatalog: Record<string, { title: string; description: string }> = {
    trending: { title: "Trending Now", description: "The titles gaining the most attention across AniList right now." },
    "trending-now": { title: "Trending Now", description: "The titles gaining the most attention across AniList right now." },
    popular: { title: "Most Popular", description: "The most widely followed anime in the AniList catalog." },
    "most-popular": { title: "Most Popular", description: "The most widely followed anime in the AniList catalog." },
    "all-time-popular": { title: "All-Time Popular", description: "Long-running favorites and defining releases, ordered by audience reach." },
    seasonal: { title: "This Season", description: "Current-season broadcasts and releases, updated from AniList." },
    "top-airing": { title: "Top Airing", description: "Currently releasing series with the strongest audience momentum." },
    upcoming: { title: "Upcoming", description: "Announced anime approaching their first release." },
    movies: { title: "Movies", description: "Feature-length anime ordered by catalog popularity." },
    "highest-rated": { title: "Highest Rated", description: "TV anime ordered by AniList community score." },
    "top-rated": { title: "Top Rated", description: "TV anime ordered by AniList community score." },
    action: { title: "Action", description: "Kinetic series built around combat, pursuit, and high-stakes conflict." },
    romance: { title: "Romance", description: "Stories centered on intimacy, affection, and changing relationships." },
    comedy: { title: "Comedy", description: "Character-driven and situational anime made to be funny." },
    adventure: { title: "Adventure", description: "Journeys through unfamiliar worlds, trials, and discoveries." },
    fantasy: { title: "Fantasy", description: "Magic, myth, and imagined worlds across every format." },
    "sci-fi": { title: "Science Fiction", description: "Technology, speculative futures, and worlds beyond the familiar." },
    supernatural: { title: "Supernatural", description: "Spirits, curses, powers, and events outside ordinary life." },
    drama: { title: "Drama", description: "Emotion-led stories shaped by difficult choices and consequence." },
    "slice-of-life": { title: "Slice of Life", description: "Everyday routines, friendships, and closely observed moments." },
    mystery: { title: "Mystery", description: "Hidden motives, unanswered questions, and careful deduction." },
    horror: { title: "Horror", description: "Unease, survival, and stories designed to disturb." },
    sports: { title: "Sports", description: "Competition, training, teamwork, and the pursuit of mastery." },
    mecha: { title: "Mecha", description: "Machines, pilots, and conflicts fought at monumental scale." },
    music: { title: "Music", description: "Performers, bands, composition, and lives shaped by sound." },
    psychological: { title: "Psychological", description: "Interior conflict, unstable perception, and complex motivation." },
  };

  function titleFromSlug(value: string) {
    return value.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
  }

  let items: any[] = $state([]);
  let loading = $state(true);
  let hasNext = $state(false);
  let currentPage = $state(1);
  let error = $state("");
  let loadGeneration = 0;

  let lastInitial: any = null;
  $effect(() => {
    const promise = data.initial;
    if (promise === lastInitial) return;
    lastInitial = promise;
    const generation = ++loadGeneration;
    loading = true;
    error = "";
    currentPage = 1;

    Promise.resolve(promise)
      .then((result) => {
        if (data.initial !== promise || generation !== loadGeneration) return;
        items = mergeUniqueAnime([], result?.items || []);
        hasNext = Boolean(result?.hasNext);
      })
      .catch((cause) => {
        if (data.initial !== promise || generation !== loadGeneration) return;
        console.error(cause);
        items = [];
        hasNext = false;
        error = "This catalog section could not be loaded.";
      })
      .finally(() => {
        if (data.initial === promise && generation === loadGeneration) loading = false;
      });
  });

  const categoryInfo = $derived(
    categoryCatalog[category] || {
      title: titleFromSlug(category),
      description: "A focused selection from the AniList anime catalog.",
    },
  );
  const pageTitle = $derived(categoryInfo.title);
  const pageDescription = $derived(
    `${categoryInfo.description} Browse posters, ratings, genres, and detail pages on WatchAnimeX.`,
  );
  const collectionJsonLd = $derived(
    getCollectionJsonLd(`${pageTitle} - WatchAnimeX`, pageDescription, data.canonicalUrl, items),
  );

  async function loadPage(requestedPage: number) {
    if (loading) return;
    const generation = ++loadGeneration;
    const requestedCategory = category;
    loading = true;
    error = "";
    try {
      const result = await api.getCategory(requestedCategory, requestedPage);
      if (generation !== loadGeneration || requestedCategory !== category) return;
      const incoming = Array.isArray(result.data) ? result.data : [];
      items = requestedPage === 1
        ? mergeUniqueAnime([], incoming)
        : mergeUniqueAnime(items, incoming);
      hasNext = Boolean(result.pagination?.has_next_page);
      currentPage = Number(result.pagination?.current_page) || requestedPage;
    } catch (cause) {
      if (generation !== loadGeneration || requestedCategory !== category) return;
      console.error(cause);
      error = requestedPage === 1
        ? "This catalog section could not be loaded."
        : "The next page could not be loaded. Your current titles are unchanged.";
    } finally {
      if (generation === loadGeneration) loading = false;
    }
  }
</script>

<svelte:head>
  <title>{pageTitle} - WatchAnimeX</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={`${pageTitle} - WatchAnimeX`} />
  <meta property="og:description" content={pageDescription} />
</svelte:head>

<JsonLd data={collectionJsonLd} />


<main class="archive-page container">
  <header class="archive-head">
    <div class="archive-copy">
      <h1>{pageTitle}</h1>
      <p>{categoryInfo.description}</p>
    </div>
    <div class="archive-tally" aria-live="polite">
      <div><strong>{String(items.length).padStart(2, "0")}</strong><span>titles loaded</span></div>
      <small>Page {currentPage} · AniList index</small>
    </div>
  </header>

  <div class="index-status">
    <span>Collection / {pageTitle}</span>
    <span>{loading ? "Updating catalog" : hasNext ? "More records available" : items.length ? "End of current index" : "Awaiting records"}</span>
  </div>

  {#if loading && items.length === 0}
    <div class="poster-grid" aria-label="Loading anime catalog">
      <SkeletonGrid count={18} />
    </div>
  {:else if items.length > 0}
    <div class="poster-grid" aria-busy={loading}>
      {#each items as anime (anime.id || anime.mal_id)}
        <AnimeCard {anime} />
      {/each}
    </div>

    {#if error}
      <p class="inline-error" role="alert">{error}</p>
    {/if}

    {#if hasNext}
      <div class="pagination">
        <span>Showing {items.length} titles across {currentPage} {currentPage === 1 ? "page" : "pages"}</span>
        <button type="button" onclick={() => loadPage(currentPage + 1)} disabled={loading}>
          {loading ? "Loading next page" : `Load page ${currentPage + 1}`}
        </button>
      </div>
    {/if}
  {:else}
    <section class="empty-state" role={error ? "alert" : undefined}>
      <h2>{error ? "Catalog unavailable" : "No titles listed"}</h2>
      <p>{error || "AniList has no matching titles in this section yet."}</p>
      <button type="button" onclick={() => loadPage(1)} disabled={loading}>Try this section again</button>
    </section>
  {/if}
</main>


<style>
  .archive-page {
    padding-top: clamp(2rem, 5vw, 4.75rem);
    padding-bottom: 5rem;
    color: var(--editorial-text, #f1ece4);
  }
  .archive-head {
    min-height: 15rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(10rem, 15rem);
    align-items: end;
    gap: clamp(2rem, 7vw, 7rem);
    padding: clamp(2rem, 5vw, 4.5rem) 0 2rem;
    border-top: 1px solid #3a312b;
    border-bottom: 1px solid #3a312b;
  }
  .archive-copy { min-width: 0; }
  .archive-copy h1 {
    max-width: 16ch;
    margin: 0;
    color: #f1ece4;
    font: 820 clamp(3rem, 8vw, 7.4rem)/0.88 var(--net-display-font, system-ui, sans-serif);
    letter-spacing: -0.068em;
    text-wrap: balance;
  }
  .archive-copy p {
    max-width: 42rem;
    margin: 1.4rem 0 0;
    color: #9f978e;
    font-size: clamp(0.9rem, 1.3vw, 1.06rem);
    line-height: 1.65;
  }
  .archive-tally {
    min-width: 0;
    padding: 1rem 0 0 1.25rem;
    border-left: 3px solid #8d5948;
  }
  .archive-tally > div { display: flex; align-items: end; gap: 0.7rem; }
  .archive-tally strong {
    color: #df886b;
    font-size: clamp(2.8rem, 5vw, 4.8rem);
    font-weight: 820;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.06em;
    line-height: 0.82;
  }
  .archive-tally span { max-width: 5rem; color: #c0b7ad; font-size: 0.74rem; line-height: 1.15; }
  .archive-tally small { display: block; margin-top: 1rem; color: #756e67; font-size: 0.68rem; }

  .index-status {
    min-height: 3.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.6rem;
    color: #756e67;
    border-bottom: 1px solid #28231f;
    font-size: 0.7rem;
  }
  .index-status span:last-child { color: #a79f96; text-align: right; }
  .poster-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    gap: 1.55rem 1.05rem;
  }
  .pagination {
    min-height: 5.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2.8rem;
    padding-top: 1.2rem;
    border-top: 1px solid #3a312b;
  }
  .pagination span { color: #817970; font-size: 0.74rem; }
  .pagination button,
  .empty-state button {
    min-height: 44px;
    padding: 0.65rem 1rem;
    color: #e6ddd3;
    background: #151210;
    border: 1px solid #493b34;
    border-radius: 3px;
    font: 720 0.78rem/1 inherit;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .pagination button:hover:not(:disabled),
  .empty-state button:hover:not(:disabled) { color: #170c09; background: #df886b; border-color: #df886b; }
  .pagination button:focus-visible,
  .empty-state button:focus-visible { outline: 2px solid #efa086; outline-offset: 3px; }
  .pagination button:disabled,
  .empty-state button:disabled { cursor: wait; opacity: 0.55; }
  .inline-error { margin: 1.4rem 0 0; color: #e1a092; font-size: 0.8rem; }
  .empty-state {
    min-height: 18rem;
    display: grid;
    place-content: center;
    justify-items: start;
    padding: 3rem 0;
  }
  .empty-state h2 { margin: 0; color: #ece5dc; font-size: clamp(1.5rem, 3vw, 2.5rem); }
  .empty-state p { max-width: 34rem; margin: 0.7rem 0 1.4rem; color: #918981; line-height: 1.6; }

  @media (max-width: 720px) {
    .archive-page { padding-top: 1.25rem; padding-bottom: 4rem; }
    .archive-head {
      min-height: 0;
      grid-template-columns: 1fr;
      align-items: start;
      gap: 1.8rem;
      padding: 2.4rem 0 1.4rem;
    }
    .archive-copy h1 { max-width: 100%; font-size: clamp(2.7rem, 16vw, 4.8rem); line-height: 0.92; }
    .archive-copy p { margin-top: 1rem; font-size: 0.88rem; line-height: 1.55; }
    .archive-tally { display: flex; align-items: end; justify-content: space-between; gap: 1rem; padding: 0.8rem 0 0 0.85rem; }
    .archive-tally strong { font-size: 2.6rem; }
    .archive-tally small { margin-top: 0; text-align: right; }
    .index-status { margin-bottom: 1.2rem; font-size: 0.64rem; }
    .poster-grid { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 1.1rem 0.7rem; }
    .pagination { align-items: stretch; flex-direction: column; }
    .pagination button { width: 100%; }
  }

  @media (max-width: 480px) {
    .poster-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 0.6rem; }
    .archive-tally span { font-size: 0.68rem; }
    .index-status span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pagination button,
    .empty-state button { transition: none; }
  }
</style>
