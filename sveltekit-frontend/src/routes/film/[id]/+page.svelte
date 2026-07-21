<script lang="ts">
  import { ArrowLeft, ExternalLink, Play, Star } from "lucide-svelte";
  import { tmdbImage, type TMDBMovie } from "$lib/tmdb";

  let { data } = $props<{
    data: { id: string; movie: TMDBMovie; providers: any; region: string; canonicalUrl: string };
  }>();

  const movie = $derived(data.movie);
  const title = $derived(movie.title || movie.original_title || "Untitled film");
  const poster = $derived(tmdbImage(movie.poster_path || movie.poster, "w500"));
  const backdrop = $derived(tmdbImage(movie.backdrop_path || movie.backdrop, "original"));
  const year = $derived(movie.release_date?.slice(0, 4) || "Release TBA");
  const genres = $derived((movie.genres || []).map((genre: any) => typeof genre === "string" ? genre : genre?.name).filter(Boolean));

  function regionProviders(payload: any, region: string) {
    if (!payload) return {};
    if (payload.results?.[region]) return payload.results[region];
    if (payload[region]) return payload[region];
    if (payload.providers && !Array.isArray(payload.providers)) return payload.providers;
    return payload;
  }

  const availability = $derived(regionProviders(data.providers, data.region));
  const providerGroups = $derived([
    { key: "flatrate", label: "Stream" },
    { key: "free", label: "Free" },
    { key: "ads", label: "With ads" },
    { key: "rent", label: "Rent" },
    { key: "buy", label: "Buy" }
  ].map((group) => ({ ...group, items: Array.isArray(availability?.[group.key]) ? availability[group.key] : [] })).filter((group) => group.items.length));
  const providerLink = $derived(availability?.link || data.providers?.link || "");
  const runtime = $derived(movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "");
</script>

