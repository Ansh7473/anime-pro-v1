<script lang="ts">
  import { goto } from "$app/navigation";

  let { anime, size = "normal" } = $props<{
    anime: any;
    size?: "small" | "normal" | "large";
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
    // If middle click or ctrl click, let the browser handle it naturally
    if (e instanceof MouseEvent && (e.button === 1 || e.ctrlKey || e.metaKey)) return;
    
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleNavigate(e);
    }
  }
</script>

<a
  href="/anime/{id}"
  class="card"
  class:small={size === "small"}
  class:large={size === "large"}
  role="button"
  tabindex="0"
  onclick={handleNavigate}
  onkeydown={handleKeydown}
>
<div class="card-img-wrap">
    <img src={poster} alt={title} loading="lazy" />
    <div class="card-overlay">
      <div class="card-play">▶</div>
    </div>
    
    <!-- Tactical Metadata Overlays -->
    <div class="tactical-meta-top">
      {#if score > 0}
        <span class="card-score">
          <span class="score-label">RATING</span>
          {score.toFixed(1)}
        </span>
      {/if}
    </div>

    <div class="tactical-meta-bottom">
      <div class="status-indicator">
        <div class="bit"></div>
        <span>SYNC_OK</span>
      </div>
    </div>
  </div>
  <div class="card-footer">
    <p class="card-title">{title}</p>
  </div>
</a>

<style>
  .card {
    display: block;
    flex-shrink: 0;
    width: 160px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 6px;
  }
  .card:hover,
  .card:focus-visible {
    transform: translateY(-8px) scale(var(--tv-card-scale, 1.05));
    z-index: 10;
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--tv-focus-border, rgba(173, 199, 255, 0.3));
    box-shadow: 
      0 10px 40px -10px rgba(0, 0, 0, 0.7),
      0 0 25px var(--tv-focus-glow, rgba(173, 199, 255, 0.1));
    outline: none; /* We use box-shadow/border for a cleaner look */
  }

  .card.small { width: 130px; }
  .card.large { width: 220px; }

  .card-img-wrap {
    position: relative;
    border-radius: calc(var(--radius-lg) - 2px);
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background: #000;
  }
  .card-img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card:hover img {
    transform: scale(1.1);
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 2;
  }
  .card:hover .card-overlay,
  .card:focus-visible .card-overlay {
    opacity: 1;
  }
  .card-play {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--tactical-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: #000;
    box-shadow: 0 0 20px var(--tactical-primary);
  }

  /* Tactical Overlays */
  .tactical-meta-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 8px;
    display: flex;
    justify-content: flex-end;
    z-index: 3;
  }
  .card-score {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    color: var(--tactical-primary);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid rgba(173, 199, 255, 0.2);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1;
  }
  .score-label {
    font-size: 0.5rem;
    opacity: 0.6;
    margin-bottom: 2px;
  }

  .tactical-meta-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    z-index: 3;
    opacity: 0.8;
  }
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: rgba(255,255,255,0.7);
    letter-spacing: 0.05em;
  }
  .status-indicator .bit {
    width: 4px;
    height: 4px;
    background: #4ADE80;
    border-radius: 50%;
    box-shadow: 0 0 8px #4ADE80;
  }

  .card-footer {
    padding: 10px 4px 6px;
  }
  .card-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
    transition: color 0.3s;
  }
  .card:hover .card-title,
  .card:focus-visible .card-title {
    color: var(--tactical-primary);
  }

  @media (max-width: 768px) {
    .card { width: 140px; padding: 4px; }
    .card.small { width: 110px; }
    .card.large { width: 180px; }
    .card-title { font-size: 0.8rem; }
    .card-play { width: 36px; height: 36px; font-size: 1rem; }
  }

  @media (max-width: 480px) {
    .card { width: 110px; }
    .card.small { width: 95px; }
    .card.large { width: 140px; }
    .card-title { font-size: 0.75rem; }
  }
</style>
