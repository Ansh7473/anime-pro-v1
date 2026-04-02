<script lang="ts">
  import AnimeCard from "./AnimeCard.svelte";

  let {
    title,
    items = [],
    href = "",
  } = $props<{ title: string; items: any[]; href?: string }>();
  let scrollContainer: HTMLDivElement;

  function scrollBy(dir: number) {
    scrollContainer?.scrollBy({ left: dir * 400, behavior: "smooth" });
  }
</script>

{#if items.length > 0}
  <section class="row-section">
    <div class="row-header">
      <h2 class="row-title">{title}</h2>
      {#if href}
        <a {href} class="row-see-all">See All →</a>
      {/if}
    </div>
    <div class="row-wrapper">
      <button class="row-arrow left" onclick={() => scrollBy(-1)}>‹</button>
      <div class="row-scroll" bind:this={scrollContainer}>
        {#each items as anime (anime.id || anime.mal_id)}
          <AnimeCard {anime} />
        {/each}
      </div>
      <button class="row-arrow right" onclick={() => scrollBy(1)}>›</button>
    </div>
  </section>
{/if}

<style>
  .row-section {
    margin-bottom: 2rem;
  }
  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 0.75rem;
  }
  .row-title {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .row-see-all {
    color: var(--net-text-muted);
    font-size: 0.85rem;
    transition: color 0.2s;
  }
  .row-see-all:hover {
    color: var(--net-red);
  }
  .row-wrapper {
    position: relative;
  }
  .row-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0.5rem 1rem;
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
    height: 80px;
    border-radius: var(--radius-md);
    background: rgba(20, 20, 20, 0.8);
    color: white;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .row-wrapper:hover .row-arrow {
    opacity: 1;
  }
  .row-arrow.left {
    left: 0;
  }
  .row-arrow.right {
    right: 0;
  }
  .row-arrow:hover {
    background: rgba(229, 9, 20, 0.8);
  }

  @media (max-width: 768px) {
    .row-section {
      margin-bottom: 1.5rem;
    }
    .row-header {
      padding: 0 0.75rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1.1rem;
    }
    .row-see-all {
      font-size: 0.8rem;
    }
    .row-scroll {
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
    }
    .row-arrow {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .row-section {
      margin-bottom: 1.25rem;
    }
    .row-header {
      padding: 0 0.5rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1rem;
    }
    .row-scroll {
      gap: 0.4rem;
      padding: 0.5rem 0.5rem;
    }
  }
</style>
