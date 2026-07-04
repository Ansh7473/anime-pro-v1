<script lang="ts">
  import { goto } from "$app/navigation";

  let { anime, size = "normal" } = $props<{
    anime: any;
    size?: "small" | "normal" | "large";
  }>();

  let imgError = $state(false);

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
  const rawScore = $derived(anime?.score || anime?.rating || 0);
  const score = $derived(rawScore > 10 ? rawScore / 10 : rawScore);
  const id = $derived(anime?.id || anime?.mal_id);

  function handleNavigate(e?: Event) {
    if (e instanceof MouseEvent && (e.button === 1 || e.ctrlKey || e.metaKey)) return;
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleNavigate(e);
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
  <div class="card-poster">
    {#if poster && !imgError}
      <img src={poster} alt={title} loading="lazy" decoding="async" onerror={() => (imgError = true)} />
    {:else}
      <div class="card-fallback" aria-label={title}>
        <span class="cf-mark">ワ</span>
        <span class="cf-title">{title}</span>
      </div>
    {/if}
    {#if score > 0}
      <span class="score-badge">★ {score.toFixed(1)}</span>
    {/if}
  </div>
  <p class="card-title">{title}</p>
</a>

<style>
  .card {
    display: block;
    flex-shrink: 0;
    width: 160px;
    cursor: pointer;
    text-decoration: none;
    scroll-snap-align: start;
    transition: transform 0.2s ease;
  }
  .card:hover,
  .card:focus-visible {
    transform: scale(1.05);
    z-index: 10;
    outline: none;
  }

  .card.small { width: 130px; }
  .card.large { width: 220px; }

  .card-poster {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background: linear-gradient(160deg, #17171a, #0c0c0e);
    border: 2px solid transparent;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .card:hover .card-poster,
  .card:focus-visible .card-poster {
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.12), 0 8px 24px rgba(0, 0, 0, 0.5);
  }

  .card-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .card:hover .card-poster img {
    transform: scale(1.05);
  }

  .card-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    text-align: center;
    background:
      radial-gradient(120% 80% at 50% 0%, rgba(229, 9, 20, 0.18), transparent 70%),
      linear-gradient(160deg, #17171a, #0c0c0e);
  }
  .card-fallback .cf-mark {
    font-size: 1.6rem;
    font-weight: 800;
    color: rgba(229, 9, 20, 0.55);
    line-height: 1;
  }
  .card-fallback .cf-title {
    font-size: 0.72rem;
    font-weight: 600;
    color: #c8c8cc;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .score-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    background: rgba(0, 0, 0, 0.75);
    color: #fbbf24;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 6px;
    line-height: 1.4;
    pointer-events: none;
  }

  .card-title {
    margin-top: 6px;
    padding: 0 2px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #a3a3a3;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
  }
  .card:hover .card-title,
  .card:focus-visible .card-title {
    color: #ffffff;
  }

  @media (max-width: 768px) {
    .card { width: 140px; }
    .card.small { width: 110px; }
    .card.large { width: 180px; }
    .card-title { font-size: 0.78rem; }
  }

  @media (max-width: 480px) {
    .card { width: 110px; }
    .card.small { width: 95px; }
    .card.large { width: 140px; }
    .card-title { font-size: 0.72rem; }
    .card-poster { border-radius: 10px; }
    .score-badge { font-size: 0.6rem; padding: 1px 5px; }
  }
</style>
