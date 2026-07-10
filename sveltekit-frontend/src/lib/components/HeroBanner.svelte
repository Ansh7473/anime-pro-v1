<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { onMount, onDestroy } from "svelte";
  import { goto } from "$app/navigation";

  let { items = [] } = $props<{ items: any[] }>();

  let current = $state(0);
  let paused = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;

  let touchStartX = $state(0);
  let touchEndX = $state(0);
  let isSwiping = $state(false);

  const AUTOPLAY_MS = 4500;

  const heroes = $derived(
    items.filter((a: any) => a.image || a.poster).slice(0, 8),
  );

  function next() {
    current = (current + 1) % heroes.length;
  }
  function prev() {
    current = (current - 1 + heroes.length) % heroes.length;
  }
  function goTo(i: number) {
    current = i;
  }

  function startAutoplay() {
    stopAutoplay();
    interval = setInterval(() => {
      if (!paused) next();
    }, AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (interval) clearInterval(interval);
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
    isSwiping = true;
    paused = true;
  }
  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping) return;
    touchEndX = e.changedTouches[0].screenX;
  }
  function handleTouchEnd() {
    if (!isSwiping) return;
    isSwiping = false;
    paused = false;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
      startAutoplay();
    }
  }

  onMount(startAutoplay);
  onDestroy(stopAutoplay);

  const anime = $derived(heroes[current]);
  const title = $derived(anime?.title || "Unknown");
  const synopsis = $derived((anime?.synopsis || "").replace(/<[^>]*>?/gm, ""));
  const genres = $derived(anime?.genres || []);
  const id = $derived(anime?.id || anime?.mal_id);
  const rawScore = $derived(anime?.score || anime?.rating || 0);
  const score = $derived(rawScore > 10 ? rawScore / 10 : rawScore);
  const year = $derived(anime?.year || anime?.aired?.from?.split("-")[0] || "");
  const format = $derived(
    (() => {
      const raw = String(anime?.type || anime?.format || "").trim();
      if (!raw) return "";
      const upper = raw.toUpperCase().replace(/_/g, " ");
      if (upper === "TV" || upper === "TV SHORT") return "TV Show";
      if (upper === "MOVIE" || upper === "FILM") return "Movie";
      if (upper === "OVA" || upper === "ONA" || upper === "SPECIAL") return upper;
      return raw.length <= 12 ? raw : raw.slice(0, 12);
    })(),
  );
  const episodes = $derived(anime?.episodes || anime?.totalEpisodes || 0);
  const statusLabel = $derived(
    (() => {
      const raw = String(anime?.status || "").toUpperCase().replace(/_/g, " ");
      if (!raw) return "";
      if (raw.includes("RELEASING") || raw.includes("AIRING") || raw.includes("CURRENT"))
        return "AIRING";
      if (raw.includes("FINISHED") || raw.includes("COMPLETE")) return "Completed";
      if (raw.includes("NOT YET") || raw.includes("UPCOMING")) return "Upcoming";
      if (raw.includes("HIATUS")) return "Hiatus";
      return "";
    })(),
  );
  const statusLive = $derived(statusLabel === "AIRING");

  function handlePlay(e?: Event) {
    if (e instanceof MouseEvent && (e.button === 1 || e.ctrlKey || e.metaKey)) return;
    if (e) e.preventDefault();
    if (id) goto(`/watch/${id}/1`);
  }
  function handleDetails(e?: Event) {
    if (e instanceof MouseEvent && (e.button === 1 || e.ctrlKey || e.metaKey)) return;
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }
  function handleKeydown(fn: Function) {
    return (e: KeyboardEvent) => {
      if (e.key === "Enter") fn(e);
    };
  }
</script>

