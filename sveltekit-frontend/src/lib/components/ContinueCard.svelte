<script lang="ts">
  import { getProxiedImage } from "$lib/api";

  let { item } = $props<{ item: any }>();
  let imgError = $state(false);
  const poster = $derived(getProxiedImage(item?.poster || item?.image || ""));
  const rawTitle = $derived(item?.title || item?.name);
  const title = $derived.by(() => typeof rawTitle === "string" ? rawTitle : rawTitle?.english || rawTitle?.romaji || rawTitle?.native || "Untitled anime");
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
  .resume-card{flex:0 0 clamp(248px,21vw,320px);color:inherit;text-decoration:none;scroll-snap-align:start}.media{position:relative;aspect-ratio:16/9;overflow:hidden;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);background:#151311}.media img{width:100%;height:100%;object-fit:cover;object-position:center 25%;filter:saturate(.8) contrast(1.04);transition:filter .18s ease}.fallback{display:grid;width:100%;height:100%;place-items:center;color:#615a53;font-size:2rem}.play-mark{position:absolute;inset:0;display:grid;place-items:center;color:#f3ece3;font-size:.8rem;text-shadow:0 1px 3px #000}.progress-track{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(7,7,6,.72)}.progress-track span{display:block;height:100%;background:#d47759}.copy{padding-top:.72rem}.copy strong{display:block;overflow:hidden;color:#ece6dd;font-size:.86rem;font-weight:780;text-overflow:ellipsis;white-space:nowrap}.copy div{display:flex;justify-content:space-between;gap:.8rem;margin-top:.38rem;padding-top:.46rem;border-top:1px solid #211d1a;color:#79726b;font-size:.65rem;font-variant-numeric:tabular-nums}.resume-card:hover .media img{filter:saturate(1) contrast(1.06)}.resume-card:hover .copy strong{color:#f1a287}.resume-card:focus-visible{outline:2px solid #efae98;outline-offset:4px;border-radius:2px}@media(max-width:640px){.resume-card{flex-basis:min(82vw,300px)}}@media(prefers-reduced-motion:reduce){.media img{transition:none}}
</style>