<svelte:head>
  <title>{title} ({year}) — Films</title>
  <meta name="description" content={movie.overview || `Details and viewing information for ${title}.`} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={movie.overview || "Film details"} />
  {#if backdrop}<meta property="og:image" content={backdrop} />{/if}
  <meta property="og:url" content={data.canonicalUrl} />
</svelte:head>

<article class="detail-page">
  {#if backdrop}<div class="backdrop" style={`background-image:linear-gradient(90deg,#100d0a 7%,rgba(16,13,10,.75) 53%,rgba(16,13,10,.9)),url('${backdrop}')`}></div>{/if}
  <a class="back" href="/films"><ArrowLeft size={16} /> Back to Films</a>
  <section class="hero">
    <div class="poster">{#if poster}<img src={poster} alt={`Poster for ${title}`} />{:else}<span>Poster unavailable</span>{/if}</div>
    <div class="hero-copy">
      <p class="eyebrow">Film desk · TMDB {data.id}</p>
      <h1>{title}</h1>
      {#if movie.tagline}<p class="tagline">“{movie.tagline}”</p>{/if}
      <div class="facts"><span>{year}</span>{#if runtime}<span>{runtime}</span>{/if}{#if movie.vote_average}<span class="rating"><Star size={14} fill="currentColor" /> {movie.vote_average.toFixed(1)}</span>{/if}</div>
      {#if genres.length}<div class="genres">{#each genres as genre}<span>{genre}</span>{/each}</div>{/if}
      <p class="overview">{movie.overview || "No synopsis is available for this film."}</p>
      <a class="play-btn" href={`/watch/movie/${data.id}`}><Play size={16} fill="currentColor" /> Play via third-party embed</a>
    </div>
  </section>

  <section class="providers">
    <h2>Where to watch</h2>
    {#if providerGroups.length}
      <div class="provider-groups">
        {#each providerGroups as group (group.key)}
          <div class="provider-group">
            <span class="group-label">{group.label}</span>
            <div class="provider-list">
              {#each group.items as provider (provider.provider_id)}
                <span class="provider-chip" title={provider.provider_name}>
                  {#if provider.logo_path}
                    <img src={tmdbImage(provider.logo_path, "w92")} alt={provider.provider_name} loading="lazy" />
                  {:else}
                    <span class="chip-fallback">{(provider.provider_name || "?").slice(0, 1)}</span>
                  {/if}
                </span>
              {/each}
            </div>
          </div>
        {/each}
      </div>
      {#if providerLink}
        <a class="provider-link" href={providerLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> View all options for {data.region}
        </a>
      {/if}
      <p class="provider-attribution">Streaming availability data provided by JustWatch.</p>
    {:else}
      <p class="providers-empty">No legal streaming, rental, or purchase availability was found for {data.region}.</p>
    {/if}
  </section>

  <aside class="attribution">
    <strong>Film data supplied by TMDB.</strong> This product uses the TMDB API but is not endorsed or certified by
    TMDB. <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">Visit TMDB ↗</a>
  </aside>
</article>

<style>
  .detail-page {
    position: relative;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 4rem;
  }
  .backdrop {
    position: absolute;
    inset: 0;
    height: 480px;
    background-size: cover;
    background-position: center top;
    z-index: -1;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 2rem;
    color: #cfc6ba;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
  }
  .back:hover { color: #efe3d2; }
  .hero {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
  }
  .poster {
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border: 1px solid #302821;
    background: #15120f;
  }
  .poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .poster span {
    display: grid;
    height: 100%;
    place-items: center;
    padding: 1rem;
    color: #8f8174;
    font-size: 0.75rem;
    text-align: center;
  }
  .hero-copy { min-width: 0; color: #efe6da; }
  .eyebrow {
    margin: 0 0 0.5rem;
    color: #b48a63;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 { margin: 0 0 0.5rem; font: 800 clamp(1.75rem, 3vw, 2.6rem)/1.1 var(--net-display-font, system-ui); letter-spacing: -0.03em; }
  .tagline { margin: 0 0 0.85rem; color: #9f9082; font-style: italic; }
  .facts { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.85rem; color: #b8ac9d; font-size: 0.88rem; }
  .rating { display: flex; align-items: center; gap: 0.3rem; color: #e2aa67; }
  .genres { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .genres span {
    padding: 0.3rem 0.65rem;
    border: 1px solid #3a3128;
    color: #cfc6ba;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .overview { max-width: 62ch; margin: 0 0 1.25rem; color: #cbc1b3; line-height: 1.65; }
  .play-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: #e2aa67;
    color: #1c140b;
    font-weight: 800;
    font-size: 0.88rem;
    text-decoration: none;
  }
  .play-btn:hover { background: #efc088; }

  .providers { margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid #2c2620; }
  .providers h2 { margin: 0 0 1rem; color: #efe6da; font: 750 1.15rem/1.2 var(--net-display-font, system-ui); }
  .provider-groups { display: flex; flex-direction: column; gap: 0.85rem; }
  .provider-group { display: flex; align-items: center; gap: 1rem; }
  .group-label { flex: 0 0 5.5rem; color: #9f9082; font-size: 0.78rem; font-weight: 700; }
  .provider-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .provider-chip {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    overflow: hidden;
    border-radius: 8px;
    background: #201a15;
  }
  .provider-chip img { width: 100%; height: 100%; object-fit: cover; }
  .chip-fallback { color: #8f8174; font-weight: 800; }
  .provider-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1rem;
    color: #e2aa67;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
  }
  .provider-link:hover { text-decoration: underline; }
  .provider-attribution, .providers-empty { margin: 1rem 0 0; color: #756e67; font-size: 0.75rem; }

  .attribution {
    display: block;
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #2c2620;
    color: #756e67;
    font-size: 0.75rem;
    line-height: 1.6;
  }
  .attribution a { color: #b8ac9d; text-decoration: underline; }

  @media (max-width: 720px) {
    .hero { grid-template-columns: 140px minmax(0, 1fr); gap: 1.25rem; }
    .backdrop { height: 320px; }
    .group-label { flex-basis: 4.5rem; }
  }
  @media (max-width: 480px) {
    .hero { grid-template-columns: 1fr; }
    .poster { max-width: 160px; }
  }
</style>
