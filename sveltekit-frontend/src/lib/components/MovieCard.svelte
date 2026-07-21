<script lang="ts">
  import { CalendarDays, Star } from "lucide-svelte";
  import { tmdbImage, type TMDBMovie } from "$lib/tmdb";

  let { movie } = $props<{ movie: TMDBMovie }>();
  const title = $derived(movie.title || movie.original_title || "Untitled film");
  const year = $derived(movie.release_date?.slice(0, 4) || "TBA");
  const rating = $derived(Number(movie.vote_average || 0));
  const poster = $derived(tmdbImage(movie.poster_path || movie.poster, "w500"));
</script>

<article class="movie-card">
  <a class="poster-link" href={`/film/${movie.id}`} aria-label={`View ${title}`}>
    {#if poster}
      <img src={poster} alt={`Poster for ${title}`} loading="lazy" decoding="async" />
    {:else}
      <div class="poster-missing"><span>Poster unavailable</span></div>
    {/if}
    <span class="details-cue">View film</span>
  </a>
  <div class="copy">
    <h2><a href={`/film/${movie.id}`}>{title}</a></h2>
    <div class="meta">
      <span><CalendarDays size={13} /> {year}</span>
      {#if rating > 0}<span><Star size={13} fill="currentColor" /> {rating.toFixed(1)}</span>{/if}
    </div>
  </div>
</article>

<style>
  .movie-card{min-width:0;background:#15120f;border:1px solid #302821;box-shadow:0 14px 34px rgba(0,0,0,.18)}
  .poster-link{position:relative;display:block;aspect-ratio:2/3;overflow:hidden;background:#201a15;color:#efe6da;text-decoration:none}
  img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .25s ease}
  .movie-card:hover img{transform:scale(1.025)}
  .poster-missing{height:100%;display:grid;place-items:center;padding:1rem;color:#8f8174;font:700 .7rem/1.4 system-ui;text-align:center;text-transform:uppercase;letter-spacing:.08em}
  .details-cue{position:absolute;right:.6rem;bottom:.6rem;padding:.38rem .55rem;background:#efe3d2;color:#21160f;font-size:.66rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
  .copy{padding:.85rem .8rem 1rem}
  h2{margin:0 0 .55rem;font:750 1rem/1.18 var(--net-display-font,system-ui);letter-spacing:-.025em}
  h2 a{display:-webkit-box;overflow:hidden;color:#f2e9dc;text-decoration:none;-webkit-box-orient:vertical;-webkit-line-clamp:2}
  h2 a:hover{color:#e8a47e}
  .meta{display:flex;align-items:center;gap:.75rem;color:#9f9082;font-size:.72rem}
  .meta span{display:flex;align-items:center;gap:.28rem}.meta span:last-child{color:#e2aa67}
  @media(max-width:480px){.copy{padding:.72rem .65rem .85rem}h2{font-size:.9rem}.details-cue{font-size:.6rem}}
  @media(prefers-reduced-motion:reduce){img{transition:none}}
</style>
