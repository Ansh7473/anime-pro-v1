<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { onMount } from "svelte";
  import { Film, Radio, Activity, Cpu, ShieldCheck, ChevronDown } from "lucide-svelte";
  import { fade, fly } from "svelte/transition";

  let items: any[] = $state([]);
  let loading = $state(true);
  let hasNext = $state(false);
  let currentPage = $state(1);
  let activeFilter = $state("POPULAR");

  const filters = ["POPULAR", "TRENDING", "TOP_RATED", "UPCOMING"];

  onMount(() => loadPage(1));

  async function loadPage(p: number) {
    loading = true;
    try {
      let res;
      switch (activeFilter) {
        case "TRENDING":
          res = await api.getTopAnime("MOVIE", p, 20, "TRENDING_DESC");
          break;
        case "UPCOMING":
          res = await api.getTopAnime("MOVIE", p, 20, "START_DATE_DESC");
          break;
        case "TOP_RATED":
          res = await api.getTopAnime("MOVIE", p, 20, "SCORE_DESC");
          break;
        case "POPULAR":
        default:
          res = await api.getTopAnime("MOVIE", p);
          break;
      }

      items = p === 1 ? res.data : [...items, ...res.data];
      hasNext = res.pagination?.has_next_page || false;
      currentPage = p;
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function setFilter(f: string) {
    activeFilter = f;
    loadPage(1);
  }
</script>

<svelte:head>
  <title>Cinematic Sector — AnimePro</title>
</svelte:head>

<div class="movies-page">
  <!-- Tactical HUD Header -->
  <header class="tactical-header">
    <div class="container" in:fly={{ y: -20, duration: 800 }}>
      <div class="status-board">
        <div class="board-scanline"></div>
        <div class="board-header">
          <div class="status-pill">
            <Film size={12} class="pulse text-secondary" />
            <span>FEATURE_OPS_ACTIVE</span>
          </div>
          <span class="system-id">SYS_REF: PRO-MV01</span>
        </div>
        
        <div class="board-body">
          <div class="title-group">
            <h1 class="tactical-title">ANIME MOVIES</h1>
            <p class="tactical-subtitle">SINGLE_ENGAGEMENT_MISSION_DOSSIERS</p>
          </div>
          
          <div class="telemetry hide-mobile">
            <div class="tel-box">
              <span class="label">SECTOR</span>
              <span class="val">CINEMATIC</span>
            </div>
            <div class="tel-box">
              <span class="label">UPLINK</span>
              <span class="val text-primary">SECURE</span>
            </div>
            <div class="tel-box">
              <span class="label">BITRATE</span>
              <span class="val">MAX_ULTRA</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tactical Filters -->
      <nav class="tactical-nav">
        <div class="nav-label">
          <Activity size={14} class="text-primary" />
          <span>FILTER_MODULES</span>
        </div>
        <div class="filter-group">
          {#each filters as f}
            <button 
              class="filter-btn" 
              class:active={activeFilter === f}
              onclick={() => setFilter(f)}
            >
              <div class="btn-hex"></div>
              <span>{f}</span>
            </button>
          {/each}
        </div>
      </nav>
    </div>
  </header>

  <!-- Content Grid -->
  <main class="container content-grid">
    <div class="grid-header">
      <div class="results-count">
        <ShieldCheck size={14} class="text-secondary" />
        <span>DOSSIERS_RETRIEVED: {items.length}</span>
      </div>
      <div class="grid-line"></div>
    </div>

    {#if loading && items.length === 0}
      <div class="loading-state">
        <Cpu size={40} class="spinning text-primary" />
        <p class="mono">RETRIEVING_DOSSIERS...</p>
      </div>
    {:else}
      <div class="anime-grid">
        {#each items as anime (anime.id)}
          <div in:fly={{ y: 20, duration: 500 }}>
            <AnimeCard {anime} />
          </div>
        {/each}
      </div>

      {#if hasNext}
        <div class="pagination-footer">
          <button
            class="load-more-btn"
            onclick={() => loadPage(currentPage + 1)}
            disabled={loading}
          >
            <div class="load-scanline"></div>
            <span class="btn-text">{loading ? "SYNCING..." : "EXPAND_OPERATIONS"}</span>
            <ChevronDown size={16} />
          </button>
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .movies-page {
    padding-top: 100px;
    padding-bottom: 80px;
    min-height: 100vh;
  }

  /* --- Tactical Header --- */
  .tactical-header {
    margin-bottom: 3rem;
  }

  .status-board {
    position: relative;
    background: var(--tactical-glass);
    border: 1px solid var(--tactical-border);
    padding: 1.5rem;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 2rem;
  }

  .board-scanline {
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(20, 184, 166, 0.05) 50%, transparent 50%);
    background-size: 100% 4px;
    pointer-events: none;
    animation: scroll 40s linear infinite;
  }

  @keyframes scroll {
    from { background-position: 0 0; }
    to { background-position: 0 100%; }
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
  }

  .status-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--tactical-secondary);
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; }
  }

  .board-body {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .tactical-title {
    font-size: 2.5rem;
    font-weight: 800;
    line-height: 1;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .tactical-subtitle {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 5px 0 0 0;
    letter-spacing: 0.1em;
  }

  .telemetry {
    display: flex;
    gap: 2rem;
  }

  .tel-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: right;
  }

  .tel-box .label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .tel-box .val {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
  }

  /* --- Tactical Navigation --- */
  .tactical-nav {
    display: flex;
    align-items: center;
    gap: 2rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
  }

  .nav-label {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    white-space: nowrap;
  }

  .filter-group {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .filter-group::-webkit-scrollbar { display: none; }

  .filter-btn {
    position: relative;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
    padding: 6px 16px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    border-radius: 2px;
    white-space: nowrap;
  }

  .filter-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  .filter-btn.active {
    background: var(--tactical-primary);
    border-color: var(--tactical-primary);
    color: #000;
    box-shadow: 0 0 15px rgba(20, 184, 166, 0.3);
  }

  /* --- Content Grid --- */
  .grid-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .results-count {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    white-space: nowrap;
  }

  .grid-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), transparent);
  }

  .anime-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    margin-bottom: 4rem;
  }

  /* --- Pagination --- */
  .pagination-footer {
    display: flex;
    justify-content: center;
  }

  .load-more-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--tactical-glass);
    border: 1px solid var(--tactical-border);
    color: #fff;
    padding: 1rem 2.5rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s;
  }

  .load-more-btn:hover:not(:disabled) {
    border-color: var(--tactical-primary);
    background: rgba(20, 184, 166, 0.05);
  }

  .load-scanline {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.1), transparent);
    animation: sync 2s infinite;
  }

  @keyframes sync {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: wait;
  }

  /* --- States --- */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 0;
    gap: 1.5rem;
  }

  .spinning {
    animation: rotate 2s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .mono { font-family: var(--font-mono); letter-spacing: 0.1em; font-size: 0.9rem; }

  /* --- Responsive --- */
  @media (max-width: 768px) {
    .tactical-title { font-size: 1.8rem; }
    .tactical-nav { gap: 1rem; padding: 0.5rem 1rem; }
    .nav-label { display: none; }
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }
  }

  @media (max-width: 480px) {
    .board-body { align-items: flex-start; }
    .telemetry { display: none; }
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
  }
</style>
