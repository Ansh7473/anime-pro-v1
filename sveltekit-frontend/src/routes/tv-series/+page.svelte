<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { onMount } from "svelte";

  let items: any[] = $state([]);
  let loading = $state(true);
  let hasNext = $state(false);
  let currentPage = $state(1);

  onMount(() => loadPage(1));

  async function loadPage(p: number) {
    loading = true;
    try {
      const res = await api.getTopAnime("TV", p);
      items = p === 1 ? res.data : [...items, ...res.data];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>TV Series — AnimePro</title></svelte:head>

<div class="page container">
  <h1 class="page-title">📺 TV Series</h1>
  {#if loading && items.length === 0}
    <div class="center"><div class="spinner"></div></div>
  {:else}
    <div class="grid">
      {#each items as anime (anime.id)}
        <AnimeCard {anime} />
      {/each}
    </div>
    {#if hasNext}
      <div class="center">
        <button
          class="btn-secondary"
          onclick={() => loadPage(currentPage + 1)}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .page {
    padding-top: 2rem;
  }
  .page-title {
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
  }
  .grid {
    display: grid;
    gap: 1.25rem;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
  }
  .center {
    display: flex;
    justify-content: center;
    padding: 2rem 0;
  }

  @media (max-width: 768px) {
    .page {
      padding-top: 1.5rem;
    }
    .page-title {
      font-size: 1.5rem;
      margin-bottom: 1.25rem;
    }
    .grid {
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    .center {
      padding: 1.5rem 0;
    }
  }

  @media (max-width: 480px) {
    .page {
      padding-top: 1rem;
    }
    .page-title {
      font-size: 1.3rem;
      margin-bottom: 1rem;
    }
    .grid {
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
    .center {
      padding: 1.25rem 0;
    }
  }

  @media (max-width: 360px) {
    .page-title {
      font-size: 1.2rem;
    }
    .grid {
      gap: 0.7rem;
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    }
  }
</style>
