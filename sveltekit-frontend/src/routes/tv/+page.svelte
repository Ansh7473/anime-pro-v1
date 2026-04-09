<script lang="ts">
  import { api } from "$lib/api";
  import TVRow from "$lib/components/tv/TVRow.svelte";
  import TVHeroBanner from "$lib/components/tv/TVHeroBanner.svelte";
  import { onMount } from "svelte";

  let homeData: any = $state(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      homeData = await api.getHome();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="tv-home">
  {#if loading}
    <div class="tv-skeleton">
      <div class="sk-hero"></div>
      <div class="sk-row"></div>
      <div class="sk-row"></div>
    </div>
  {:else if homeData}
    <TVHeroBanner items={homeData.trending || homeData.popular || []} />

    <div class="tv-rows">
      <TVRow title="Trending Now" items={homeData.trending || []} />
      <TVRow title="Most Popular" items={homeData.popular || []} />
      <TVRow title="Top Rated" items={homeData.topRated || []} />
      <TVRow title="Recently Added" items={homeData.latest || []} />
    </div>
  {/if}
</div>

<style>
  .tv-home {
    width: 100%;
  }

  .tv-rows {
    padding-bottom: 6rem;
    margin-top: -2rem; /* Pull rows up into the hero's safe-gradient area */
    position: relative;
    z-index: 5;
  }

  /* Skeletons */
  .tv-skeleton {
    padding: 2rem;
  }
  .sk-hero {
    height: 70vh;
    background: #111;
    border-radius: 24px;
    margin-bottom: 3rem;
  }
  .sk-row {
    height: 200px;
    background: #111;
    border-radius: 12px;
    margin-bottom: 2rem;
    width: 100%;
  }
</style>
