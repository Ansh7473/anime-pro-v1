<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { Clock, Zap, ChevronLeft, ChevronRight } from "lucide-svelte";

  const TABS = [
    { id: "recently-updated", label: "All Episodes", icon: "🌐" },
    { id: "subbed-anime", label: "Subbed", icon: "🇯🇵" },
    { id: "dubbed-anime", label: "Dubbed", icon: "🎙" },
  ];

  let tab = $state("recently-updated");
  let page = $state(1);
  let animes: any[] = $state([]);
  let loading = $state(true);
  let hasNextPage = $state(false);

  async function fetchEpisodes() {
    loading = true;
    try {
      let res;
      if (tab === "recently-updated") {
        res = await api.getCurrentSeasonal(page, 24);
      } else if (tab === "subbed-anime") {
        res = await api.getTopAnime("TV", page, 24);
      } else {
        res = await api.getTopAnime("MOVIE", page, 24);
      }
      animes = res.data || [];
      hasNextPage = res.pagination?.has_next_page || false;
    } catch (err) {
      console.error("Failed to fetch latest episodes", err);
    } finally {
      loading = false;
    }
  }

  onMount(fetchEpisodes);

  $effect(() => {
    if (tab || page) {
      fetchEpisodes();
      if (typeof window !== "undefined")
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  function changeTab(id: string) {
    tab = id;
    page = 1;
  }
</script>

<svelte:head>
  <title>Latest Episodes — AnimePro</title>
</svelte:head>

<div class="latest-page">
  <!-- Tactical Header -->
  <div class="tactical-header">
    <div class="header-main-content container">

      <div class="title-section">
        <div class="hex-icon">
          <Clock size={24} />
          <div class="hex-border"></div>
        </div>
        <h1 class="tactical-title">LATEST_EPISODES</h1>
        <p class="tactical-sub">STREAMING_LIVE_NOW // UPDATED_REAL_TIME</p>
      </div>

      <!-- Tactical Tabs -->
      <div class="tactical-tabs">
        <div class="tabs-container">
          {#each TABS as t}
            <button
              class="t-tab"
              class:active={tab === t.id}
              onclick={() => changeTab(t.id)}
            >
              <span class="t-tab-label">{t.label}</span>
              {#if tab === t.id}
                <div class="t-tab-indicator" in:fly={{ y: 2, duration: 200 }}></div>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Content Section -->
  <div class="content-section container">
    {#if loading && animes.length === 0}
      <div class="loading-state">
        <div class="tactical-loader">
          <div class="loader-circle"></div>
          <span class="loader-text">SYNCING_DATABASE...</span>
        </div>
      </div>
    {:else if animes.length > 0}
      <div class="anime-grid">
        {#each animes as anime (anime.id)}
          <div class="card-entry" in:fly={{ y: 10, duration: 400 }}>
            <AnimeCard {anime} />
          </div>
        {/each}
      </div>

      <!-- Tactical Pagination -->
      <div class="tactical-pagination">
        <button class="p-btn" disabled={page === 1} onclick={() => page--}>
          <ChevronLeft size={18} />
          <span>PREV_PAGE</span>
        </button>

        <div class="p-info">
          <span class="p-label">SECTOR</span>
          <span class="p-value">{page.toString().padStart(2, '0')}</span>
        </div>

        <button class="p-btn next" disabled={!hasNextPage} onclick={() => page++}>
          <span>NEXT_PAGE</span>
          <ChevronRight size={18} />
        </button>
      </div>
    {:else if !loading}
      <div class="empty-state">
        <div class="empty-icon"><Clock size={40} /></div>
        <p class="empty-msg">NO_RECORDS_FOUND_IN_CACHE</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .latest-page {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding-bottom: 5rem;
  }

  .tactical-header {
    padding: 120px 0 60px;
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    background: linear-gradient(to bottom, rgba(229, 9, 20, 0.05), transparent);
  }

  .status-board {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-bottom: 40px;
  }
  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-mono);
  }
  .status-item .label {
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.1em;
  }
  .status-item .value {
    font-size: 0.75rem;
    color: var(--net-red);
    font-weight: 700;
  }
  .status-divider {
    width: 1px;
    height: 30px;
    background: rgba(255, 255, 255, 0.1);
  }

  .title-section {
    text-align: center;
    margin-bottom: 50px;
  }
  .hex-icon {
    position: relative;
    width: 60px;
    height: 60px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--net-red);
  }
  .hex-border {
    position: absolute;
    inset: 0;
    border: 2px solid var(--net-red);
    border-radius: 12px;
    transform: rotate(45deg);
    opacity: 0.3;
  }
  .tactical-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -0.02em;
    font-family: var(--font-mono);
    margin: 0;
    background: linear-gradient(to bottom, #fff, rgba(255,255,255,0.7));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .tactical-sub {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.2em;
    margin-top: 10px;
  }

  .tactical-tabs {
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }
  .tabs-container {
    display: flex;
    gap: 8px;
    padding: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    backdrop-filter: blur(10px);
  }
  .t-tab {
    padding: 10px 24px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.3s;
    position: relative;
  }
  .t-tab.active {
    color: #fff;
    background: rgba(229, 9, 20, 0.15);
  }
  .t-tab-indicator {
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--net-red);
    box-shadow: 0 0 10px var(--net-red);
  }

  .anime-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 30px;
    margin-top: 60px;
  }

  .tactical-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 30px;
    margin-top: 80px;
  }
  .p-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 24px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: #fff;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    transition: all 0.3s;
  }
  .p-btn:not(:disabled):hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
  }
  .p-btn:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
  .p-btn.next {
    background: rgba(229, 9, 20, 0.1);
    border-color: rgba(229, 9, 20, 0.2);
    color: var(--net-red);
  }
  .p-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: var(--font-mono);
  }
  .p-label { font-size: 0.55rem; color: rgba(255,255,255,0.4); }
  .p-value { font-size: 1.1rem; font-weight: 800; color: #fff; }

  .loading-state {
    display: flex;
    justify-content: center;
    padding: 100px 0;
  }
  .tactical-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  .loader-circle {
    width: 40px;
    height: 40px;
    border: 2px solid rgba(229, 9, 20, 0.2);
    border-top-color: var(--net-red);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .loader-text {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--net-red);
    letter-spacing: 0.1em;
  }

  .empty-state {
    text-align: center;
    padding: 100px 0;
    opacity: 0.5;
  }
  .empty-msg {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    margin-top: 15px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .tactical-header { padding: 80px 0 40px; }
    .tactical-title { font-size: 1.8rem; }
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 20px;
    }
    .status-board { gap: 15px; margin-bottom: 30px; }
    .t-tab { padding: 8px 16px; font-size: 0.7rem; }
  }

  @media (max-width: 480px) {
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 15px;
    }
    .tactical-pagination { gap: 15px; flex-wrap: wrap; }
    .p-btn { padding: 10px 18px; font-size: 0.7rem; }
  }
</style>
