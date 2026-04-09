<script lang="ts">
  import { api } from "$lib/api";
  import Row from "$lib/components/Row.svelte";
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

  let featuredAnime = $derived(homeData?.trending?.[0] || homeData?.popular?.[0]);
</script>

<div class="tv-home">
  {#if loading}
    <div class="tv-skeleton">
      <div class="sk-hero"></div>
      <div class="sk-row"></div>
      <div class="sk-row"></div>
    </div>
  {:else if homeData}
    <section class="tv-hero">
      <div class="hero-overlay"></div>
      {#if featuredAnime}
        <img src={featuredAnime.image || featuredAnime.poster} alt={featuredAnime.title} class="hero-backdrop" />
        <div class="hero-info">
          <span class="trending-tag">#1 TRENDING TODAY</span>
          <h1 class="hero-title">{featuredAnime.title}</h1>
          <p class="hero-synopsis">{featuredAnime.synopsis?.slice(0, 250)}...</p>
          <div class="hero-btns">
            <a href="/anime/{featuredAnime.id}" class="tv-btn primary">PLAY NOW</a>
            <a href="/anime/{featuredAnime.id}" class="tv-btn secondary">MORE INFO</a>
          </div>
        </div>
      {/if}
    </section>

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

  .tv-hero {
    position: relative;
    min-height: 70vh;
    margin-bottom: 2rem;
    border-radius: 24px;
    overflow: hidden;
    background: #111;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .hero-backdrop {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.6;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #050505 0%, transparent 60%),
                linear-gradient(to right, #050505 0%, transparent 50%);
    z-index: 1;
  }

  .hero-info {
    position: relative;
    z-index: 2;
    max-width: 800px;
    padding: 3rem 4rem 6rem 4rem; /* Top/Right/Bottom/Left padding to push content properly */
  }

  .trending-tag {
    color: var(--net-red);
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: 2px;
    margin-bottom: 1rem;
    display: block;
  }

  .hero-title {
    font-size: 5rem;
    font-weight: 900;
    margin-bottom: 1.5rem;
    line-height: 1;
    text-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  .hero-synopsis {
    font-size: 1.25rem;
    color: rgba(255,255,255,0.7);
    line-height: 1.6;
    margin-bottom: 2rem;
  }

  .hero-btns {
    display: flex;
    gap: 1.5rem;
  }

  .tv-btn {
    padding: 1.2rem 2.5rem;
    border-radius: 12px;
    font-weight: 800;
    font-size: 1.1rem;
    text-decoration: none;
    transition: all 0.2s;
  }

  .tv-btn.primary {
    background: white;
    color: black;
  }

  .tv-btn.secondary {
    background: rgba(255,255,255,0.1);
    color: white;
    backdrop-filter: blur(10px);
  }

  .tv-btn:hover,
  .tv-btn:focus-visible {
    transform: scale(1.1);
    outline: none;
    background: var(--net-red);
    color: white;
    box-shadow: 0 0 40px rgba(229, 9, 20, 0.4);
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

  @media (max-width: 1200px) {
    .hero-title { font-size: 3.5rem; }
    .hero-info { padding-left: 2rem; padding-bottom: 4rem; }
  }
</style>
