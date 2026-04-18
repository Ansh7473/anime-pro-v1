<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import HeroBanner from "$lib/components/HeroBanner.svelte";
  import Row from "$lib/components/Row.svelte";
  import ContinueCard from "$lib/components/ContinueCard.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { 
    Cpu, 
    ShieldCheck, 
    Smartphone, 
    Monitor, 
    Globe, 
    MessageSquare,
    Zap,
    Users
  } from 'lucide-svelte';

  let homeData: any = $state(null);
  let loading = $state(true);
  let continueWatching: any[] = $state([]);
  let favorites: any[] = $state([]);

  onMount(async () => {
    try {
      const data = await api.getHome();
      if (!data) throw new Error("No data received");
      homeData = data;
    } catch (e) {
      console.error("Failed to load home data:", e);
      homeData = { trending: [], popular: [], topRated: [] };
    } finally {
      loading = false;
    }
  });

  // Reactive refetch for profile-specific data
  $effect(() => {
    if ($auth.token && $auth.currentProfile?.id) {
      fetchUserContent();
    } else {
      continueWatching = [];
      favorites = [];
    }
  });

  async function fetchUserContent() {
    try {
      const [history, favs] = await Promise.all([
        api.getHistory($auth.token!, $auth.currentProfile?.id).catch(() => []),
        api
          .getFavorites($auth.token!, $auth.currentProfile?.id)
          .catch(() => []),
      ]);

      if (history && Array.isArray(history)) {
        continueWatching = history
          .filter((h: any) => !h.completed)
          .slice(0, 15)
          .map((h: any) => ({
            id: h.animeId,
            title: h.animeTitle,
            poster: h.animePoster,
            episode: h.episodeNumber,
            progress: h.progress,
            duration: h.duration,
          }));
      }

      if (favs && Array.isArray(favs)) {
        favorites = favs.map((f: any) => ({
          id: f.animeId,
          title: f.animeTitle,
          poster: f.animePoster,
        }));
      }
    } catch (e) {
      console.error("Failed to fetch user context:", e);
    }
  }
</script>

<svelte:head>
  <title>AnimePro — Your Premium Anime Destination</title>
  <meta
    name="description"
    content="Discover trending, popular, and top-rated anime all in one place."
  />
</svelte:head>

