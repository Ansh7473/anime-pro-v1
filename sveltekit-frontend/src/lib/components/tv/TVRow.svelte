<script lang="ts">
  import TVAnimeCard from "./TVAnimeCard.svelte";
  import { onMount } from "svelte";

  let {
    title,
    items = [],
  } = $props<{ title: string; items: any[] }>();
  
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

  // TV Remote navigation helper
  function handleKeydown(e: KeyboardEvent) {
    // Basic focus management if needed, but browser handles most standard scroll
  }
</script>

{#if uniqueItems.length > 0}
  <section class="tv-row-section">
    <div class="tv-row-header">
      <h2 class="tv-row-title">{title}</h2>
    </div>
    <div class="tv-row-wrapper">
      <div class="tv-row-scroll" bind:this={scrollContainer} onkeydown={handleKeydown} role="presentation">
        {#each uniqueItems as anime (anime.id || anime.mal_id || Math.random())}
          <TVAnimeCard {anime} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .tv-row-section {
    margin-bottom: 2rem;
    padding: 0 2rem;
  }
  
  .tv-row-header {
    margin-bottom: 1rem;
  }
  
  .tv-row-title {
    font-size: 2.2rem;
    font-weight: 900;
    color: white;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    opacity: 1;
  }
  
  .tv-row-wrapper {
    position: relative;
    padding: 1rem 0;
  }
  
  .tv-row-scroll {
    display: flex;
    gap: 2rem;
    overflow-x: auto;
    padding: 1.5rem 0.5rem;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-padding: 0 4rem;
  }
  
  .tv-row-scroll::-webkit-scrollbar {
    display: none;
  }

  /* Ensure focused card is fully visible */
  .tv-row-scroll :global(.tv-card:focus-visible) {
    scroll-margin: 0 4rem;
    outline: none;
  }
</style>
