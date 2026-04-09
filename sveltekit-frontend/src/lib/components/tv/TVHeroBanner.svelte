<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { onMount, onDestroy } from "svelte";
  import { fly } from "svelte/transition";
  import { goto } from "$app/navigation";

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

  function startAutoplay() {
    stopAutoplay();
    interval = setInterval(() => {
      if (!paused) next();
    }, 10000);
  }
  function stopAutoplay() {
    if (interval) clearInterval(interval);
  }

  let watchBtn: HTMLButtonElement | undefined = $state();

  onMount(() => {
    startAutoplay();
    // Delay focus slightly to ensure hydration is complete
    setTimeout(() => {
      watchBtn?.focus();
    }, 100);
  });
  onDestroy(stopAutoplay);

  const anime = $derived(heroes[current]);
  const title = $derived(anime?.title || "Unknown");
  const synopsis = $derived((anime?.synopsis || "").replace(/<[^>]*>?/gm, ""));
  const genres = $derived(anime?.genres || []);
  const id = $derived(anime?.id || anime?.mal_id);
  const score = $derived(anime?.score || anime?.rating || 0);

  function handleNavigate(e?: Event) {
    if (e) e.preventDefault();
    if (id) goto(`/anime/${id}`);
  }
</script>

{#if heroes.length > 0}
  <section
    class="tv-hero"
    aria-label="Featured anime carousel"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    in:fly={{ y: 20, duration: 800 }}
  >
    <!-- Background slides -->
    {#each heroes as slide, i}
      <div
        class="tv-hero-bg"
        class:active={i === current}
        style="background-image: url({getProxiedImage(slide.image || slide.poster || '')});"
      ></div>
    {/each}

    <div class="tv-hero-gradient"></div>

    <!-- Content -->
    <div class="tv-hero-content">
      <div class="tv-hero-badge">
        <span class="tv-badge-dot"></span>
        <span>#{current + 1} Trending Now</span>
      </div>
      <h1 class="tv-hero-title">{title}</h1>
      
      {#if genres.length > 0}
        <div class="tv-hero-genres">
          {#each genres.slice(0, 4) as genre}
            <span class="tv-genre-tag">{genre}</span>
          {/each}
          {#if score > 0}
            <span class="tv-genre-tag score">⭐ {typeof score === "number" && score > 10 ? (score / 10).toFixed(1) : score}</span>
          {/if}
        </div>
      {/if}

      <p class="tv-hero-desc">
        {synopsis.slice(0, 300)}{synopsis.length > 300 ? "..." : ""}
      </p>

      <div class="tv-hero-actions">
        <button 
          bind:this={watchBtn}
          class="tv-btn tv-btn-primary" 
          onclick={handleNavigate} 
          tabindex="0"
        >
          ▶ Watch Now
        </button>
        <button 
          class="tv-btn tv-btn-secondary" 
          onclick={handleNavigate} 
          tabindex="0"
        >
          ℹ More Details
        </button>
      </div>
    </div>

    <!-- Manual Navigation Arrows -->
    <button class="tv-nav-arrow prev" onclick={() => { prev(); startAutoplay(); }} aria-label="Previous slide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <button class="tv-nav-arrow next" onclick={() => { next(); startAutoplay(); }} aria-label="Next slide">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </button>

    <!-- Dot indicators -->
    <div class="tv-hero-dots">
      {#each heroes as _, i}
        <div class="tv-dot" class:active={i === current}>
          {#if i === current}
            <div class="tv-dot-progress"></div>
          {/if}
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .tv-hero {
    position: relative;
    width: 100%;
    height: 60vh;
    min-height: 400px;
    overflow: hidden;
    display: flex;
    align-items: center; 
  }

  .tv-hero-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 20%;
    opacity: 0;
    transform: scale(1.15) translateZ(0);
    transition: opacity 1.5s ease-in-out, transform 12s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 0;
    will-change: opacity, transform; /* Essential for smooth cross-fades */
  }
  .tv-hero-bg.active {
    opacity: 1;
    transform: scale(1) translateZ(0);
    z-index: 1;
  }

  .tv-hero-gradient {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: 
      linear-gradient(to top, #050505 0%, rgba(5, 5, 5, 0.9) 15%, rgba(5, 5, 5, 0.4) 40%, transparent 80%),
      linear-gradient(to right, rgba(5, 5, 5, 1) 0%, rgba(5, 5, 5, 0.8) 20%, rgba(5, 5, 5, 0.4) 45%, transparent 75%);
  }

  .tv-hero-content {
    position: relative;
    z-index: 10;
    padding: 2rem 10rem; /* Balanced vertical padding */
    max-width: 1400px;
    pointer-events: none;
    width: 100%;
  }

  .tv-hero-content > * {
    pointer-events: auto;
  }

  .tv-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(229, 9, 20, 0.2);
    border: 2px solid rgba(229, 9, 20, 0.3);
    padding: 0.6rem 1.2rem;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--net-red);
    margin-bottom: 2rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .tv-badge-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--net-red);
    box-shadow: 0 0 15px var(--net-red);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }

  .tv-hero-title {
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1.1;
    margin-bottom: 1rem;
    text-shadow: 0 4px 30px rgba(0,0,0,0.8);
    color: white;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* Limit title to 2 lines to prevent layout blowout */
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tv-hero-genres {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .tv-genre-tag {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .tv-genre-tag.score {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.15);
    border-color: rgba(251, 191, 36, 0.3);
  }

  .tv-hero-desc {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.4rem;
    line-height: 1.6;
    margin-bottom: 3rem;
    max-width: 850px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tv-hero-actions {
    display: flex;
    gap: 2rem;
  }

  .tv-btn {
    font-size: 1.5rem;
    font-weight: 800;
    padding: 1rem 2.5rem;
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 4px solid transparent;
  }

  .tv-btn-primary {
    background: white;
    color: black;
  }

  .tv-btn-secondary {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    backdrop-filter: blur(10px);
  }

  .tv-btn:focus-visible {
    transform: scale(1.15);
    border-color: var(--net-red);
    box-shadow: 0 0 50px rgba(229, 9, 20, 0.4);
    outline: none;
  }

  .tv-hero-dots {
    position: absolute;
    bottom: 3rem;
    left: 50%;
    transform: translateX(-50%); /* Centered bottom indicators */
    display: flex;
    gap: 1.25rem;
    z-index: 5;
  }

  .tv-nav-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 80px;
    height: 80px;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15;
    transition: all 0.3s;
    opacity: 0; /* Hidden by default, visible on focus/hover */
    backdrop-filter: blur(10px);
  }

  .tv-hero:hover .tv-nav-arrow,
  .tv-nav-arrow:focus-visible {
    opacity: 1;
    background: rgba(0, 0, 0, 0.6);
  }

  .tv-nav-arrow:focus-visible {
    transform: translateY(-50%) scale(1.2);
    border: 3px solid var(--net-red);
    outline: none;
  }

  .tv-nav-arrow svg { width: 40px; height: 40px; }
  .tv-nav-arrow.prev { left: 2rem; }
  .tv-nav-arrow.next { right: 2rem; }

  .tv-dot {
    width: 60px;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .tv-dot.active {
    background: rgba(255, 255, 255, 0.3);
  }

  .tv-dot-progress {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--net-red);
    animation: fill 10s linear forwards;
  }

  @keyframes fill {
    from { width: 0%; }
    to { width: 100%; }
  }
</style>
