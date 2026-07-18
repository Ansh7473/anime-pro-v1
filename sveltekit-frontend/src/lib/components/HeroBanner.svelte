<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { onDestroy, onMount } from "svelte";

  let { items = [], allowTitleArtwork = false } = $props<{
    items: any[];
    allowTitleArtwork?: boolean;
  }>();
  let current = $state(0);
  let failedArtwork = $state("");
  let paused = $state(false);
  let interval: ReturnType<typeof setInterval> | null = null;
  let reducedMotion = false;
  let motionQuery: MediaQueryList | null = null;
  let touchStartX = $state(0);
  let touchEndX = $state(0);

  const heroes = $derived(
    items.filter((item: any) => item?.bannerImage || item?.image || item?.poster).slice(0, 4),
  );
  const anime = $derived(heroes[current] || heroes[0]);

  function titleOf(item: any): string {
    const title = item?.title || item?.name || item?.userPreferred;
    if (typeof title === "string" && title) return title;
    return title?.english || title?.userPreferred || title?.romaji || title?.native || "Featured anime";
  }

  const title = $derived(titleOf(anime));
  const titleArtwork = $derived(
    allowTitleArtwork
      ? String(anime?.clearLogo || anime?.artwork?.clear_logo || "")
      : "",
  );
  const visibleTitleArtwork = $derived(titleArtwork && titleArtwork !== failedArtwork ? titleArtwork : "");
  const synopsis = $derived(String(anime?.synopsis || anime?.description || "").replace(/<[^>]*>?/gm, ""));
  const id = $derived(anime?.id || anime?.mal_id || "");
  const genres = $derived(Array.isArray(anime?.genres) ? anime.genres.slice(0, 3) : []);
  const format = $derived(String(anime?.type || anime?.format || "Series").replace(/_/g, " "));
  const year = $derived(anime?.year || anime?.seasonYear || "");
  const episodes = $derived(Number(anime?.episodes || anime?.totalEpisodes || 0));
  const rawScore = $derived(Number(anime?.score || anime?.rating || 0));
  const score = $derived(rawScore > 10 ? rawScore / 10 : rawScore);

  function next() {
    if (heroes.length > 1) current = (current + 1) % heroes.length;
  }
  function prev() {
    if (heroes.length > 1) current = (current - 1 + heroes.length) % heroes.length;
  }
  function stopAutoplay() {
    if (interval) clearInterval(interval);
    interval = null;
  }
  function startAutoplay() {
    stopAutoplay();
    if (reducedMotion || heroes.length < 2) return;
    interval = setInterval(() => { if (!paused) next(); }, 6500);
  }
  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.changedTouches[0].screenX;
    touchEndX = touchStartX;
    paused = true;
  }
  function handleTouchMove(event: TouchEvent) {
    touchEndX = event.changedTouches[0].screenX;
  }
  function handleTouchEnd() {
    const distance = touchStartX - touchEndX;
    if (Math.abs(distance) > 50) distance > 0 ? next() : prev();
    paused = false;
    startAutoplay();
  }

  onMount(() => {
    motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotion = motionQuery?.matches ?? false;
      if (reducedMotion) stopAutoplay();
      else startAutoplay();
    };
    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    return () => motionQuery?.removeEventListener("change", updateMotionPreference);
  });
  onDestroy(stopAutoplay);
  $effect(() => {
    if (!heroes.length) current = 0;
    else if (current >= heroes.length) current = 0;
  });
</script>

