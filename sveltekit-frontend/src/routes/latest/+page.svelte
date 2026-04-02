<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { onMount } from "svelte";
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
  <!-- Hero Header -->
  <div class="hero-header">
    <div class="hero-bg"></div>
    <div class="hero-content container">
      <div class="title-row">
        <div class="icon-box">
          <Clock size={22} color="white" />
        </div>
        <div>
          <p class="brand">ANIME PRO</p>
          <h1 class="main-title">Latest Episodes</h1>
        </div>
        <div class="live-badge">
          <Zap size={13} color="#e50914" fill="#e50914" />
          <span>LIVE</span>
        </div>
      </div>
      <p class="subtitle">Freshest episodes updated daily</p>

      <!-- Tabs -->
      <div class="tabs">
        {#each TABS as t}
          <button
            class="tab-btn"
            class:active={tab === t.id}
            onclick={() => changeTab(t.id)}
          >
            <span class="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="content container">
    <div class="divider"></div>

    {#if loading && animes.length === 0}
      <div class="center">
        <div class="spinner"></div>
      </div>
    {:else if animes.length > 0}
      <div class="grid">
        {#each animes as anime (anime.id)}
          <div class="card-wrap">
            <AnimeCard {anime} />
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <button class="nav-btn" disabled={page === 1} onclick={() => page--}>
          <ChevronLeft size={18} /> Prev
        </button>

        <div class="page-indicator">
          Page {page}
        </div>

        <button
          class="nav-btn next"
          disabled={!hasNextPage}
          onclick={() => page++}
        >
          Next <ChevronRight size={18} />
        </button>
      </div>
    {:else if !loading}
      <div class="empty">
        <Clock size={48} />
        <p>No episodes found.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .latest-page {
    background: #050505;
    min-height: 100vh;
    color: white;
  }
  .hero-header {
    position: relative;
    overflow: hidden;
    padding: 100px 0 3rem;
    background: linear-gradient(
      180deg,
      rgba(229, 9, 20, 0.12) 0%,
      transparent 100%
    );
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(
        circle at 20% 50%,
        rgba(229, 9, 20, 0.06) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 20%,
        rgba(229, 9, 20, 0.04) 0%,
        transparent 50%
      );
    pointer-events: none;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 0.5rem;
  }
  .icon-box {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    background: linear-gradient(135deg, #e50914, #ff4444);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(229, 9, 20, 0.4);
  }
  .brand {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(229, 9, 20, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin: 0;
  }
  .main-title {
    font-size: clamp(1.5rem, 4vw, 2.4rem);
    font-weight: 900;
    margin: 0;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  .live-badge {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 800;
    color: #e50914;
  }
  .subtitle {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.95rem;
    margin: 0.5rem 0 2rem;
    padding-left: 62px;
  }
  .tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding-left: 62px;
  }
  .tab-btn {
    padding: 10px 22px;
    border-radius: 50px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: white;
    transition: all 0.2s;
  }
  .tab-btn.active {
    border-color: rgba(229, 9, 20, 0.6);
    background: linear-gradient(135deg, #e50914, #ff4444);
    box-shadow: 0 4px 20px rgba(229, 9, 20, 0.35);
  }
  .tab-icon {
    margin-right: 4px;
  }
  .content {
    padding-bottom: 5rem;
  }
  .divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(229, 9, 20, 0.4),
      rgba(255, 255, 255, 0.05),
      transparent
    );
    margin-bottom: 2.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1.5rem;
  }
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-top: 4rem;
  }
  .nav-btn {
    padding: 12px 24px;
    border-radius: 50px;
    font-weight: 700;
    font-size: 0.9rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: 0.2s;
  }
  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .nav-btn.next:not(:disabled) {
    background: linear-gradient(135deg, #e50914, #ff4444);
    border-color: rgba(229, 9, 20, 0.5);
    box-shadow: 0 4px 16px rgba(229, 9, 20, 0.3);
  }
  .page-indicator {
    padding: 10px 24px;
    border-radius: 50px;
    background: rgba(229, 9, 20, 0.12);
    border: 1px solid rgba(229, 9, 20, 0.25);
    font-weight: 800;
    font-size: 0.95rem;
    color: #e50914;
  }
  .center {
    display: flex;
    justify-content: center;
    padding: 5rem 0;
  }
  .empty {
    text-align: center;
    padding: 5rem;
    color: rgba(255, 255, 255, 0.3);
  }
  .empty p {
    font-size: 1.1rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .hero-header {
      padding: 80px 0 2.5rem;
    }
    .title-row {
      gap: 12px;
    }
    .icon-box {
      width: 40px;
      height: 40px;
      border-radius: 12px;
    }
    .brand {
      font-size: 0.7rem;
    }
    .main-title {
      font-size: 1.8rem;
    }
    .live-badge {
      padding: 5px 10px;
      font-size: 0.7rem;
    }
    .subtitle {
      font-size: 0.9rem;
      margin: 0.5rem 0 1.5rem;
      padding-left: 0;
    }
    .tabs {
      gap: 8px;
      padding-left: 0;
    }
    .tab-btn {
      padding: 8px 18px;
      font-size: 0.85rem;
    }
    .content {
      padding-bottom: 4rem;
    }
    .divider {
      margin-bottom: 2rem;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 1rem;
    }
    .pagination {
      gap: 12px;
      margin-top: 3rem;
    }
    .nav-btn {
      padding: 10px 20px;
      font-size: 0.85rem;
    }
    .page-indicator {
      padding: 8px 20px;
      font-size: 0.9rem;
    }
    .center {
      padding: 4rem 0;
    }
    .empty {
      padding: 4rem;
    }
  }

  @media (max-width: 480px) {
    .hero-header {
      padding: 60px 0 2rem;
    }
    .title-row {
      flex-wrap: wrap;
      gap: 10px;
    }
    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }
    .brand {
      font-size: 0.65rem;
    }
    .main-title {
      font-size: 1.5rem;
    }
    .live-badge {
      margin-left: 0;
      padding: 4px 8px;
      font-size: 0.65rem;
    }
    .subtitle {
      font-size: 0.85rem;
      margin: 0.4rem 0 1.25rem;
    }
    .tabs {
      gap: 6px;
    }
    .tab-btn {
      padding: 7px 14px;
      font-size: 0.8rem;
    }
    .tab-icon {
      margin-right: 3px;
    }
    .content {
      padding-bottom: 3rem;
    }
    .divider {
      margin-bottom: 1.5rem;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 0.85rem;
    }
    .pagination {
      gap: 10px;
      margin-top: 2.5rem;
      flex-wrap: wrap;
    }
    .nav-btn {
      padding: 8px 16px;
      font-size: 0.8rem;
    }
    .page-indicator {
      padding: 6px 16px;
      font-size: 0.85rem;
    }
    .center {
      padding: 3rem 0;
    }
    .empty {
      padding: 3rem;
    }
    .empty p {
      font-size: 1rem;
    }
  }

  @media (max-width: 360px) {
    .hero-header {
      padding: 50px 0 1.5rem;
    }
    .title-row {
      gap: 8px;
    }
    .icon-box {
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }
    .main-title {
      font-size: 1.3rem;
    }
    .subtitle {
      font-size: 0.8rem;
      margin: 0.3rem 0 1rem;
    }
    .tabs {
      gap: 5px;
    }
    .tab-btn {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
      gap: 0.7rem;
    }
    .pagination {
      gap: 8px;
      margin-top: 2rem;
    }
    .nav-btn {
      padding: 7px 14px;
      font-size: 0.75rem;
    }
    .page-indicator {
      padding: 5px 14px;
      font-size: 0.8rem;
    }
  }
</style>
