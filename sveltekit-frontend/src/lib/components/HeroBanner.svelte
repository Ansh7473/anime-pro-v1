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
    }, 3000);
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
  const poster = $derived(getProxiedImage(anime?.image || anime?.poster || ""));
  const title = $derived(anime?.title || "Unknown");
  const synopsis = $derived((anime?.synopsis || "").replace(/<[^>]*>?/gm, ""));
  const genres = $derived(anime?.genres || []);
  const id = $derived(anime?.id || anime?.mal_id);
  const rawScore = $derived(anime?.score || anime?.rating || 0);
  const score = $derived(rawScore > 10 ? rawScore / 10 : rawScore);
  const year = $derived(anime?.year || anime?.aired?.from?.split("-")[0] || "");
  const format = $derived(anime?.type || anime?.format || "");
  const episodes = $derived(anime?.episodes || anime?.totalEpisodes || 0);

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
    return (e: KeyboardEvent) => { if (e.key === 'Enter') fn(e); };
  }
</script>

{#if heroes.length > 0}
  <section
    class="hero"
    aria-label="Featured anime carousel"
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
        style={(i === current ||
          i === (current + 1) % heroes.length ||
          i === (current - 1 + heroes.length) % heroes.length)
          ? `background-image: url(${getProxiedImage(slide.image || slide.poster || '')});`
          : ''}
      ></div>
    {/each}

    <div class="hero-gradient"></div>

    <div class="hero-content">
      {#if genres.length > 0}
        <p class="hero-genres">{genres.slice(0, 3).join('   •   ')}</p>
      {/if}

      <h1 class="hero-title">{title}</h1>

      <div class="hero-meta">
        {#if score > 0}<span class="meta-score">★ {score.toFixed(1)}</span>{/if}
        {#if year}<span class="meta-item">{year}</span>{/if}
        {#if format}<span class="meta-item">{format}</span>{/if}
        {#if episodes > 0}<span class="meta-item">{episodes} eps</span>{/if}
      </div>

      {#if synopsis}
        <p class="hero-desc">{synopsis.slice(0, 180)}{synopsis.length > 180 ? '...' : ''}</p>
      {/if}

      <div class="hero-actions">
        <a href="/watch/{id}/1" class="btn-hero-primary" role="button" tabindex="0" onclick={handlePlay} onkeydown={handleKeydown(handlePlay)}>▶ Play</a>
        <a href="/anime/{id}" class="btn-hero-secondary" role="button" tabindex="0" onclick={handleDetails} onkeydown={handleKeydown(handleDetails)}>ℹ Details</a>
      </div>
    </div>

    <button class="hero-arrow left" onclick={prev} aria-label="Previous">‹</button>
    <button class="hero-arrow right" onclick={next} aria-label="Next">›</button>

    <div class="hero-dots">
      {#each heroes as _, i}
        <button
          class="dot"
          class:active={i === current}
          onclick={() => goTo(i)}
          aria-label="Slide {i + 1}"
        >
          <span class="dot-track">
            {#if i === current}
              <span class="dot-progress"></span>
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
    height: 65vh;
    min-height: 480px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center top;
    opacity: 0;
    transform: scale(1.03);
    transition:
      opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1),
      transform 6s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .hero-bg.active {
    opacity: 1;
    transform: scale(1);
  }

  .hero-gradient {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(to top, var(--net-bg) 0%, rgba(10,10,10,0.7) 40%, rgba(10,10,10,0.15) 100%),
      linear-gradient(to right, rgba(10,10,10,0.75) 0%, transparent 55%);
  }

  .hero-content {
    position: relative;
    z-index: 3;
    padding: 2.5rem 3rem;
    padding-bottom: 3.5rem;
    max-width: 700px;
  }

  .hero-genres {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.5px;
    margin-bottom: 0.6rem;
  }

  .hero-title {
    font-size: clamp(1.8rem, 4.5vw, 3rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.05;
    margin-bottom: 0.6rem;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 0.7rem;
    font-size: 0.82rem;
    color: #a3a3a3;
    font-weight: 500;
  }
  .hero-meta .meta-score {
    color: #fbbf24;
    font-weight: 700;
  }
  .hero-meta .meta-item::before,
  .hero-meta .meta-score + .meta-item::before {
    content: "•";
    margin: 0 0.5rem;
    color: #a3a3a3;
  }
  .hero-meta .meta-item:first-child::before {
    display: none;
  }

  .hero-desc {
    color: #a3a3a3;
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1.2rem;
    max-width: 480px;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .btn-hero-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: white;
    color: black;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 0.7rem 1.6rem;
    border-radius: 8px;
    text-decoration: none;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .btn-hero-primary:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.9);
  }
  .btn-hero-primary:focus-visible {
    outline: 3px solid white;
    outline-offset: 3px;
  }

  .btn-hero-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.12);
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 0.7rem 1.6rem;
    border-radius: 8px;
    text-decoration: none;
    transition: transform 0.2s ease, background 0.2s ease;
  }
  .btn-hero-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
  .btn-hero-secondary:focus-visible {
    outline: 3px solid white;
    outline-offset: 3px;
  }

  /* Arrows */
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
  .hero-arrow.left { left: 1rem; }
  .hero-arrow.right { right: 1rem; }

  /* Dots */
  .hero-dots {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    gap: 0.4rem;
  }
  .dot {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    cursor: pointer;
    border: none;
    padding: 0;
  }
  .dot-track {
    width: 28px;
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.25);
    overflow: hidden;
    position: relative;
    display: block;
    transition: width 0.3s ease;
  }
  .dot:hover .dot-track {
    background: rgba(255, 255, 255, 0.5);
  }
  .dot.active .dot-track {
    width: 40px;
    background: rgba(255, 255, 255, 0.2);
  }
  .dot-progress {
    position: absolute;
    inset: 0;
    background: white;
    border-radius: 2px;
    transform-origin: left;
    animation: dot-fill 4s linear forwards;
  }
  @keyframes dot-fill {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  /* Mobile */
  @media (max-width: 768px) {
    .hero {
      height: 45vh;
      min-height: 300px;
    }
    .hero-content {
      padding: 1.5rem 1.25rem;
      padding-bottom: 4rem;
    }
    .hero-arrow { display: none; }
    .hero-title { font-size: clamp(1.3rem, 6vw, 2rem); }
    .hero-genres { font-size: 0.75rem; margin-bottom: 0.4rem; }
    .hero-meta { font-size: 0.75rem; }
    .hero-desc {
      font-size: 0.8rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.8rem;
    }
    .hero-actions { gap: 0.5rem; }
    .btn-hero-primary,
    .btn-hero-secondary {
      padding: 0.55rem 1.1rem;
      font-size: 0.85rem;
    }
    .hero-dots { bottom: 0.7rem; }
    .dot { width: 30px; height: 30px; }
    .dot-track { width: 18px; height: 2.5px; }
    .dot.active .dot-track { width: 28px; }
  }

  @media (max-width: 480px) {
    .hero {
      height: 42vh;
      min-height: 270px;
    }
    .hero-content {
      padding: 1rem 0.85rem;
      padding-bottom: 3.5rem;
    }
    .hero-title { font-size: clamp(1.1rem, 7vw, 1.6rem); }
    .hero-genres { font-size: 0.7rem; }
    .hero-desc {
      font-size: 0.75rem;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }
    .hero-actions { flex-direction: row; width: 100%; }
    .btn-hero-primary,
    .btn-hero-secondary {
      flex: 1;
      justify-content: center;
      padding: 0.5rem 0.8rem;
      font-size: 0.8rem;
    }
    .hero-dots { bottom: 0.5rem; }
    .dot { width: 26px; height: 26px; }
    .dot-track { width: 14px; height: 2px; }
    .dot.active .dot-track { width: 22px; }
  }
</style>
