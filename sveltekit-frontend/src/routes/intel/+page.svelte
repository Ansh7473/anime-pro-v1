<script lang="ts">
  import { onMount } from 'svelte';
  import { api, getProxiedImage } from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { 
    Activity, 
    Clock, 
    Shield, 
    Target, 
    Zap, 
    Database, 
    History, 
    Bookmark,
    Cpu,
    Radio
  } from 'lucide-svelte';

  let stats = $state<any>(null);
  let history = $state<any[]>([]);
  let watchlist = $state<any[]>([]);
  let recommendations = $state<any>(null);
  let loading = $state(true);

  async function loadIntel() {
    if (!$auth.token) {
      goto('/auth/login?redirect=/intel');
      return;
    }

    try {
      loading = true;
      const [statsRes, historyRes, watchlistRes, recsRes] = await Promise.all([
        api.getUserStats($auth.token),
        api.getHistory($auth.token),
        api.getWatchlist($auth.token),
        api.getAIRecommendations($auth.token)
      ]);

      stats = statsRes;
      history = (historyRes || []).slice(0, 10); // Last 10 entries
      watchlist = watchlistRes || [];
      recommendations = recsRes;
    } catch (err) {
      console.error('Failed to load intel:', err);
    } finally {
      loading = false;
    }
  }

  onMount(loadIntel);
</script>

<svelte:head>
  <title>INTEL CENTER | ANIMEPRO</title>
</svelte:head>

