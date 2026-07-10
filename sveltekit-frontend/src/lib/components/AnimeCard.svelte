<script lang="ts">
  import { goto } from "$app/navigation";

  let {
    anime,
    size = "normal",
    rank = 0,
  } = $props<{
    anime: any;
    size?: "small" | "normal" | "large";
    rank?: number;
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
  const format = $derived(
    (() => {
      const raw = String(anime?.type || anime?.format || "").trim();
      if (!raw) return "";
      const upper = raw.toUpperCase();
      if (upper === "TV" || upper === "TV_SHORT") return "TV";
      if (upper === "MOVIE" || upper === "FILM") return "Movie";
      if (upper === "OVA" || upper === "ONA" || upper === "SPECIAL") return upper;
      if (upper === "MUSIC") return "Music";
      return raw.length <= 8 ? raw : raw.slice(0, 8);
    })(),
  );
  const episodes = $derived(
    Number(anime?.episodes || anime?.totalEpisodes || anime?.episodeCount || 0) || 0,
  );
  const year = $derived(
    anime?.year ||
      (typeof anime?.aired?.from === "string" ? anime.aired.from.split("-")[0] : "") ||
      "",
  );

  function handleNavigate(e?: Event) {
    if (e instanceof MouseEvent && (e.button === 1 || e.ctrlKey || e.metaKey)) return;
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNavigate(e);
    }
  }
</script>

<a
  href="/anime/{id}"
  class="card"
  class:small={size === "small"}
  class:large={size === "large"}
  class:has-rank={rank > 0}
  tabindex="0"
  onclick={handleNavigate}
  onkeydown={handleKeydown}
  aria-label={rank > 0 ? `#${rank} ${title}` : title}
