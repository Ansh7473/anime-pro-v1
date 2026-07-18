<script lang="ts">
  import { goto } from "$app/navigation";
  import { getProxiedImage } from "$lib/api";
  let { anime } = $props<{anime:any}>();
  const poster=$derived(anime?.poster||anime?.image||anime?.images?.jpg?.large_image_url||"");
  const rawTitle=$derived(anime?.title||anime?.name||anime?.userPreferred||anime?.title_english);
  const title=$derived.by(()=>typeof rawTitle==="string"&&rawTitle?rawTitle:rawTitle?.english||rawTitle?.userPreferred||rawTitle?.romaji||rawTitle?.native||"Unknown anime");
  const rawScore=$derived(Number(anime?.score||anime?.rating||0)); const score=$derived(rawScore>10?rawScore/10:rawScore);
  const id=$derived(anime?.id||anime?.mal_id); const format=$derived(String(anime?.type||anime?.format||"Series").replace(/_/g," "));
  function open(e:Event){e.preventDefault();if(id)goto(`/anime/${id}`)}
</script>
<a href="/anime/{id}" class="tv-card" onclick={open} aria-label={title}>
  <div class="poster"><img src={getProxiedImage(poster)} alt="" loading="lazy" decoding="async"/>{#if score}<span class="score">{score.toFixed(1)}</span>{/if}<span class="open" aria-hidden="true">View ↗</span></div>
  <div class="copy"><h3>{title}</h3><p>{format}</p></div>
</a>
<style>
  .tv-card{display:block;flex:0 0 232px;width:232px;padding:7px;color:#f1ece4;text-decoration:none;border:3px solid transparent;border-radius:5px;background:#0c0b0a;outline:none;transition:border-color .15s,background .15s}.poster{position:relative;aspect-ratio:2/3;overflow:hidden;border-radius:3px;background:#171411}.poster img{width:100%;height:100%;object-fit:cover;filter:saturate(.86)}
  .score{position:absolute;top:10px;right:10px;padding:6px 9px;border-radius:3px;background:#090807;color:#e5a087;font-size:.92rem;font-weight:850}.open{position:absolute;inset:auto 0 0;display:block;padding:1rem;background:linear-gradient(transparent,rgba(7,7,6,.96));color:#f4eee6;font-size:.9rem;font-weight:800;text-align:right;opacity:0;transition:opacity .15s}.copy{padding:12px 5px 5px}h3{margin:0;overflow:hidden;font-size:1.08rem;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}p{margin:.35rem 0 0;color:#817a72;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em}
  .tv-card:hover,.tv-card:focus-visible{border-color:#e28b6e;background:#171310}.tv-card:hover .open,.tv-card:focus-visible .open{opacity:1}.tv-card:hover h3,.tv-card:focus-visible h3{color:#f1a287}.tv-card:focus-visible{outline:4px solid #f0ab93;outline-offset:5px}
</style>