<script lang="ts">
  import AnimeCard from "./AnimeCard.svelte";

  let {
    title,
    items = [],
    href = "",
  } = $props<{ title: string; items: any[]; href?: string }>();
  let scrollContainer: HTMLDivElement | undefined = $state();

  let uniqueItems = $derived.by(() => {
    const seen = new Set();
    return items.filter((anime: any) => {
      const id = anime.id || anime.mal_id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  function scrollBy(dir: number) {
    scrollContainer?.scrollBy({ left: dir * 400, behavior: "smooth" });
  }
</script>

{#if uniqueItems.length > 0}
  <section class="row-section">
    <div class="row-header">
      <div class="row-title-group">
        <span class="accent-bar"></span>
        <h2 class="row-title">{title}</h2>
      </div>
      {#if href}
        <a {href} class="row-see-all" aria-label="See all {title.toLowerCase()}">See All →</a>
      {/if}
    </div>
    <div class="row-wrapper">
      <button class="row-arrow left" onclick={() => scrollBy(-1)} aria-label="Scroll left">‹</button>
      <div class="row-scroll" bind:this={scrollContainer}>
        {#each uniqueItems as anime (anime.id || anime.mal_id || Math.random())}
          <AnimeCard {anime} />
        {/each}
      </div>
      <button class="row-arrow right" onclick={() => scrollBy(1)} aria-label="Scroll right">›</button>
    </div>
  </section>
{/if}

<style>
  .row-section {
    margin-bottom: 1.5rem;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 0.6rem;
  }
  .row-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .accent-bar {
    width: 4px;
    height: 18px;
    background: white;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .row-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    letter-spacing: 0.01em;
  }
  .row-see-all {
    color: #a3a3a3;
    font-size: 0.82rem;
    font-weight: 500;
    transition: color 0.2s;
    text-decoration: none;
  }
  .row-see-all:hover {
    color: white;
  }
  .row-wrapper {
    position: relative;
  }
  .row-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0.4rem 1rem;
    scroll-snap-type: x mandatory;
    -ms-overflow-style: none;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .row-scroll::-webkit-scrollbar {
    display: none;
  }
  .row-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    width: 36px;
    height: 72px;
    border-radius: 6px;
    background: rgba(20, 20, 20, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: white;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.3s, background 0.2s;
  }
  .row-wrapper:hover .row-arrow {
    opacity: 1;
  }
  .row-arrow.left { left: 0; }
  .row-arrow.right { right: 0; }
  .row-arrow:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  @media (max-width: 768px) {
    .row-section { margin-bottom: 1.25rem; }
    .row-header { padding: 0 0.75rem; margin-bottom: 0.5rem; }
    .row-title { font-size: 1rem; }
    .accent-bar { height: 16px; }
    .row-scroll { gap: 0.5rem; padding: 0.3rem 0.75rem; }
    .row-arrow { display: none; }
  }

  @media (max-width: 480px) {
    .row-section { margin-bottom: 1rem; }
    .row-header { padding: 0 0.5rem; margin-bottom: 0.4rem; }
    .row-title { font-size: 0.92rem; }
    .accent-bar { height: 14px; width: 3px; }
    .row-scroll { gap: 0.4rem; padding: 0.3rem 0.5rem; }
  }
</style>
