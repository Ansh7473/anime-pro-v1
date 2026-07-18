<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { getAnimeTitle } from "$lib/animeTitle";
  import { titleLanguage } from "$lib/stores/titleLanguage";

  let { item } = $props<{ item: any }>();
  let imgError = $state(false);
  const poster = $derived(getProxiedImage(item?.poster || item?.image || ""));
  const title = $derived(getAnimeTitle(item, $titleLanguage));
  const epNum = $derived(item?.episode || item?.episodeNumber || 1);
  const progress = $derived(Number(item?.progress || 0));
  const duration = $derived(Number(item?.duration || 0));
  const percent = $derived(duration > 0 ? Math.min((progress / duration) * 100, 100) : 0);
  const id = $derived(item?.id || item?.animeId);
  const remaining = $derived.by(() => {
    if (!duration) return "Resume";
    if (percent >= 98) return "Finished";
    const seconds = Math.max(0, Math.round(duration - progress));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} left`;
  });
</script>

<a href="/watch/{id}/{epNum}" class="resume-card" aria-label="Continue {title}, episode {epNum}">
  <div class="media">
    {#if poster && !imgError}<img src={poster} alt="" loading="lazy" decoding="async" onerror={() => (imgError = true)} />{:else}<span class="fallback" aria-hidden="true">ワ</span>{/if}
    <span class="play-mark" aria-hidden="true">▶</span>
    <span class="progress-track" aria-hidden="true"><span style={`width:${percent}%`}></span></span>
  </div>
  <div class="copy">
    <strong>{title}</strong>
    <div><span>Episode {epNum}</span><span>{remaining}</span></div>
  </div>
</a>

<style>
  .resume-card {
    flex: 0 0 clamp(216px, 18vw, 268px);
    min-width: 0;
    color: inherit;
    text-decoration: none;
    scroll-snap-align: start;
  }
  .media {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid #2b2622;
    border-radius: 2px;
    background: #11100e;
  }
  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 25%;
    filter: saturate(0.82) contrast(1.035);
    transition: filter 0.18s ease;
  }
  .fallback {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    color: #615a53;
    font-size: 1.6rem;
  }
  .play-mark {
    position: absolute;
    left: 0.6rem;
    bottom: 0.6rem;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(241, 226, 216, 0.22);
    border-radius: 2px;
    background: rgba(9, 8, 7, 0.86);
    color: #e8ddd3;
    font-size: 0.62rem;
  }
  .progress-track {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 3px;
    background: rgba(7, 7, 6, 0.74);
  }
  .progress-track span {
    display: block;
    height: 100%;
    background: #d8896d;
  }
  .copy { padding: 0.62rem 0.12rem 0; }
  .copy strong {
    display: block;
    overflow: hidden;
    color: #ded7ce;
    font-size: 0.82rem;
    font-weight: 720;
    line-height: 1.32;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .copy div {
    display: flex;
    justify-content: space-between;
    gap: 0.8rem;
    margin-top: 0.34rem;
    padding-top: 0.4rem;
    border-top: 1px solid #211d1a;
    color: #756e67;
    font-size: 0.62rem;
    font-variant-numeric: tabular-nums;
  }
  .resume-card:hover .media img { filter: saturate(1) contrast(1.055); }
  .resume-card:hover .copy strong { color: #f1a287; }
  .resume-card:focus-visible {
    outline: 2px solid #efae98;
    outline-offset: 4px;
    border-radius: 2px;
  }
  @media (max-width: 640px) {
    .resume-card { flex-basis: clamp(208px, 72vw, 250px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .media img { transition: none; }
  }
</style>