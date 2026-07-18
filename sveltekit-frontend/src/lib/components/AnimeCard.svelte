<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { getAnimeTitle } from "$lib/animeTitle";
  import { titleLanguage } from "$lib/stores/titleLanguage";

  let { anime, size = "normal", rank = 0, preferArtwork = false } = $props<{
    anime: any;
    size?: "small" | "normal" | "large";
    rank?: number;
    preferArtwork?: boolean;
  }>();

  const source = $derived(anime?.entry || anime?.media || anime || {});
  let imgError = $state(false);
  const poster = $derived(
    (preferArtwork ? source?.artwork?.poster : "") ||
      source?.poster ||
      source?.image ||
      source?.coverImage?.large ||
      source?.images?.jpg?.large_image_url ||
      "",
  );
  const title = $derived(getAnimeTitle(source, $titleLanguage));
  const rawScore = $derived(Number(source?.score || source?.rating || 0));
  const score = $derived(rawScore > 10 ? rawScore / 10 : rawScore);
  const id = $derived(source?.id || source?.mal_id);
  const status = $derived(String(source?.status || "").toUpperCase());
  const isAiring = $derived(status.includes("RELEASING") || status.includes("AIRING") || status.includes("CURRENT"));
  const format = $derived(String(source?.type || source?.format || "Series").replace(/_/g, " "));
  const episodes = $derived(Number(source?.episodes || source?.totalEpisodes || source?.episodeCount || 0));
  const year = $derived(source?.year || source?.seasonYear || "");
  const relation = $derived(String(anime?.relationType || anime?.relation || "").replace(/_/g, " "));
</script>

<a href="/anime/{id}" data-sveltekit-preload-data="tap" class="card" class:small={size === "small"} class:large={size === "large"} aria-label={rank ? `Number ${rank}, ${title}` : title}>
  <div class="poster">
    {#if poster && !imgError}
      <img src={getProxiedImage(poster)} alt="" loading="lazy" decoding="async" onerror={() => (imgError = true)} />
    {:else}
      <div class="fallback" aria-hidden="true"><span>ワ</span><small>{title}</small></div>
    {/if}
    {#if rank > 0}<span class="rank">{String(rank).padStart(2, "0")}</span>{/if}
    {#if isAiring}<span class="airing">Now airing</span>{/if}
  </div>
  <div class="copy">
    <h3>{title}</h3>
    <div class="meta">
      <span>{relation || format}{year ? ` · ${year}` : ""}</span>
      {#if score || episodes}<span class="measure">{score ? `★ ${score.toFixed(1)}` : `${episodes} ep`}</span>{/if}
    </div>
  </div>
</a>

<style>
  .card {
    display: flex;
    min-width: 0;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    border-radius: 4px;
    background: #0d0c0b;
    color: inherit;
    text-decoration: none;
    transition: background 160ms ease;
  }
  .poster {
    position: relative;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    background: #151311;
  }
  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(.88) contrast(1.025);
    transition: filter 180ms ease;
  }
  .airing,
  .rank {
    position: absolute;
    bottom: 0;
    min-height: 26px;
    display: inline-flex;
    align-items: center;
    background: rgba(7, 7, 6, .92);
    color: #e9e1d8;
    font-size: .62rem;
    font-weight: 800;
  }
  .airing {
    left: 0;
    padding: .36rem .55rem;
    color: #efa086;
    letter-spacing: .025em;
  }
  .rank {
    right: 0;
    min-width: 2.45rem;
    justify-content: center;
    padding: .36rem .5rem;
    font-variant-numeric: tabular-nums;
  }
  .fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: .7rem;
    padding: 1rem;
    color: #655e57;
  }
  .fallback span { font-size: 2rem; }
  .fallback small { max-width: 100%; color: #8f877f; font-size: .7rem; text-align: center; }
  .copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: .5rem;
    padding: .72rem .72rem .78rem;
  }
  h3 {
    margin: 0;
    color: #eee8df;
    font-size: .88rem;
    font-weight: 780;
    line-height: 1.3;
    letter-spacing: -.014em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
  .meta {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: .6rem;
    margin-top: auto;
    color: #777068;
    font-size: .64rem;
    line-height: 1.25;
  }
  .meta > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .measure {
    flex: 0 0 auto;
    color: #a49b92;
    font-variant-numeric: tabular-nums;
  }
  .card:hover { background: #161310; }
  .card:hover .poster img { filter: saturate(1) contrast(1.04); }
  .card:hover h3, .card:hover .measure { color: #f1a287; }
  .card:focus-visible { outline: 2px solid #efae98; outline-offset: 4px; }
  .card.small { max-width: 160px; }
  .card.large { max-width: 280px; }
  @media (max-width: 640px) {
    .copy { gap: .4rem; padding: .62rem .6rem .68rem; }
    h3 { font-size: .81rem; }
    .meta { font-size: .59rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .poster img { transition: none; }
  }
</style>