>
  <div class="card-poster">
    {#if poster && !imgError}
      <img
        src={poster}
        alt=""
        loading="lazy"
        decoding="async"
        onerror={() => (imgError = true)}
      />
    {:else}
      <div class="card-fallback" aria-hidden="true">
        <span class="cf-mark">ワ</span>
        <span class="cf-title">{title}</span>
      </div>
    {/if}

    <div class="poster-shade" aria-hidden="true"></div>
    <div class="poster-ring" aria-hidden="true"></div>

    <div class="play-hint" aria-hidden="true">
      <span class="play-icon">▶</span>
    </div>

    {#if rank > 0 && rank <= 10}
      <span class="rank-badge" aria-hidden="true">{rank}</span>
    {/if}

    {#if score > 0}
      <span class="score-badge">★ {score.toFixed(1)}</span>
    {/if}

    {#if format}
      <span class="format-badge">{format}</span>
    {/if}

    {#if episodes > 0}
      <span class="eps-badge">{episodes} eps</span>
    {/if}
  </div>
  <div class="card-meta">
    <p class="card-title">{title}</p>
    {#if year || format}
      <p class="card-sub">
        {#if year}<span>{year}</span>{/if}
        {#if year && format}<span class="dot" aria-hidden="true">·</span>{/if}
        {#if format}<span>{format}</span>{/if}
      </p>
    {/if}
  </div>
</a>

<style>
  .card {
    display: block;
    width: 100%;
    max-width: 220px;
    cursor: pointer;
    text-decoration: none;
    scroll-snap-align: start;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.card-slot) > .card,
  :global(.anime-grid) > .card,
  :global(.grid) > .card,
  :global(.results-grid) > .card,
  :global(.favorites-grid) .card,
  :global(.watchlist-grid) .card,
  :global(.card-grid) > .card {
    max-width: none;
  }

  .card:focus-visible {
    outline: none;
  }

  @media (hover: hover) and (pointer: fine) {
    .card:hover {
      transform: translateY(-4px);
      z-index: 10;
    }
    .card:hover .card-poster {
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.06),
        0 14px 32px rgba(0, 0, 0, 0.55),
        0 0 24px rgba(229, 9, 20, 0.16);
    }
    .card:hover .card-poster img {
      transform: scale(1.07);
    }
    .card:hover .play-hint {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .card:hover .poster-ring {
      opacity: 1;
    }
    .card:hover .card-title {
      color: #ffffff;
    }
  }

  .card:focus-visible .card-poster {
    border-color: rgba(255, 255, 255, 0.95);
    box-shadow:
      0 0 0 2px rgba(229, 9, 20, 0.55),
      0 10px 28px rgba(0, 0, 0, 0.5);
  }

  .card:focus-visible .play-hint {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }

  .card:active .card-poster {
    transform: scale(0.975);
    border-color: rgba(229, 9, 20, 0.65);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }

  .card.small {
    max-width: 160px;
  }
  .card.large {
    max-width: 280px;
  }

  .card-poster {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    aspect-ratio: 2 / 3;
    background:
      radial-gradient(120% 70% at 50% 0%, rgba(229, 9, 20, 0.14), transparent 65%),
      linear-gradient(160deg, #1c1c22, #0c0c0e);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.18s ease;
    will-change: transform;
  }

  .card-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .poster-shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(to top, rgba(0, 0, 0, 0.82) 0%, rgba(0, 0, 0, 0.22) 34%, transparent 55%),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.32) 0%, transparent 30%);
  }

  .poster-ring {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .play-hint {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(8, 8, 10, 0.58);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.85);
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
    pointer-events: none;
    z-index: 2;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  }

  .play-icon {
    color: #fff;
    font-size: 0.95rem;
    margin-left: 2px;
    line-height: 1;
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

  .rank-badge {
    position: absolute;
    left: 0;
    bottom: 0;
    z-index: 3;
    font-size: clamp(2.4rem, 18vw, 3.4rem);
    font-weight: 900;
    line-height: 0.78;
    letter-spacing: -0.06em;
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(255, 255, 255, 0.92);
    text-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
    padding: 0 0 2px 4px;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .score-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
    background: rgba(8, 8, 10, 0.78);
    color: #fbbf24;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 3px 7px;
    border-radius: 999px;
    line-height: 1.25;
    border: 1px solid rgba(251, 191, 36, 0.3);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    pointer-events: none;
    letter-spacing: 0.01em;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .card.has-rank .score-badge {
    left: auto;
    right: 8px;
  }

  .format-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    background: linear-gradient(135deg, rgba(229, 9, 20, 0.95), rgba(180, 8, 16, 0.92));
    color: #fff;
    font-size: 0.56rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 3px 7px;
    border-radius: 6px;
    line-height: 1.2;
    pointer-events: none;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
  }

  .card.has-rank .format-badge {
    display: none;
  }

  .eps-badge {
    position: absolute;
    right: 8px;
    bottom: 9px;
    z-index: 2;
    background: rgba(8, 8, 10, 0.74);
    color: rgba(255, 255, 255, 0.94);
    font-size: 0.58rem;
    font-weight: 700;
    padding: 3px 7px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    pointer-events: none;
  }

  .card.has-rank .eps-badge {
    left: 8px;
    right: auto;
    bottom: 10px;
  }

  .card-meta {
    margin-top: 9px;
    padding: 0 1px;
  }

  .card-title {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: #ececf0;
    line-height: 1.28;
    min-height: 2.1em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
    letter-spacing: -0.01em;
  }

  .card-sub {
    margin: 4px 0 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: rgba(163, 163, 170, 0.95);
    display: flex;
    align-items: center;
    gap: 0.28rem;
    white-space: nowrap;
    overflow: hidden;
  }
  .card-sub .dot {
    opacity: 0.55;
  }

  @media (max-width: 768px) {
    .card {
      max-width: none;
    }
    .card-poster {
      border-radius: 12px;
      box-shadow:
        0 10px 24px rgba(0, 0, 0, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }
    .card-title {
      font-size: 0.8rem;
      color: #f2f2f5;
    }
    .card-sub {
      font-size: 0.66rem;
    }
    .score-badge {
      font-size: 0.62rem;
      padding: 3px 6px;
    }
    .format-badge {
      font-size: 0.54rem;
      padding: 2px 6px;
    }
    .play-hint {
      width: 40px;
      height: 40px;
      opacity: 0;
    }
    .card:active .play-hint {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
    .rank-badge {
      font-size: clamp(2.2rem, 16vw, 3rem);
      -webkit-text-stroke: 1.25px rgba(255, 255, 255, 0.95);
    }
  }

  @media (max-width: 480px) {
    .card-poster {
      border-radius: 11px;
    }
    .card-meta {
      margin-top: 7px;
    }
    .card-title {
      font-size: 0.76rem;
      min-height: 2.05em;
    }
    .card-sub {
      font-size: 0.62rem;
      margin-top: 3px;
    }
    .score-badge {
      top: 6px;
      left: 6px;
      font-size: 0.58rem;
      padding: 2px 6px;
    }
    .card.has-rank .score-badge {
      right: 6px;
      left: auto;
    }
    .format-badge {
      top: 6px;
      right: 6px;
      font-size: 0.5rem;
    }
    .eps-badge {
      right: 6px;
      bottom: 7px;
      font-size: 0.54rem;
      padding: 2px 6px;
    }
    .play-hint {
      width: 38px;
      height: 38px;
    }
    .play-icon {
      font-size: 0.85rem;
    }
    .rank-badge {
      font-size: 2.35rem;
      padding-left: 2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .card-poster,
    .card-poster img,
    .play-hint,
    .poster-ring {
      transition: none;
    }
  }
</style>