{#if loading}
  <div class="loading-screen">
    <div class="loading-content">
      <div class="spinner-ring">
        <div class="ring"></div>
        <span class="logo-mini">AP</span>
      </div>
      <p>Loading your anime...</p>
    </div>
  </div>
{:else if homeData}
  <!-- Hero Slider Carousel — pass top trending as items -->
  <HeroBanner items={homeData.trending || homeData.popular || []} />

  <div class="home-rows">
    <!-- Continue Watching (logged in + has history) -->
    {#if continueWatching.length > 0}
      <section class="row-section continue-section">
        <div class="row-header">
          <h2 class="row-title">📺 Continue Watching</h2>
          <a href="/history" class="view-all">View All</a>
        </div>
        <div class="continue-scroll">
          {#each continueWatching as item (item.id + "-" + item.episode)}
            <ContinueCard {item} />
          {/each}
        </div>
      </section>
    {/if}

    <!-- My Favorites -->
    {#if favorites.length > 0}
      <Row title="❤️ My Favorites" items={favorites} />
    {/if}

    <Row
      title="🔥 Trending Now"
      items={homeData.trending || []}
      href="/explore/trending"
    />
    <Row
      title="⭐ Most Popular"
      items={homeData.popular || []}
      href="/explore/popular"
    />
    <Row
      title="🏆 Top Rated"
      items={homeData.topRated || []}
      href="/explore/highest-rated"
    />
    <Row
      title="⚔️ Action Masters"
      items={homeData.action || []}
      href="/explore/action"
    />
    <Row
      title="💕 Romance & Slice of Life"
      items={homeData.romance || []}
      href="/explore/romance"
    />
    <Row
      title="🎬 Top Movies"
      items={homeData.movies || []}
      href="/explore/movies"
    />

    <!-- --- PROFESSIONAL CONTENT BLOCKS --- -->

    <!-- Phase 3: Tactical Analytics -->
    <section class="tactical-analytics container">
      <div class="analytics-grid">
        <div class="stat-card">
          <div class="stat-icon"><Cpu size={24} /></div>
          <div class="stat-info">
            <span class="stat-val">1.2ms</span>
            <span class="stat-label">LATENCY_CORE</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><ShieldCheck size={24} /></div>
          <div class="stat-info">
            <span class="stat-val">ENCRYPTED</span>
            <span class="stat-label">SESSION_PROTOCOL</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><Users size={24} /></div>
          <div class="stat-info">
            <span class="stat-val">12.5k+</span>
            <span class="stat-label">ACTIVE_OPERATIVES</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><Zap size={24} /></div>
          <div class="stat-info">
            <span class="stat-val">99.9%</span>
            <span class="stat-label">NETWORK_UPTIME</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Phase 3: Cross-Platform Deployment -->
    <section class="deployment-hub container">
      <div class="section-header">
        <h2 class="section-title">DEPLOYMENT_CHANNELS</h2>
        <p class="section-subtitle">Access intelligence across all tactical hardware</p>
      </div>
      <div class="deployment-grid">
        <a href="/download" class="deploy-card glass">
          <Smartphone size={32} class="text-primary" />
          <h3>ANDROID_MOBILE</h3>
          <p>Native APK for mobile reconnaissance.</p>
          <span class="ver-badge">V1.2.4</span>
        </a>
        <a href="/download" class="deploy-card glass">
          <Monitor size={32} class="text-primary" />
          <h3>WINDOWS_DESKTOP</h3>
          <p>Operative-grade desktop interface.</p>
          <span class="ver-badge">V1.0.8</span>
        </a>
        <a href="/" class="deploy-card glass active">
          <Globe size={32} class="text-primary" />
          <h3>WEB_STATION</h3>
          <p>Browser-based command center.</p>
          <span class="ver-badge">STABLE</span>
        </a>
      </div>
    </section>

    <!-- Phase 3: Community CTA -->
    <section class="community-signal container">
      <div class="signal-box glass">
        <div class="signal-content">
          <h2 class="signal-title">ESTABLISH_COMMS</h2>
          <p>Join the secure Discord channel to relay intelligence, report bugs, and coordinate with other operatives.</p>
          <div class="signal-actions">
            <a href="https://discord.com" target="_blank" class="btn-primary">
              <MessageSquare size={18} /> JOIN_DISCORD
            </a>
            <button class="btn-secondary" onclick={() => goto('/explore')}>
              START_MISSION
            </button>
          </div>
        </div>
        <div class="signal-visual">
          <div class="pulse-ring"></div>
          <div class="pulse-ring delay-1"></div>
          <MessageSquare size={120} class="signal-icon" />
        </div>
      </div>
    </section>
  </div>
{:else}
  <div class="loading-screen">
    <p>Failed to load. Please try refreshing.</p>
  </div>
{/if}

<style>
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    gap: 1rem;
    color: var(--net-text-muted);
  }
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  /* Animated spinner */
  .spinner-ring {
    position: relative;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ring {
    position: absolute;
    inset: 0;
    border: 3px solid rgba(255, 255, 255, 0.05);
    border-top: 3px solid var(--net-red);
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .logo-mini {
    font-weight: 800;
    font-size: 1.1rem;
    color: var(--net-red);
    letter-spacing: -0.05em;
  }

  .home-rows {
    margin-top: -1rem;
    position: relative;
    z-index: 3;
  }

  /* Continue Watching section */
  .continue-section {
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
  .view-all {
    font-size: 0.85rem;
    color: var(--net-red);
    font-weight: 600;
    text-decoration: none;
    opacity: 0.8;
    transition: 0.2s;
  }
  .view-all:hover {
    opacity: 1;
    transform: translateX(3px);
  }

  .continue-scroll {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    padding: 0.5rem 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
  }
  .continue-scroll::-webkit-scrollbar {
    display: none;
  }

  /* Tablet responsive */
  @media (max-width: 768px) {
    .loading-screen {
      min-height: 70vh;
    }
    .spinner-ring {
      width: 56px;
      height: 56px;
    }
    .logo-mini {
      font-size: 1rem;
    }
    .home-rows {
      margin-top: 0;
    }
    .continue-section {
      margin-bottom: 1.5rem;
    }
    .row-header {
      padding: 0 0.75rem;
      margin-bottom: 0.6rem;
    }
    .row-title {
      font-size: 1.15rem;
    }
    .view-all {
      font-size: 0.8rem;
    }
    .continue-scroll {
      gap: 0.85rem;
      padding: 0.4rem 0.75rem;
    }
  }

  /* Mobile responsive */
  @media (max-width: 480px) {
    .loading-screen {
      min-height: 60vh;
    }
    .spinner-ring {
      width: 48px;
      height: 48px;
    }
    .logo-mini {
      font-size: 0.9rem;
    }
    .home-rows {
      margin-top: 0.5rem;
    }
    .continue-section {
      margin-bottom: 1.25rem;
    }
    .row-header {
      padding: 0 0.5rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1rem;
    }
    .view-all {
      font-size: 0.75rem;
    }
    .continue-scroll {
      gap: 0.75rem;
      padding: 0.3rem 0.5rem;
    }
  }

  /* Small mobile responsive */
  @media (max-width: 360px) {
    .loading-screen {
      min-height: 50vh;
    }
    .spinner-ring {
      width: 40px;
      height: 40px;
    }
    .logo-mini {
      font-size: 0.85rem;
    }
    .home-rows {
      margin-top: 1rem;
    }
    .row-title {
      font-size: 0.95rem;
    }
    .continue-scroll {
      gap: 0.6rem;
      padding: 0.25rem 0.4rem;
    }
  }
  /* Professional Content Blocks Styling */
  .tactical-analytics {
    margin: 4rem auto;
    padding: 0 1rem;
  }
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  .stat-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    transition: var(--transition);
  }
  .stat-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--net-red);
    transform: translateY(-5px);
  }
  .stat-icon {
    color: var(--net-red);
    opacity: 0.8;
  }
  .stat-info {
    display: flex;
    flex-direction: column;
  }
  .stat-val {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .stat-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--net-text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .deployment-hub {
    margin: 6rem auto;
    padding: 0 1rem;
  }
  .section-header {
    margin-bottom: 3rem;
  }
  .section-title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }
  .section-subtitle {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }
  .deployment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }
  .deploy-card {
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }
  .deploy-card h3 {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-top: 0.5rem;
  }
  .deploy-card p {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    line-height: 1.5;
  }
  .deploy-card.active {
    border-color: var(--net-red);
    background: rgba(229, 9, 20, 0.05);
  }
  .ver-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--net-text-muted);
  }

  .community-signal {
    margin: 6rem auto 8rem;
    padding: 0 1rem;
  }
  .signal-box {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 3rem;
    padding: 4rem;
    border-radius: 32px;
    align-items: center;
    background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    overflow: hidden;
    position: relative;
  }
  .signal-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -2px;
    margin-bottom: 1rem;
  }
  .signal-content p {
    font-size: 1.1rem;
    color: var(--net-text-muted);
    margin-bottom: 2.5rem;
    max-width: 500px;
    line-height: 1.6;
  }
  .signal-actions {
    display: flex;
    gap: 1.5rem;
  }
  .signal-visual {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .signal-icon {
    color: var(--net-red);
    opacity: 0.15;
    z-index: 1;
  }
  .pulse-ring {
    position: absolute;
    width: 200px;
    height: 200px;
    border: 1px solid var(--net-red);
    border-radius: 50%;
    opacity: 0;
    animation: signal-pulse 4s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  .pulse-ring.delay-1 {
    animation-delay: 2s;
  }
  @keyframes signal-pulse {
    0% { transform: scale(0.5); opacity: 0.5; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @media (max-width: 1024px) {
    .signal-box {
      grid-template-columns: 1fr;
      padding: 3rem;
      text-align: center;
    }
    .signal-content p {
      margin-inline: auto;
    }
    .signal-actions {
      justify-content: center;
    }
    .signal-visual {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .tactical-analytics {
      margin: 3rem auto;
    }
    .deployment-hub {
      margin: 4rem auto;
    }
    .community-signal {
      margin-bottom: 4rem;
    }
    .signal-title {
      font-size: 1.8rem;
    }
    .signal-content p {
      font-size: 0.95rem;
    }
  }
</style>
