<script lang="ts">
  import { getProxiedImage } from "$lib/api";

  let { item } = $props<{ item: any }>();

  const poster = $derived(getProxiedImage(item?.poster || item?.image || ""));
  const title = $derived(item?.title || "Unknown");
  const epNum = $derived(item?.episode || item?.episodeNumber || 1);
  const progress = $derived(item?.progress || 0);
  const duration = $derived(item?.duration || 0);
  const percent = $derived(
    duration > 0 ? Math.min((progress / duration) * 100, 100) : 0,
  );
  const id = $derived(item?.id || item?.animeId);

  /** Remaining time label like competitor timestamps, but smarter */
  const timeLabel = $derived.by(() => {
    if (!duration || duration <= 0) return "";
    const remaining = Math.max(0, Math.round(duration - progress));
    if (remaining <= 0 || percent >= 98) return "Done";
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      return `${h}h ${mm}m left`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  });
</script>

<a
  href="/watch/{id}/{epNum}"
  class="resume-card"
  aria-label="Continue {title}, episode {epNum}{percent > 0
    ? `, ${Math.round(percent)}% watched`
    : ''}"
>
  <div class="card-media">
    <img src={poster} alt="" loading="lazy" decoding="async" />
    <div class="media-shade" aria-hidden="true"></div>
    <div class="play-circle" aria-hidden="true">
      <span class="play-icon">▶</span>
    </div>
    {#if timeLabel}
      <span class="time-badge">{timeLabel}</span>
    {/if}
    {#if percent > 0}
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" style="width: {percent}%"></div>
      </div>
    {/if}
  </div>
  <div class="card-copy">
    <p class="card-title">{title}</p>
    <p class="card-ep">Episode {epNum}</p>
  </div>
</a>

<style>
  .resume-card {
    display: block;
    flex-shrink: 0;
    width: 200px;
    cursor: pointer;
    text-decoration: none;
    scroll-snap-align: start;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.2s ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .resume-card:hover {
      transform: translateY(-3px);
      z-index: 2;
    }
    .resume-card:hover .card-media {
      border-color: rgba(255, 255, 255, 0.88);
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.08),
        0 12px 28px rgba(0, 0, 0, 0.5),
        0 0 18px rgba(229, 9, 20, 0.14);
    }
    .resume-card:hover .card-title {
      color: white;
    }
    .resume-card:hover .play-circle {
      background: rgba(229, 9, 20, 0.92);
      border-color: rgba(255, 255, 255, 0.7);
      transform: translate(-50%, -50%) scale(1.06);
      opacity: 1;
    }
  }

  .resume-card:active .card-media {
    transform: scale(0.98);
    border-color: rgba(255, 138, 61, 0.65);
  }

  /* Landscape frame — beats portrait for "continue" context */
  .card-media {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 12px;
    overflow: hidden;
    background: #141416;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.4);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.18s ease;
  }

  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }

  .media-shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.78) 0%,
      rgba(0, 0, 0, 0.2) 42%,
      transparent 62%
    );
  }

  .play-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0.92;
    transition:
      background 0.2s ease,
      transform 0.2s ease,
      border-color 0.2s ease,
      opacity 0.2s ease;
    z-index: 2;
  }
  .play-icon {
    color: white;
    font-size: 0.85rem;
    margin-left: 2px;
    line-height: 1;
  }

  .time-badge {
    position: absolute;
    right: 7px;
    bottom: 10px;
    z-index: 3;
    background: rgba(8, 8, 10, 0.82);
    color: #fff;
    font-size: 0.62rem;
    font-weight: 700;
    padding: 3px 7px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  .progress-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3.5px;
    background: rgba(255, 255, 255, 0.2);
    z-index: 4;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #FF8A3D, #ff5a63);
    border-radius: 0 1px 0 0;
    box-shadow: 0 0 10px rgba(255, 138, 61, 0.55);
  }

  .card-copy {
    margin-top: 8px;
    padding: 0 1px;
  }
  .card-title {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    color: #f0f0f3;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
  }
  .card-ep {
    margin: 3px 0 0;
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(163, 163, 163, 0.95);
    letter-spacing: 0.01em;
  }

  @media (max-width: 768px) {
    .resume-card {
      /* ~1.55 cards + peek — landscape rail like premium apps */
      width: clamp(200px, 62vw, 280px);
    }
    .card-media {
      aspect-ratio: 16 / 9.5;
      border-radius: 11px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
    }
    .play-circle {
      width: 42px;
      height: 42px;
    }
    .card-title {
      font-size: 0.84rem;
    }
    .card-ep {
      font-size: 0.74rem;
    }
    .time-badge {
      right: 8px;
      bottom: 11px;
      font-size: 0.64rem;
      padding: 3px 8px;
    }
    .progress-track {
      height: 3.5px;
    }
  }

  @media (max-width: 480px) {
    .resume-card {
      width: clamp(188px, 68vw, 260px);
    }
    .card-media {
      border-radius: 10px;
    }
    .card-title {
      font-size: 0.8rem;
    }
    .card-ep {
      font-size: 0.7rem;
    }
    .play-circle {
      width: 40px;
      height: 40px;
    }
    .play-icon {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 360px) {
    .resume-card {
      width: 72vw;
    }
  }

  /* Desktop keeps a slightly tighter rail */
  @media (min-width: 769px) {
    .resume-card {
      width: 220px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .resume-card,
    .card-media,
    .play-circle {
      transition: none;
    }
  }
</style>
