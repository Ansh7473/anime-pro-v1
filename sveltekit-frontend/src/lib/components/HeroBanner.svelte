<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { onMount, onDestroy } from "svelte";

  let { items = [] } = $props<{ items: any[] }>();

  let current = $state(0);
  let paused = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;

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
    }, 8000);
  }
  function stopAutoplay() {
    if (interval) clearInterval(interval);
  }

  onMount(startAutoplay);
  onDestroy(stopAutoplay);

  const anime = $derived(heroes[current]);
  const poster = $derived(getProxiedImage(anime?.image || anime?.poster || ""));
  const title = $derived(anime?.title || "Unknown");
  const synopsis = $derived((anime?.synopsis || "").replace(/<[^>]*>?/gm, ""));
  const genres = $derived(anime?.genres || []);
  const id = $derived(anime?.id || anime?.mal_id);
  const score = $derived(anime?.score || anime?.rating || 0);
</script>

{#if heroes.length > 0}
  <section
    class="hero"
    aria-label="Featured anime carousel"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
  >
    <!-- Background slides -->
    {#each heroes as slide, i}
      <div
        class="hero-bg"
        class:active={i === current}
        style="background-image: url({getProxiedImage(
          slide.image || slide.poster || '',
        )});"
      ></div>
    {/each}

    <div class="hero-gradient"></div>

    <!-- Content -->
    <div class="hero-content">
      <div class="hero-badge">
        <span class="badge-dot"></span>
        <span>#{current + 1} Trending</span>
      </div>
      <h1 class="hero-title">{title}</h1>
      {#if genres.length > 0}
        <div class="hero-genres">
          {#each genres.slice(0, 4) as genre}
            <span class="genre-tag">{genre}</span>
          {/each}
          {#if score > 0}
            <span class="genre-tag score"
              >⭐ {typeof score === "number" && score > 10
                ? (score / 10).toFixed(1)
                : score}</span
            >
          {/if}
        </div>
      {/if}
      <p class="hero-desc">
        {synopsis.slice(0, 180)}{synopsis.length > 180 ? "..." : ""}
      </p>
      <div class="hero-actions">
        <a href="/anime/{id}" class="btn-primary">▶ Watch Now</a>
        <a href="/anime/{id}" class="btn-secondary">ℹ More Info</a>
      </div>
    </div>

    <!-- Navigation arrows -->
    <button class="hero-arrow left" onclick={prev} aria-label="Previous"
      >‹</button
    >
    <button class="hero-arrow right" onclick={next} aria-label="Next">›</button>

    <!-- Dot indicators -->
    <div class="hero-dots">
      {#each heroes as _, i}
        <button
          class="dot"
          class:active={i === current}
          onclick={() => goTo(i)}
          aria-label="Slide {i + 1}"
        >
          {#if i === current}
            <span class="dot-progress"></span>
          {/if}
        </button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    width: 100%;
    height: 80vh;
    min-height: 500px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  .hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center top;
    opacity: 0;
    transform: scale(1.05);
    transition:
      opacity 1s cubic-bezier(0.4, 0, 0.2, 1),
      transform 8s cubic-bezier(0.4, 0, 0.2, 1);
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
      linear-gradient(
        to top,
        var(--net-bg) 0%,
        rgba(10, 10, 10, 0.7) 40%,
        rgba(10, 10, 10, 0.2) 100%
      ),
      linear-gradient(to right, rgba(10, 10, 10, 0.8) 0%, transparent 60%);
  }

  .hero-content {
    position: relative;
    z-index: 3;
    padding: 3rem 3rem;
    max-width: 700px;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(229, 9, 20, 0.15);
    border: 1px solid rgba(229, 9, 20, 0.3);
    padding: 0.3rem 0.8rem;
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--net-red);
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--net-red);
    animation: pulse-dot 2s ease infinite;
  }
  @keyframes pulse-dot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .hero-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin-bottom: 0.75rem;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  .hero-genres {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .genre-tag {
    background: rgba(255, 255, 255, 0.08);
    padding: 0.25rem 0.7rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: var(--net-text-muted);
    font-weight: 500;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .genre-tag.score {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
    border-color: rgba(251, 191, 36, 0.15);
  }

  .hero-desc {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    max-width: 500px;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  /* Navigation Arrows */
  .hero-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    width: 48px;
    height: 80px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: white;
    font-size: 2rem;
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
    background: rgba(229, 9, 20, 0.6);
    border-color: var(--net-red);
  }
  .hero-arrow.left {
    left: 1rem;
  }
  .hero-arrow.right {
    right: 1rem;
  }

  /* Dot Indicators */
  .hero-dots {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    gap: 0.5rem;
  }
  .dot {
    width: 32px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    transition: all 0.3s;
    overflow: hidden;
    position: relative;
    border: none;
    padding: 0;
  }
  .dot:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  .dot.active {
    background: rgba(255, 255, 255, 0.2);
    width: 48px;
  }

  .dot-progress {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: var(--net-red);
    border-radius: 2px;
    animation: dot-fill 8s linear forwards;
  }
  @keyframes dot-fill {
    from {
      width: 0%;
    }
    to {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .hero {
      height: 65vh;
      min-height: 400px;
    }
    .hero-content {
      padding: 2rem 1.5rem;
    }
    .hero-arrow {
      display: none;
    }
    .hero-title {
      font-size: clamp(1.5rem, 6vw, 2.5rem);
    }
    .hero-desc {
      font-size: 0.85rem;
      max-width: 100%;
    }
    .hero-genres {
      gap: 0.4rem;
    }
    .genre-tag {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
    }
    .hero-actions {
      gap: 0.5rem;
    }
    .btn-primary,
    .btn-secondary {
      padding: 0.5rem 1.2rem;
      font-size: 0.9rem;
    }
    .hero-dots {
      bottom: 1.5rem;
    }
    .dot {
      width: 24px;
      height: 3px;
    }
    .dot.active {
      width: 36px;
    }
  }

  @media (max-width: 480px) {
    .hero {
      height: 60vh;
      min-height: 350px;
    }
    .hero-content {
      padding: 1.5rem 1rem;
    }
    .hero-badge {
      font-size: 0.7rem;
      padding: 0.25rem 0.6rem;
    }
    .hero-title {
      font-size: clamp(1.3rem, 8vw, 2rem);
    }
    .hero-desc {
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
    .hero-actions {
      flex-direction: column;
      width: 100%;
    }
    .btn-primary,
    .btn-secondary {
      width: 100%;
      justify-content: center;
    }
    .hero-dots {
      bottom: 1rem;
    }
    .dot {
      width: 20px;
      height: 3px;
    }
    .dot.active {
      width: 30px;
    }
  }
</style>
