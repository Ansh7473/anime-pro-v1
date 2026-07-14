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
    items.filter((a: any) => a.bannerImage || a.image || a.poster).slice(0, 8),
  );

  function next() {
    if (heroes.length <= 1) return;
    current = (current + 1) % heroes.length;
  }
  function prev() {
    if (heroes.length <= 1) return;
    current = (current - 1 + heroes.length) % heroes.length;
  }
  function goTo(i: number) {
    if (i < 0 || i >= heroes.length) return;
    current = i;
  }

  function startAutoplay() {
    stopAutoplay();
    if (heroes.length <= 1) return;
    interval = setInterval(() => {
      if (!paused) next();
    }, AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (interval) clearInterval(interval);
    interval = null;
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

  $effect(() => {
    if (heroes.length === 0) {
      current = 0;
      stopAutoplay();
      return;
    }
    if (!Number.isFinite(current) || current < 0 || current >= heroes.length) {
      current = 0;
    }
    if (heroes.length > 1 && !interval) startAutoplay();
  });

  const anime = $derived(heroes[current] || heroes[0]);
  const title = $derived(anime?.title || "Unknown");
  const synopsis = $derived((anime?.synopsis || "").replace(/<[^>]*>?/gm, ""));
  const genres = $derived(anime?.genres || []);
  const id = $derived(anime?.id || anime?.mal_id || "");
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
          ? `background-image: url(${getProxiedImage(slide.bannerImage || slide.image || slide.poster || "")});`
          : ""}
        role="group"
        aria-roledescription="slide"
        aria-label="{slide.title || "Featured"}, slide {i + 1} of {heroes.length}"
        aria-hidden={i !== current}
      ></div>
    {/each}

    <div class="hero-vignette" aria-hidden="true"></div>
    <div class="hero-content">
      <div class="hero-content-inner">
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
          {synopsis.slice(0, 140)}{synopsis.length > 140 ? "…" : ""}
        </p>
      {/if}

      <div class="hero-meta-row">
        {#if episodes > 0}
          <span class="meta-chip">{episodes} eps</span>
        {/if}
      </div>

      <div class="hero-actions">
        <a
          href="/anime/{id}/"
          class="btn-details"
          role="button"
          tabindex="0"
          onclick={handleDetails}
          onkeydown={handleKeydown(handleDetails)}
        >
          <span aria-hidden="true">ℹ</span>
          <span class="btn-text">DETAILS</span>
        </a>
        <a
          href="/watch/{id}/1/"
          class="btn-watch"
          role="button"
          tabindex="0"
          onclick={handlePlay}
          onkeydown={handleKeydown(handlePlay)}
        >
          <span class="btn-watch-icon" aria-hidden="true">▶</span>
          WATCH NOW
        </a>
      </div>
      </div>
    </div>

    <div class="hero-pager" aria-label="Carousel controls">
      <button class="hero-arrow left" onclick={prev} aria-label="Previous">‹</button>
      <span class="hero-page-count">{current + 1} / {heroes.length}</span>
      <button class="hero-arrow right" onclick={next} aria-label="Next">›</button>
    </div>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    width: 100%;
    height: 660px;
    min-height: 500px;
    max-height: 660px;
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
    z-index: 1;
    background-size: cover;
    background-position: center top;
    opacity: 0;
    transform: scale(1.04);
    transition:
      opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: opacity, transform;
    animation: hero-ken-burns 20s ease-in-out infinite alternate;
  }
  .hero-bg.active {
    opacity: 1;
    transform: scale(1);
  }

  .hero-vignette {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.55) 0%,
        rgba(0, 0, 0, 0.15) 22%,
        rgba(0, 0, 0, 0.32) 50%,
        rgba(0, 0, 0, 0.78) 78%,
        #000 100%
      ),
      linear-gradient(to right, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.18) 50%, transparent 75%);
  }

  .hero-content {
    position: relative;
    z-index: 3;
    width: 100%;
    max-width: var(--page-max, 1600px);
    margin: 0 auto;
    padding: 1.5rem var(--page-gutter, 2.5rem) 1.75rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    min-height: 100%;
  }
  .hero-content-inner {
    width: 100%;
    max-width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "meta meta"
      "title title"
      "genres genres"
      "desc actions";
    column-gap: 1.5rem;
    row-gap: 0.55rem;
    align-items: end;
  }
  .hero-pills { grid-area: meta; }
  .hero-title { grid-area: title; }
  .hero-genres { grid-area: genres; }
  .hero-desc, .hero-meta-row { grid-area: desc; max-width: 56ch; }
  .hero-desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.9rem;
    line-height: 1.45;
    color: rgba(255,255,255,0.72);
    margin: 0;
  }
  .hero-meta-row { margin: 0; }
  .hero-actions {
    grid-area: actions;
    justify-self: end;
    align-self: end;
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
    font-size: clamp(1.65rem, 3.8vw, 2.65rem);
    font-weight: 900;
    letter-spacing: -0.035em;
    line-height: 1.02;
    margin: 0 0 0.55rem;
    color: #fff;
    text-shadow:
      0 2px 24px rgba(0, 0, 0, 0.65),
      0 8px 40px rgba(0, 0, 0, 0.45);
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
    background: linear-gradient(135deg, #FF6F22, #EC5800);
    color: #fff;
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
    filter: brightness(1.08);
    box-shadow:
      0 10px 32px rgba(0, 0, 0, 0.4),
      0 0 24px rgba(252, 211, 77, 0.5);
  }
  .btn-watch:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .btn-watch:active {
    transform: scale(0.97);
  }

  .btn-details {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 48px;
    padding: 0.72rem 1.35rem;
    border-radius: 999px;
    background: rgba(12, 12, 12, 0.72);
    color: #fff;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-decoration: none;
    border: 1.5px solid rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition:
      transform 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease;
  }
  .btn-details:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.03);
  }
  .btn-details:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }
  .btn-details:active {
    transform: scale(0.97);
  }

  /* Miruro-style corner pager */
  .hero-pager {
    position: absolute;
    top: max(4.75rem, calc(env(safe-area-inset-top, 0px) + 4.5rem));
    right: max(var(--page-gutter, 2.5rem), env(safe-area-inset-right, 0px));
    z-index: 6;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.25rem 0.35rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  .hero-page-count {
    font-size: 0.78rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
    min-width: 2.6rem;
    text-align: center;
    letter-spacing: 0.02em;
  }
  .hero-arrow {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: white;
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .hero-arrow:hover {
    background: rgba(250, 204, 21, 0.38);
    border-color: rgba(252, 211, 77, 0.55);
    color: #fff;
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
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    overflow: hidden;
    position: relative;
    display: block;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dot:hover .dot-track {
    background: rgba(255, 255, 255, 0.5);
  }
  .dot.active .dot-track {
    width: 24px;
    border-radius: 4px;
    background: linear-gradient(135deg, #FF6F22, #EC5800);
  }
  .dot-progress {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #FF9B62 0%, #EC5800 100%);
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

  @keyframes hero-ken-burns {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(1.08);
    }
  }

  /* —— Mobile: beat AnimetSU —— */
  @media (max-width: 768px) {
    .hero {
      height: 45svh;
      min-height: 320px;
      max-height: 450px;
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
    .btn-details {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      padding: 0;
    }
    .btn-details .btn-text {
      display: none;
    }
    .hero-dots {
      bottom: 0.85rem;
    }
    .dot {
      width: 28px;
      height: 28px;
    }
    .dot-track {
      width: 7px;
      height: 7px;
    }
    .dot.active .dot-track {
      width: 20px;
    }
  }

  @media (max-width: 480px) {
    .hero {
      height: 75svw;
      min-height: 260px;
      max-height: 340px;
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
    .btn-details {
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
      width: 6px;
      height: 6px;
    }
    .dot.active .dot-track {
      width: 18px;
    }
  }

  @media (max-width: 360px) {
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
      animation: none;
    }
    .hero-bg.active {
      transform: none;
    }
    .dot-progress {
      animation: none;
      transform: scaleX(1);
    }
    .btn-watch,
    .btn-details {
      transition: none;
    }
  }

  /* hero gutter responsive */
  @media (max-width: 1024px) {
    .hero-content {
      padding-left: var(--page-gutter-md, 1.25rem);
      padding-right: var(--page-gutter-md, 1.25rem);
    }
    .hero-pager {
      right: var(--page-gutter-md, 1.25rem);
    }
  }
  @media (max-width: 900px) {
    .hero-content-inner {
      grid-template-columns: 1fr;
      grid-template-areas:
        "meta"
        "title"
        "genres"
        "desc"
        "actions";
    }
    .hero-actions { justify-self: start; }
  }
  @media (max-width: 768px) {
    .hero {
      height: clamp(280px, 48vh, 400px);
      min-height: 280px;
      max-height: 400px;
    }
    .hero-content {
      padding: 1.1rem var(--page-gutter-sm, 0.75rem) 1.25rem;
    }
    .hero-pager {
      top: max(4.25rem, calc(env(safe-area-inset-top, 0px) + 3.75rem));
      right: var(--page-gutter-sm, 0.75rem);
    }
  }
</style>