{#if anime}
  <section
    class="hero"
    aria-label="Featured anime"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  >
    {#each heroes as slide, index (`${slide.id || slide.mal_id || index}-${index}`)}
      <div
        class="hero-art"
        class:active={index === current}
        style={`background-image: url(${getProxiedImage(slide.bannerImage || slide.image || slide.poster || "")})`}
        aria-hidden="true"
      ></div>
    {/each}
    <div class="hero-shade" aria-hidden="true"></div>

    <div class="hero-content">
      <div class="hero-copy">
        <p class="hero-number">Feature {String(current + 1).padStart(2, "0")}</p>
        {#if visibleTitleArtwork}
          <h1 class="artwork-title">
            <img
              class="hero-title-artwork"
              src={getProxiedImage(visibleTitleArtwork)}
              alt={title}
              onerror={() => (failedArtwork = titleArtwork)}
            />
            <span class="sr-only">{title}</span>
          </h1>
        {:else}
          <h1>{title}</h1>
        {/if}
        <div class="hero-facts" aria-label="Anime details">
          <span>{format}</span>
          {#if year}<span>{year}</span>{/if}
          {#if episodes}<span>{episodes} episodes</span>{/if}
          {#if score}<span>{score.toFixed(1)} score</span>{/if}
        </div>
        {#if genres.length}<p class="hero-genres">{genres.join(" / ")}</p>{/if}
        {#if synopsis}<p class="hero-description">{synopsis.slice(0, 190)}{synopsis.length > 190 ? "…" : ""}</p>{/if}
        <div class="hero-actions">
          <a class="watch-action" href={`/watch/${id}/1`}><span>Play episode 1</span><b aria-hidden="true">▶</b></a>
          <a class="detail-action" href={`/anime/${id}`}>Series details <span aria-hidden="true">↗</span></a>
        </div>
      </div>

      {#if heroes.length > 1}
        <div class="hero-pager" aria-label="Featured anime controls">
          <button type="button" onclick={prev} aria-label="Previous feature">←</button>
          <output aria-live="polite">{String(current + 1).padStart(2, "0")} / {String(heroes.length).padStart(2, "0")}</output>
          <button type="button" onclick={next} aria-label="Next feature">→</button>
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    isolation: isolate;
    width: 100%;
    height: calc(100svh - 64px);
    min-height: 620px;
    max-height: 860px;
    overflow: hidden;
    background: #0a0908;
    color: #f7f2e9;
    touch-action: pan-y;
  }
  .hero-art {
    position: absolute;
    inset: 0;
    z-index: -3;
    background-position: center 20%;
    background-size: cover;
    opacity: 0;
    transform: scale(1.015);
    transition: opacity 0.65s ease, transform 6.5s linear;
  }
  .hero-art.active { opacity: 1; transform: scale(1.055); }
  .hero-shade {
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      linear-gradient(90deg, rgba(5,5,4,0.94) 0%, rgba(5,5,4,0.72) 36%, rgba(5,5,4,0.16) 72%, rgba(5,5,4,0.32) 100%),
      linear-gradient(0deg, #070706 0%, rgba(7,7,6,0.82) 12%, transparent 46%);
  }
  .hero-content {
    width: 100%;
    max-width: var(--page-max, 1500px);
    height: 100%;
    margin-inline: auto;
    padding: 4rem max(2.5rem, env(safe-area-inset-right)) 3.25rem max(2.5rem, env(safe-area-inset-left));
    box-sizing: border-box;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 3rem;
  }
  .hero-copy { max-width: 820px; }
  .hero-number { margin: 0 0 1rem; color: #c8bdb1; font-size: 0.76rem; font-weight: 700; }
  h1 {
    max-width: 18ch;
    margin: 0;
    color: #fffaf1;
    font: 850 clamp(3.2rem, 6.3vw, 6.7rem)/0.91 var(--net-display-font, system-ui);
    letter-spacing: -0.065em;
    text-wrap: balance;
    text-shadow: 0 3px 20px rgba(0,0,0,0.45);
  }
  h1.artwork-title { max-width: min(620px, 72vw); }
  .hero-title-artwork {
    display: block;
    width: auto;
    max-width: min(620px, 72vw);
    max-height: clamp(110px, 19vw, 230px);
    object-fit: contain;
    object-position: left bottom;
    filter: drop-shadow(0 6px 26px rgba(0, 0, 0, 0.72));
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .hero-facts { display: flex; flex-wrap: wrap; gap: 0.55rem 1.2rem; margin-top: 1.5rem; color: #ddd4ca; font-size: 0.78rem; font-weight: 700; }
  .hero-facts span + span::before { content: "/"; margin-right: 1.2rem; color: #6f665f; }
  .hero-genres { margin: 0.6rem 0 0; color: #ae9f94; font-size: 0.74rem; }
  .hero-description { max-width: 64ch; margin: 1.2rem 0 0; color: #c3bbb1; font-size: 0.93rem; line-height: 1.65; }
  .hero-actions { display: flex; align-items: center; gap: 1.3rem; margin-top: 1.7rem; }
  .watch-action {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    gap: 1.3rem;
    padding: 0 1rem 0 1.15rem;
    border-radius: 4px;
    background: #e18466;
    color: #160b08;
    font-size: 0.84rem;
    font-weight: 850;
    text-decoration: none;
    transition: background 0.16s ease;
  }
  .watch-action b { font-size: 0.7rem; }
  .watch-action:hover { background: #f0a086; }
  .detail-action { color: #e3dcd3; font-size: 0.82rem; font-weight: 750; text-decoration: none; }
  .detail-action:hover { color: #f1a287; }
  .watch-action:focus-visible, .detail-action:focus-visible, .hero-pager button:focus-visible { outline: 2px solid #f7c1ae; outline-offset: 3px; }

  .hero-pager { display: grid; grid-template-columns: 42px 68px 42px; align-items: center; align-self: end; background: rgba(8,7,6,0.78); border-radius: 4px; }
  .hero-pager button { width: 42px; height: 42px; border: 0; background: transparent; color: #d7cfc5; cursor: pointer; font-size: 1rem; }
  .hero-pager button:hover { background: #211b18; color: #fff; }
  .hero-pager output { color: #9b938b; font-size: 0.68rem; text-align: center; font-variant-numeric: tabular-nums; }

  @media (max-width: 900px) {
    .hero { height: calc(100svh - 56px); min-height: 540px; max-height: 780px; }
    .hero-content { padding: 3rem max(1.25rem, env(safe-area-inset-left)) 2rem; grid-template-columns: 1fr; gap: 1.5rem; }
    .hero-copy { align-self: end; }
    h1 { max-width: 15ch; font-size: clamp(2.75rem, 9vw, 5rem); }
    .hero-description { max-width: 54ch; }
    .hero-pager { position: absolute; right: max(1.25rem, env(safe-area-inset-right)); top: 1.25rem; }
  }
  @media (max-width: 600px) {
    .hero {
      height: 50svh;
      min-height: 330px;
      max-height: 440px;
    }
    .hero-art { background-position: 62% center; }
    .hero-shade { background: linear-gradient(0deg, #070706 0%, rgba(7,7,6,0.95) 24%, rgba(7,7,6,0.35) 66%, rgba(7,7,6,0.28) 100%); }
    .hero-content {
      padding: 3.2rem max(0.9rem, env(safe-area-inset-right)) 1rem max(0.9rem, env(safe-area-inset-left));
    }
    .hero-number { margin-bottom: 0.45rem; font-size: 0.66rem; }
    h1 { max-width: 18ch; font-size: clamp(1.85rem, 9vw, 3rem); line-height: 0.96; }
    h1.artwork-title { max-width: min(78vw, 360px); }
    .hero-title-artwork { max-width: min(78vw, 360px); max-height: 100px; }
    .hero-facts { margin-top: 0.7rem; gap: 0.35rem 0.65rem; }
    .hero-facts span + span::before { margin-right: 0.65rem; }
    .hero-genres { margin-top: 0.4rem; }
    .hero-description { display: none; }
    .hero-actions { align-items: center; flex-direction: row; flex-wrap: wrap; gap: 0.75rem 1rem; margin-top: 0.85rem; }
    .watch-action { width: auto; min-height: 42px; justify-content: space-between; }
    .hero-pager { right: max(0.9rem, env(safe-area-inset-right)); top: 0.8rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-art { transform: none; transition: opacity 0.2s linear; }
    .hero-art.active { transform: none; }
  }
</style>