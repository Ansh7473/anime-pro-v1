<script lang="ts">
  let { anime, size = "normal" } = $props<{
    anime: any;
    size?: "small" | "normal" | "large";
  }>();

  const poster = $derived(
    anime?.poster || anime?.image || anime?.images?.jpg?.large_image_url || "",
  );
  const title = $derived(anime?.title || anime?.title_english || "Unknown");
  const score = $derived(anime?.score || anime?.rating || 0);
  const id = $derived(anime?.id || anime?.mal_id);
</script>

<a
  href="/anime/{id}"
  class="card"
  class:small={size === "small"}
  class:large={size === "large"}
>
  <div class="card-img-wrap">
    <img src={poster} alt={title} loading="lazy" />
    <div class="card-overlay">
      <div class="card-play">▶</div>
    </div>
    {#if score > 0}
      <span class="card-score">⭐ {score.toFixed(1)}</span>
    {/if}
  </div>
  <p class="card-title">{title}</p>
</a>

<style>
  .card {
    display: block;
    flex-shrink: 0;
    width: 160px;
    transition: transform 0.3s ease;
    cursor: pointer;
  }
  .card:hover {
    transform: scale(1.08);
    z-index: 2;
  }
  .card.small {
    width: 130px;
  }
  .card.large {
    width: 200px;
  }
  .card-img-wrap {
    position: relative;
    border-radius: var(--radius-lg);
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background: var(--net-card-bg);
  }
  .card-img-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .card:hover .card-overlay {
    opacity: 1;
  }
  .card-play {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(229, 9, 20, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    color: white;
  }
  .card-score {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(0, 0, 0, 0.75);
    color: #fbbf24;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .card-title {
    margin-top: 0.5rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--net-text-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .card:hover .card-title {
    color: white;
  }

  @media (max-width: 768px) {
    .card {
      width: 120px;
    }
    .card.small {
      width: 100px;
    }
    .card.large {
      width: 150px;
    }
    .card-title {
      font-size: 0.8rem;
    }
    .card-play {
      width: 36px;
      height: 36px;
      font-size: 1rem;
    }
    .card-score {
      font-size: 0.65rem;
      padding: 1px 4px;
    }
  }

  @media (max-width: 480px) {
    .card {
      width: 100px;
    }
    .card.small {
      width: 85px;
    }
    .card.large {
      width: 120px;
    }
    .card-title {
      font-size: 0.75rem;
    }
    .card-play {
      width: 32px;
      height: 32px;
      font-size: 0.9rem;
    }
    .card-score {
      font-size: 0.6rem;
      padding: 1px 3px;
      top: 4px;
      right: 4px;
    }
  }
</style>