{#if heroes.length > 0}
  <section
    class="hero"
    aria-label="Featured anime carousel"
    aria-roledescription="carousel"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  >
    {#each heroes as slide, i}
      <div
        class="hero-bg"
        class:active={i === current}
        style={i === current ||
        i === (current + 1) % heroes.length ||
        i === (current - 1 + heroes.length) % heroes.length
          ? `background-image: url(${getProxiedImage(slide.image || slide.poster || "")});`
          : ""}
        role="group"
        aria-roledescription="slide"
        aria-label="{slide.title || "Featured"}, slide {i + 1} of {heroes.length}"
        aria-hidden={i !== current}
      ></div>
    {/each}

    <div class="hero-vignette" aria-hidden="true"></div>
    <div class="hero-glow" aria-hidden="true"></div>

    <div class="hero-content">
      <div class="hero-pills">
        {#if format}
          <span class="pill pill-muted">{format}</span>
        {/if}
        {#if statusLabel}
          <span class="pill" class:pill-live={statusLive} class:pill-muted={!statusLive}
            >{statusLabel}</span
          >
        {/if}
        {#if year}
          <span class="pill pill-muted">{year}</span>
        {/if}
        {#if score > 0}
          <span class="pill pill-score">★ {score.toFixed(1)}</span>
        {/if}
      </div>

      {#if genres.length > 0}
        <p class="hero-genres">{genres.slice(0, 3).join(" · ")}</p>
      {/if}

      <h1 class="hero-title">{title}</h1>

      {#if synopsis}
        <p class="hero-desc">
          {synopsis.slice(0, 160)}{synopsis.length > 160 ? "…" : ""}
        </p>
      {/if}

      <div class="hero-meta-row">
        {#if episodes > 0}
          <span class="meta-chip">{episodes} eps</span>
        {/if}
      </div>

      <div class="hero-actions">
        <a
          href="/watch/{id}/1"
          class="btn-watch"
          role="button"
          tabindex="0"
          onclick={handlePlay}
          onkeydown={handleKeydown(handlePlay)}
        >
          <span class="btn-watch-icon" aria-hidden="true">▶</span>
          Watch Now
        </a>
        <a
          href="/anime/{id}"
          class="btn-info"
          role="button"
          tabindex="0"
          onclick={handleDetails}
          onkeydown={handleKeydown(handleDetails)}
          aria-label="More info about {title}"
        >
          <span aria-hidden="true">ℹ</span>
        </a>
      </div>
    </div>

    <button class="hero-arrow left" onclick={prev} aria-label="Previous">‹</button>
    <button class="hero-arrow right" onclick={next} aria-label="Next">›</button>

    <div class="hero-dots" role="tablist" aria-label="Carousel slides">
      {#each heroes as _, i}
        <button
          class="dot"
          class:active={i === current}
          onclick={() => {
            goTo(i);
            startAutoplay();
          }}
          role="tab"
          aria-selected={i === current}
          aria-label="Slide {i + 1}"
        >
          <span class="dot-track">
            {#if i === current && !paused}
              <span class="dot-progress" style="animation-duration: {AUTOPLAY_MS}ms"></span>
            {:else if i === current}
              <span class="dot-progress paused"></span>
            {/if}
          </span>
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    width: 100%;
    height: min(68vh, 720px);
    min-height: 380px;
    max-height: 88dvh;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }

  @media (orientation: landscape) and (max-height: 500px) {
    .hero {
      height: 100dvh;
      min-height: 220px;
      max-height: 100dvh;
    }
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center top;
    opacity: 0;
    transform: scale(1.04);
    transition:
      opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1),
      transform 7s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform;
  }
  .hero-bg.active {
    opacity: 1;
    transform: scale(1);
  }

  .hero-vignette {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        to top,
        var(--net-bg, #070708) 0%,
        rgba(7, 7, 8, 0.92) 18%,
        rgba(7, 7, 8, 0.55) 42%,
        rgba(7, 7, 8, 0.12) 68%,
        transparent 100%
      ),
      linear-gradient(to right, rgba(7, 7, 8, 0.78) 0%, rgba(7, 7, 8, 0.2) 48%, transparent 72%),
      radial-gradient(ellipse 90% 55% at 50% 100%, rgba(229, 9, 20, 0.14) 0%, transparent 65%);
  }

  .hero-glow {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    z-index: 4;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(229, 9, 20, 0.55) 35%,
      rgba(255, 77, 87, 0.85) 50%,
      rgba(229, 9, 20, 0.55) 65%,
      transparent 100%
    );
    opacity: 0.85;
  }

  .hero-content {
    position: relative;
    z-index: 3;
    padding: 2.5rem 3rem;
    padding-bottom: 3.75rem;
    max-width: 720px;
    width: 100%;
  }

  .hero-pills {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.65rem;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 26px;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
    border: 1px solid transparent;
  }
  .pill-muted {
    color: rgba(255, 255, 255, 0.88);
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .pill-live {
    color: #052e16;
    background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
    border-color: rgba(74, 222, 128, 0.55);
    box-shadow: 0 0 14px rgba(34, 197, 94, 0.35);
  }
  .pill-score {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
    border-color: rgba(251, 191, 36, 0.28);
  }

  .hero-genres {
    color: rgba(255, 255, 255, 0.62);
    font-weight: 600;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    margin: 0 0 0.45rem;
    text-transform: uppercase;
  }

  .hero-title {
    font-size: clamp(1.85rem, 4.6vw, 3.1rem);
    font-weight: 900;
    letter-spacing: -0.035em;
    line-height: 1.02;
    margin: 0 0 0.55rem;
    color: #fff;
    text-shadow:
      0 2px 4px rgba(0, 0, 0, 0.45),
      0 12px 32px rgba(0, 0, 0, 0.55);
  }

  .hero-desc {
    color: rgba(232, 232, 236, 0.82);
    font-size: 0.92rem;
    line-height: 1.5;
    margin: 0 0 0.75rem;
    max-width: 480px;
  }

  .hero-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1.1rem;
  }
  .meta-chip {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    padding: 0.15rem 0;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }

  .btn-watch {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 48px;
    padding: 0.72rem 1.55rem;
    border-radius: 999px;
    background: #fff;
    color: #0a0a0a;
    font-weight: 800;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    text-decoration: none;
    box-shadow:
      0 8px 28px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(255, 255, 255, 0.08);
    transition:
      transform 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease;
  }
  .btn-watch-icon {
    font-size: 0.75rem;
    line-height: 1;
  }
  .btn-watch:hover {
    transform: scale(1.04);
    background: #f4f4f5;
    box-shadow:
      0 10px 32px rgba(0, 0, 0, 0.4),
      0 0 24px rgba(229, 9, 20, 0.18);
  }
  .btn-watch:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .btn-watch:active {
    transform: scale(0.97);
  }

  .btn-info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(20, 20, 22, 0.55);
    color: #fff;
    font-size: 1.05rem;
    font-weight: 700;
    text-decoration: none;
    border: 1.5px solid rgba(255, 255, 255, 0.28);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition:
      transform 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease;
  }
  .btn-info:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(255, 255, 255, 0.45);
    transform: scale(1.05);
  }
  .btn-info:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .btn-info:active {
    transform: scale(0.95);
  }

  /* Arrows — desktop only */
  .hero-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    width: 44px;
    height: 72px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: white;
    font-size: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.3s ease;
  }
  .hero:hover .hero-arrow {
    opacity: 1;
  }
  .hero-arrow:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .hero-arrow.left {
    left: 1rem;
  }
  .hero-arrow.right {
    right: 1rem;
  }

  /* Segmented progress dots */
  .hero-dots {
    position: absolute;
    bottom: 1.05rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    gap: 0.35rem;
    padding: 0.2rem;
  }
  .dot {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .dot-track {
    width: 22px;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.28);
    overflow: hidden;
    position: relative;
    display: block;
    transition:
      width 0.25s ease,
      background 0.25s ease;
  }
  .dot:hover .dot-track {
    background: rgba(255, 255, 255, 0.5);
  }
  .dot.active .dot-track {
    width: 36px;
    background: rgba(255, 255, 255, 0.22);
  }
  .dot-progress {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #fff 0%, #ffc9cd 100%);
    border-radius: 999px;
    transform-origin: left;
    animation: dot-fill linear forwards;
  }
  .dot-progress.paused {
    animation: none;
    transform: scaleX(0.35);
    opacity: 0.9;
  }
  @keyframes dot-fill {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }

  /* —— Mobile: beat AnimetSU —— */
  @media (max-width: 768px) {
    .hero {
      /* Immersive cinema height — taller than competitor's truncated feel */
      height: min(78dvh, 620px);
      min-height: 420px;
      max-height: 86dvh;
    }
    .hero-content {
      padding: 1.25rem 1rem 4.25rem;
      max-width: 100%;
    }
    .hero-vignette {
      background:
        linear-gradient(
          to top,
          var(--net-bg, #070708) 0%,
          rgba(7, 7, 8, 0.96) 14%,
          rgba(7, 7, 8, 0.72) 36%,
          rgba(7, 7, 8, 0.28) 58%,
          rgba(7, 7, 8, 0.08) 78%,
          transparent 100%
        ),
        linear-gradient(to right, rgba(7, 7, 8, 0.45) 0%, transparent 70%),
        radial-gradient(ellipse 100% 50% at 50% 100%, rgba(229, 9, 20, 0.18) 0%, transparent 60%);
    }
    .hero-arrow {
      display: none;
    }
    .hero-pills {
      gap: 0.35rem;
      margin-bottom: 0.55rem;
    }
    .pill {
      min-height: 24px;
      padding: 0.2rem 0.55rem;
      font-size: 0.62rem;
    }
    .hero-title {
      font-size: clamp(1.65rem, 7.2vw, 2.25rem);
      margin-bottom: 0.4rem;
      max-width: 18ch;
    }
    .hero-genres {
      font-size: 0.68rem;
      margin-bottom: 0.35rem;
    }
    .hero-desc {
      font-size: 0.82rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.55rem;
      max-width: 100%;
      color: rgba(232, 232, 236, 0.78);
    }
    .hero-meta-row {
      margin-bottom: 0.95rem;
    }
    .hero-actions {
      gap: 0.65rem;
    }
    .btn-watch {
      min-height: 48px;
      padding: 0.7rem 1.45rem;
      font-size: 0.92rem;
      flex: 0 1 auto;
    }
    .btn-info {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    .hero-dots {
      bottom: 0.85rem;
    }
    .dot {
      width: 28px;
      height: 28px;
    }
    .dot-track {
      width: 16px;
      height: 2.5px;
    }
    .dot.active .dot-track {
      width: 28px;
    }
  }

  @media (max-width: 480px) {
    .hero {
      height: min(82dvh, 560px);
      min-height: 400px;
      max-height: 88dvh;
    }
    .hero-content {
      padding: 1rem 0.9rem 4.1rem;
    }
    .hero-title {
      font-size: clamp(1.55rem, 8vw, 2rem);
      line-height: 1.05;
      max-width: 14ch;
    }
    .hero-genres {
      font-size: 0.64rem;
      letter-spacing: 0.05em;
    }
    .hero-desc {
      font-size: 0.78rem;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      margin-bottom: 0.5rem;
    }
    .hero-pills {
      margin-bottom: 0.45rem;
    }
    .btn-watch {
      min-height: 46px;
      padding: 0.65rem 1.3rem;
      font-size: 0.88rem;
    }
    .btn-info {
      width: 46px;
      height: 46px;
    }
    .hero-dots {
      bottom: 0.7rem;
    }
    .dot {
      width: 24px;
      height: 24px;
    }
    .dot-track {
      width: 12px;
      height: 2px;
    }
    .dot.active .dot-track {
      width: 22px;
    }
  }

  @media (max-width: 360px) {
    .hero {
      min-height: 360px;
    }
    .hero-content {
      padding-inline: 0.75rem;
    }
    .hero-title {
      font-size: 1.4rem;
    }
    .btn-watch {
      font-size: 0.84rem;
      padding-inline: 1.1rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-bg {
      transition: opacity 0.2s ease;
      transform: none;
    }
    .hero-bg.active {
      transform: none;
    }
    .dot-progress {
      animation: none;
      transform: scaleX(1);
    }
    .btn-watch,
    .btn-info {
      transition: none;
    }
  }
</style>
