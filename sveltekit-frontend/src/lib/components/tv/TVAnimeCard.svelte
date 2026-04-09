<script lang="ts">
  import { goto } from "$app/navigation";

  let { anime } = $props<{
    anime: any;
  }>();

  const poster = $derived(
    anime?.poster || anime?.image || anime?.images?.jpg?.large_image_url || "",
  );
  const rawTitle = $derived(
    anime?.title || anime?.name || anime?.userPreferred || anime?.title_english,
  );
  const title = $derived.by(() => {
    if (typeof rawTitle === "string" && rawTitle) return rawTitle;
    if (typeof rawTitle === "object" && rawTitle !== null) {
      return (
        rawTitle.english ||
        rawTitle.userPreferred ||
        rawTitle.romaji ||
        rawTitle.native ||
        "Unknown Anime"
      );
    }
    return "Unknown Anime";
  });
  const score = $derived(anime?.score || anime?.rating || 0);
  const id = $derived(anime?.id || anime?.mal_id);

  function handleNavigate(e?: Event) {
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }
</script>

<a
  href="/anime/{id}"
  class="tv-card"
  role="button"
  tabindex="0"
  onclick={handleNavigate}
>
  <div class="tv-card-img-wrap">
    <img src={poster} alt={title} loading="lazy" />
    <div class="tv-card-overlay">
      <div class="tv-card-play">▶</div>
    </div>
    
    <div class="tv-card-meta-top">
      {#if score > 0}
        <span class="tv-card-score">
          ⭐ {typeof score === "number" && score > 10 ? (score / 10).toFixed(1) : score.toFixed(1)}
        </span>
      {/if}
    </div>
  </div>
  <div class="tv-card-footer">
    <p class="tv-card-title">{title}</p>
  </div>
</a>

<style>
  .tv-card {
    display: block;
    flex-shrink: 0;
    width: 240px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    padding: 8px;
    outline: none;
  }

  .tv-card:focus-visible,
  .tv-card:hover {
    transform: scale(1.1);
    z-index: 10;
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--net-red);
    box-shadow: 0 0 40px rgba(229, 9, 20, 0.4);
  }

  .tv-card-img-wrap {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background: #000;
  }

  .tv-card-img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .tv-card-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }

  .tv-card:focus-visible .tv-card-overlay,
  .tv-card:hover .tv-card-overlay {
    opacity: 1;
  }

  .tv-card-play {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--net-red);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    color: white;
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.5);
  }

  .tv-card-meta-top {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
  }

  .tv-card-score {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    color: #fbbf24;
    font-weight: 800;
    font-size: 1rem;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .tv-card-footer {
    padding: 12px 6px 4px;
  }

  .tv-card-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
    transition: color 0.3s;
  }

  .tv-card:focus-visible .tv-card-title,
  .tv-card:hover .tv-card-title {
    color: var(--net-red);
  }
</style>
