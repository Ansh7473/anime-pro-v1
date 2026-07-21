<script lang="ts">
  import MovieCard from "$lib/components/MovieCard.svelte";
  import type { TMDBPage } from "$lib/tmdb";
  import { Film } from "lucide-svelte";

  let { data } = $props<{
    data: { catalog: TMDBPage; category: string; canonicalUrl: string; loadError: string };
  }>();

  const categories = [
    { value: "popular", label: "Popular" },
    { value: "now_playing", label: "In cinemas" },
    { value: "top_rated", label: "Top rated" },
    { value: "upcoming", label: "Upcoming" }
  ];
  const pageTitle = "Films — WatchAnimeX";
  const pageDescription = "Browse live-action and general films in a dedicated catalog, separate from Anime Movies.";
  const pageHref = (page: number) => `/films?category=${data.category}&page=${page}`;
</script>

<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={data.canonicalUrl} />
</svelte:head>

<section class="films-page">
  <header class="masthead">
    <div class="kicker"><Film size={15} /> Film desk · Live action & general cinema</div>
    <h1>Films worth an evening.</h1>
    <p>A separate cinema catalog. Looking for animation? <a href="/movies">Anime Movies remain here.</a></p>
  </header>

  <nav class="category-nav" aria-label="Film categories">
    {#each categories as category}
      <a href={`/films?category=${category.value}`} class:active={data.category === category.value} aria-current={data.category === category.value ? "page" : undefined}>{category.label}</a>
    {/each}
  </nav>

  {#if data.loadError}<div class="notice" role="status">{data.loadError} <a href={pageHref(1)}>Try again</a></div>{/if}

  {#if data.catalog.results.length}
    <div class="film-grid">
      {#each data.catalog.results as movie (movie.id)}<MovieCard {movie} />{/each}
    </div>
  {:else if !data.loadError}
    <div class="empty"><h2>No films on this page.</h2><p>Choose another desk or return to the first page.</p></div>
  {/if}

  <nav class="pagination" aria-label="Film pages">
    {#if data.catalog.page > 1}<a href={pageHref(data.catalog.page - 1)}>← Previous</a>{/if}
    <span>Page {data.catalog.page}{data.catalog.total_pages > 0 ? ` of ${data.catalog.total_pages}` : ""}</span>
    {#if data.catalog.page < data.catalog.total_pages}<a href={pageHref(data.catalog.page + 1)}>Next →</a>{/if}
  </nav>

  <aside class="attribution"><strong>Film data supplied by TMDB.</strong> This product uses the TMDB API but is not endorsed or certified by TMDB. <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">Visit TMDB ↗</a></aside>
</section>

<style>
  .films-page {
    padding-top: clamp(2rem, 5vw, 4.75rem);
    padding-bottom: 5rem;
    max-width: var(--page-max, 1500px);
    margin-inline: auto;
    padding-left: max(var(--page-gutter, 2.5rem), env(safe-area-inset-left));
    padding-right: max(var(--page-gutter, 2.5rem), env(safe-area-inset-right));
    box-sizing: border-box;
    color: var(--editorial-text, #f1ece4);
  }
  .masthead {
    padding: clamp(2rem, 5vw, 4.5rem) 0 2rem;
    border-top: 1px solid #3a312b;
    border-bottom: 1px solid #3a312b;
  }
  .kicker {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.9rem;
    color: #b48a63;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .masthead h1 {
    max-width: 20ch;
    margin: 0;
    color: #f1ece4;
    font: 820 clamp(2.4rem, 6vw, 5rem)/0.94 var(--net-display-font, system-ui, sans-serif);
    letter-spacing: -0.045em;
    text-wrap: balance;
  }
  .masthead p {
    max-width: 42rem;
    margin: 1.2rem 0 0;
    color: #9f978e;
    font-size: clamp(0.9rem, 1.3vw, 1.02rem);
    line-height: 1.6;
  }
  .masthead p a {
    color: #e2aa67;
    font-weight: 600;
    text-decoration: underline;
  }

  .category-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.6rem 0 2.2rem;
  }
  .category-nav a {
    padding: 0.6rem 1.1rem;
    border: 1px solid #332c27;
    color: #b6aea6;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .category-nav a:hover { background: #171310; border-color: #4b3d35; color: #efe3d2; }
  .category-nav a.active { background: #df886b; border-color: #df886b; color: #170c09; }

  .notice {
    margin-bottom: 1.5rem;
    padding: 0.85rem 1rem;
    border: 1px solid #4a2f2a;
    background: #1a1210;
    color: #e1a092;
    font-size: 0.85rem;
  }
  .notice a { margin-left: 0.4rem; color: #efc088; font-weight: 700; text-decoration: underline; }

  .film-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.5rem 1rem;
  }

  .empty {
    min-height: 16rem;
    display: grid;
    place-content: center;
    justify-items: start;
    padding: 3rem 0;
  }
  .empty h2 { margin: 0; color: #ece5dc; font-size: clamp(1.4rem, 3vw, 2.1rem); }
  .empty p { max-width: 34rem; margin: 0.7rem 0 0; color: #918981; line-height: 1.6; }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 2.8rem;
    padding-top: 1.2rem;
    border-top: 1px solid #3a312b;
    color: #817970;
    font-size: 0.78rem;
  }
  .pagination a {
    padding: 0.65rem 1rem;
    border: 1px solid #493b34;
    color: #e6ddd3;
    font-weight: 700;
    text-decoration: none;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .pagination a:hover { color: #170c09; background: #df886b; border-color: #df886b; }

  .attribution {
    display: block;
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #28231f;
    color: #756e67;
    font-size: 0.75rem;
    line-height: 1.6;
  }
  .attribution a { color: #b8ac9d; text-decoration: underline; }

  @media (max-width: 900px) {
    .films-page {
      padding-left: max(var(--page-gutter-md, 1.25rem), env(safe-area-inset-left));
      padding-right: max(var(--page-gutter-md, 1.25rem), env(safe-area-inset-right));
    }
  }
  @media (max-width: 720px) {
    .films-page { padding-top: 1.25rem; padding-bottom: 4rem; }
    .masthead { padding: 2.4rem 0 1.4rem; }
    .masthead h1 { max-width: 100%; font-size: clamp(2.2rem, 12vw, 3.4rem); }
    .film-grid { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 1.1rem 0.7rem; }
    .pagination { align-items: stretch; flex-direction: column; }
    .pagination a { text-align: center; }
  }
  @media (max-width: 480px) {
    .film-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 0.6rem; }
  }
</style>
