<script lang="ts">
  import { api } from "$lib/api";
  import Row from "$lib/components/Row.svelte";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
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
    <HeroBanner items={homeData.trending || homeData.popular || []} />

    <div class="tv-rows">
      <Row title="Trending Now" items={homeData.trending || []} />
      <Row title="Most Popular" items={homeData.popular || []} />
      <Row title="Top Rated" items={homeData.topRated || []} />
      <Row title="Recently Added" items={homeData.latest || []} />
    </div>
  {/if}
</div>

<style>
  .tv-home {
    width: 100%;
  }

  .tv-rows {
    padding-bottom: 10rem;
    margin-top: -4rem;
    position: relative;
    z-index: 3;
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
