<script lang="ts">
  import { ArrowLeft, ExternalLink } from "lucide-svelte";
  import type { TMDBMovie } from "$lib/tmdb";

  let { data } = $props<{ data: { id: string; movie: TMDBMovie | null; canonicalUrl: string } }>();
  const title = $derived(data.movie?.title || data.movie?.original_title || `TMDB film ${data.id}`);
  const embedUrl = $derived(`https://vidnest.fun/movie/${data.id}`);
</script>

<svelte:head>
  <title>Watch {title} — Third-party player</title>
  <meta name="description" content={`Third-party embedded player for ${title}.`} />
  <meta name="robots" content="noindex,follow" />
  <meta property="og:url" content={data.canonicalUrl} />
</svelte:head>

<main class="player-page">
  <header>
    <a href={`/film/${data.id}`}><ArrowLeft size={16} /> Film details</a>
    <div><p>Third-party embed</p><h1>{title}</h1></div>
  </header>

  <div class="embed-frame">
    <iframe
      src={embedUrl}
      title={`Third-party player for ${title}`}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      referrerpolicy="no-referrer"
      allowfullscreen
    ></iframe>
  </div>

  <aside>
    <ExternalLink size={17} />
    <p><strong>External playback service.</strong> This player is provided by Vidnest, not TMDB or WatchAnimeX. Availability and content are controlled by that third party.</p>
  </aside>
</main>

<style>
  .player-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 4rem;
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin-bottom: 1.5rem;
  }
  header a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #cfc6ba;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
  }
  header a:hover { color: #efe3d2; }
  header p {
    margin: 0 0 0.3rem;
    color: #b48a63;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  header h1 {
    margin: 0;
    color: #efe6da;
    font: 800 clamp(1.4rem, 2.6vw, 2rem)/1.15 var(--net-display-font, system-ui);
    letter-spacing: -0.02em;
  }
  .embed-frame {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid #302821;
    background: #000;
  }
  .embed-frame iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
  aside {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    margin-top: 1.5rem;
    padding: 0.9rem 1rem;
    border: 1px solid #332c27;
    background: #15120f;
    color: #b8ac9d;
  }
  aside :global(svg) { flex-shrink: 0; margin-top: 0.15rem; color: #e2aa67; }
  aside p { margin: 0; font-size: 0.82rem; line-height: 1.6; }
  aside strong { color: #efe6da; }

  @media (max-width: 640px) {
    .player-page { padding: 1rem 0.85rem 3rem; }
  }
</style>