<div class="intel-page">
  {#if loading}
    <div class="loader-container">
      <div class="tactical-loader">
        <div class="scan-line"></div>
        <div class="loading-text">INITIALIZING TACTICAL_HUD...</div>
      </div>
    </div>
  {:else if stats}
    <div class="hud-container">
      <!-- HEADER STATUS BAR -->
      <header class="hud-header">
        <div class="status-group">
          <div class="status-item">
            <span class="label">OPERATOR:</span>
            <span class="value">{$auth.currentProfile?.name || 'GUEST_01'}</span>
          </div>
          <div class="status-item">
            <span class="label">COMMS:</span>
            <span class="value online">ENCRYPTED</span>
          </div>
          <div class="status-item">
            <span class="label">INTEL_LEVEL:</span>
            <span class="value">{recommendations?.intelligence_level || 'ALPHA'}</span>
          </div>
        </div>
        <div class="header-clock">
          {new Date().toLocaleTimeString()} [UTC+5:30]
        </div>
      </header>

      <!-- MAIN HUD GRID -->
      <main class="hud-main">
        <!-- TOP STATS ROW -->
        <section class="stats-grid">
          <div class="stat-card glass">
            <div class="stat-icon"><Clock size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">COMBAT_HOURS</span>
              <span class="stat-value">{stats.total_hours?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
          <div class="stat-card glass highlight">
            <div class="stat-icon"><Shield size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">FAVORITE_GENRE</span>
              <span class="stat-value">{stats.favorite_genre || 'UNKNOWN'}</span>
            </div>
          </div>
          <div class="stat-card glass">
            <div class="stat-icon"><Bookmark size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">RESERVES_COUNT</span>
              <span class="stat-value">{stats.reserves_count || '0'}</span>
            </div>
          </div>
          <div class="stat-card glass">
            <div class="stat-icon"><Zap size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">RECENT_ACTIVITY</span>
              <span class="stat-value">{stats.recent_active || '0'}</span>
            </div>
          </div>
        </section>

        <!-- CONTENT COLUMNS -->
        <div class="columns">
          <!-- LEFT: COMBAT LOG (History) -->
          <section class="column combat-log glass">
            <div class="column-header">
              <History size={18} />
              <span class="title">COMBAT_LOG</span>
              <div class="line"></div>
            </div>
            
            <div class="scroll-area">
              {#if history.length === 0}
                <div class="empty-state">NO_RECENT_ENGAGEMENTS_DETECTED</div>
              {:else}
                {#each history as entry}
                  <a href="/anime/{entry.animeId}" class="history-item">
                    <img src={getProxiedImage(entry.animePoster)} alt="" />
                    <div class="item-info">
                      <span class="name">{entry.animeTitle}</span>
                      <span class="meta">EP {entry.episodeNumber} • {new Date(entry.lastWatchedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="progress-bar">
                      <div class="fill" style="width: {entry.duration > 0 ? (entry.progress / entry.duration) * 100 : 0}%"></div>
                    </div>
                  </a>
                {/each}
              {/if}
            </div>
          </section>

          <!-- RIGHT: TACTICAL BRIEFING (Recs) -->
          <section class="column tactical-briefing">
            <div class="column-header">
              <Cpu size={18} />
              <span class="title">TACTICAL_BRIEFING</span>
              <div class="line"></div>
            </div>

            <div class="briefing-card glass">
              <div class="ai-header">
                <Radio size={16} class="pulse" />
                <span>AI_INTEL_OFFICER: ACTIVE</span>
              </div>
              <p class="briefing-text">{recommendations?.briefing}</p>
              
              <div class="recs-list">
                {#each (recommendations?.recommendations || []) as rec}
                  <a href="/anime/{rec.id}" class="rec-item glass">
                    <img src={getProxiedImage(rec.poster)} alt="" />
                    <div class="rec-info">
                      <span class="rec-title">{rec.title}</span>
                      <span class="rec-reason">{rec.reason}</span>
                    </div>
                    <Target size={18} class="target-icon" />
                  </a>
                {/each}
              </div>
            </div>

            <!-- RESERVES (Watchlist Shortlist) -->
            <div class="reserves-preview column-header" style="margin-top: 1.5rem">
              <Database size={18} />
              <span class="title">STRATEGIC_RESERVES</span>
              <div class="line"></div>
            </div>
            <div class="reserves-grid">
              {#each (watchlist || []).slice(0, 4) as item}
                <a href="/anime/{item.animeId}" class="reserve-mini glass">
                  <img src={getProxiedImage(item.animePoster)} alt="" />
                </a>
              {/each}
              {#if (watchlist || []).length > 4}
                <a href="/watchlist" class="reserve-more glass">+{(watchlist || []).length - 4}</a>
              {/if}
            </div>
          </section>
        </div>
      </main>
    </div>
  {/if}
</div>

<style>
  .intel-page {
    min-height: 100vh;
    background: #050505;
    color: #00ffcc; /* Cyberpunk Green/Cyan */
    font-family: inherit;
    padding: 80px 20px 20px;
    background-image: 
      radial-gradient(circle at 2px 2px, rgba(0, 255, 204, 0.05) 1px, transparent 0);
    background-size: 40px 40px;
  }

  .loader-container {
    height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tactical-loader {
    width: 300px;
    height: 2px;
    background: rgba(0, 255, 204, 0.1);
    position: relative;
    overflow: hidden;
  }
  .scan-line {
    width: 100px;
    height: 100%;
    background: #00ffcc;
    position: absolute;
    animation: scan 1.5s infinite linear;
    box-shadow: 0 0 15px #00ffcc;
  }
  @keyframes scan {
    from { left: -100px; }
    to { left: 400px; }
  }
  .loading-text {
    position: absolute;
    top: 10px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.7rem;
    letter-spacing: 2px;
  }

  .hud-container {
    max-width: 1400px;
    margin: 0 auto;
  }

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 255, 204, 0.2);
    padding-bottom: 10px;
    margin-bottom: 20px;
    font-size: 0.8rem;
  }
  .status-group {
    display: flex;
    gap: 20px;
  }
  .label { color: rgba(0, 255, 204, 0.5); margin-right: 5px; }
  .value.online { color: #fff; text-shadow: 0 0 5px #00ffcc; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 2rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    border: 1px solid rgba(0, 255, 204, 0.1);
    background: rgba(0, 255, 204, 0.02);
    transition: all 0.3s;
  }
  .stat-card:hover {
    border-color: rgba(0, 255, 204, 0.4);
    background: rgba(0, 255, 204, 0.05);
    transform: translateY(-2px);
  }
  .stat-card.highlight {
    border-color: rgba(0, 255, 204, 0.3);
    box-shadow: inset 0 0 10px rgba(0, 255, 204, 0.05);
  }
  .stat-label { font-size: 0.65rem; display: block; color: rgba(0, 255, 204, 0.6); margin-bottom: 4px; }
  .stat-value { font-size: 1.5rem; font-weight: 800; color: #fff; }

  .columns {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 20px;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
    color: #fff;
  }
  .column-header .title { font-weight: 700; letter-spacing: 1px; font-size: 0.9rem; }
  .column-header .line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0, 255, 204, 0.3), transparent); }

  .scroll-area {
    max-height: 600px;
    overflow-y: auto;
    padding-right: 10px;
  }
  .scroll-area::-webkit-scrollbar { width: 4px; }
  .scroll-area::-webkit-scrollbar-thumb { background: rgba(0, 255, 204, 0.2); border-radius: 10px; }

  .history-item {
    display: flex;
    gap: 15px;
    background: rgba(255, 255, 255, 0.03);
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: background 0.2s;
  }
  .history-item:hover { background: rgba(255, 255, 255, 0.07); }
  .history-item img { width: 50px; height: 70px; object-fit: cover; border-radius: 2px; }
  .item-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .item-info .name { font-weight: 600; color: #fff; margin-bottom: 4px; }
  .item-info .meta { font-size: 0.7rem; color: rgba(0, 255, 204, 0.6); }

  .progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: rgba(255, 255, 255, 0.1); }
  .progress-bar .fill { height: 100%; background: #00ffcc; box-shadow: 0 0 5px #00ffcc; }

  .briefing-card {
    padding: 20px;
    background: rgba(0, 255, 204, 0.03);
    border: 1px dashed rgba(0, 255, 204, 0.2);
  }
  .ai-header { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; margin-bottom: 10px; color: #fff; }
  .pulse { animation: pulse 2s infinite; color: #ff3e3e; }
  @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
  .briefing-text { font-size: 0.85rem; color: rgba(0, 255, 204, 0.8); line-height: 1.6; margin-bottom: 1.5rem; }

  .rec-item {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 12px;
    margin-bottom: 10px;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .rec-item:hover { border-color: rgba(0, 255, 204, 0.3); background: rgba(0, 255, 204, 0.05); }
  .rec-item img { width: 44px; height: 60px; object-fit: cover; border-radius: 2px; }
  .rec-info { flex: 1; }
  .rec-title { display: block; font-weight: 700; color: #fff; font-size: 0.9rem; }
  .rec-reason { font-size: 0.7rem; color: #00ffcc; text-transform: uppercase; font-weight: 600; }
  .target-icon { color: rgba(0, 255, 204, 0.3); transition: color 0.3s; }
  .rec-item:hover .target-icon { color: #ff3e3e; transform: scale(1.2); }

  .reserves-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
  }
  .reserve-mini { height: 100px; border-radius: 4px; overflow: hidden; }
  .reserve-mini img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  .reserve-mini:hover img { transform: scale(1.1); }
  .reserve-more { 
    display: flex; align-items: center; justify-content: center; 
    background: rgba(0, 255, 204, 0.1); color: #fff; font-weight: 700; 
    text-decoration: none; border-radius: 4px; font-size: 0.8rem;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    border: 1px dashed rgba(0, 255, 204, 0.1);
    color: rgba(0, 255, 204, 0.4);
    font-size: 0.8rem;
  }

  .glass {
    background: rgba(10, 10, 10, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .columns { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 600px) {
    .stats-grid { grid-template-columns: 1fr; }
    .hud-header { flex-direction: column; gap: 10px; text-align: center; }
  }
</style>
