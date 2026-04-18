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

  async function togglePref(key: string, value: any) {
    if (!$auth.currentProfile?.id) return;
    try {
      const updated = await api.updateProfile($auth.currentProfile.id, { [key]: value }, $auth.token);
      auth.updateProfile(updated); // Update local store
    } catch (err) {
      console.error('Failed to sync settings:', err);
    }
  }
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

        <!-- TACTICAL PROGRESSION (RANK & XP) -->
        <section class="progression-block stats-grid">
          <div class="rank-card glass highlight">
            <div class="rank-header">
              <span class="rank-title">{recommendations?.intelligence_level || 'GAMMA'} // {stats?.progression?.rank || 'RECRUIT'}</span>
              <span class="rank-level">LVL_{stats?.progression?.level || '01'}</span>
            </div>
            <div class="xp-container">
              <div class="xp-bar">
                <div class="xp-fill" style="width: {(stats?.progression?.xp / stats?.progression?.next_rank) * 100}%"></div>
              </div>
              <div class="xp-meta">
                <span>XP: {stats?.progression?.xp}</span>
                <span>NEXT: {stats?.progression?.next_rank}</span>
              </div>
            </div>
          </div>

          <!-- ACTIVITY RADAR (Last 7 Days) -->
          <div class="activity-card glass">
            <div class="activity-header">
              <Activity size={16} />
              <span>COMBAT_SYNC_ACTIVITY</span>
            </div>
            <div class="activity-bars">
              {#each (stats?.activity || []) as day}
                <div class="activity-col">
                  <div class="bar-limit">
                    <div class="bar-fill level-{day.level}" style="height: {Math.min(day.minutes, 100)}%"></div>
                  </div>
                  <span class="day-label">{day.day}</span>
                </div>
              {/each}
            </div>
          </div>
        </section>

        <!-- QUICK RESUME / CURRENT OBJECTIVE -->
...
        {#if stats?.quick_resume}
          <section class="quick-resume glass">
            <div class="objective-header">
              <div class="indicator pulse-green"></div>
              <span>CURRENT_OBJECTIVE: ACTIVE</span>
            </div>
            <div class="resume-content">
              <img src={getProxiedImage(stats.quick_resume.animePoster)} alt="" class="resume-poster" />
              <div class="resume-info">
                <h2 class="anime-title">{stats.quick_resume.animeTitle}</h2>
                <div class="meta-row">
                  <span class="ep-tag">EPISODE {stats.quick_resume.episodeNumber}</span>
                  <span class="divider">//</span>
                  <span class="status">IN_PROGRESS</span>
                </div>
                <div class="progress-container">
                  <div class="progress-label">SYNCHRONIZATION</div>
                  <div class="progress-bar-large">
                    <div class="fill" style="width: {stats.quick_resume.duration > 0 ? (stats.quick_resume.progress / stats.quick_resume.duration) * 100 : 0}%"></div>
                  </div>
                </div>
                <a href="/watch/{stats.quick_resume.animeId}/{stats.quick_resume.episodeNumber}" class="resume-btn">
                  <Zap size={18} />
                  <span>RESUME_MISSION</span>
                </a>
              </div>
              <div class="decoration-lines">
                <div class="line"></div>
                <div class="line"></div>
                <div class="line"></div>
              </div>
            </div>
          </section>
        {/if}

        <!-- TOP STATS ROW -->
        <section class="stats-grid">
...
          <div class="stat-card glass">
            <div class="stat-icon"><Clock size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">COMBAT_HOURS</span>
              <span class="stat-value">{(stats?.total_hours || 0).toFixed(1)}</span>
            </div>
          </div>
          <div class="stat-card glass highlight">
            <div class="stat-icon"><Shield size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">FAVORITE_GENRE</span>
              <span class="stat-value">{stats?.favorite_genre || 'Tactical Scifi'}</span>
            </div>
          </div>
          <div class="stat-card glass">
            <div class="stat-icon"><Bookmark size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">RESERVES_COUNT</span>
              <span class="stat-value">{stats?.reserves_count || '0'}</span>
            </div>
          </div>
          <div class="stat-card glass">
            <div class="stat-icon"><Zap size={24} /></div>
            <div class="stat-content">
              <span class="stat-label">RECENT_ACTIVITY</span>
              <span class="stat-value">{stats?.recent_active || '0'}</span>
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
                {#each history as entry (entry.id)}
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
              <p class="briefing-text">{recommendations?.briefing || 'Intelligence gathering in progress...'}</p>
              
              <div class="recs-list">
                {#each (recommendations?.recommendations || []) as rec (rec.id)}
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
              {#each (watchlist || []).slice(0, 4) as item (item.id)}
                <a href="/anime/{item.animeId}" class="reserve-mini glass">
                  <img src={getProxiedImage(item.animePoster)} alt="" />
                </a>
              {/each}
              {#if (watchlist || []).length > 4}
                <a href="/watchlist" class="reserve-more glass">+{(watchlist || []).length - 4}</a>
              {/if}
            </div>

            <!-- TACTICAL SETTINGS (Preferences Sync) -->
            <div class="settings-preview column-header" style="margin-top: 2rem">
              <Shield size={18} />
              <span class="title">TACTICAL_LOADOUT_SYNC</span>
              <div class="line"></div>
            </div>
            <div class="settings-grid glass">
              <button 
                class="settings-btn {($auth.currentProfile?.autoNext) ? 'active' : ''}"
                onclick={() => togglePref('autoNext', !$auth.currentProfile?.autoNext)}
              >
                <span>AUTO_NEXT_ENGAGEMENT</span>
                <div class="led"></div>
              </button>
              <button 
                class="settings-btn {($auth.currentProfile?.autoSkip) ? 'active' : ''}"
                onclick={() => togglePref('autoSkip', !$auth.currentProfile?.autoSkip)}
              >
                <span>AUTO_SKIP_INTRO</span>
                <div class="led"></div>
              </button>
              <div class="language-selector">
                <span class="label">COMMS_LANGUAGE:</span>
                <select 
                  value={$auth.currentProfile?.language || 'sub'} 
                  onchange={(e) => togglePref('language', e.target.value)}
                  class="glass-select"
                >
                  <option value="sub">SUBTITLED</option>
                  <option value="dub">DUBBED</option>
                  <option value="multi">MULTI_AUDIO</option>
                </select>
              </div>
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

  /* PROGRESSION & ACTIVITY */
  .progression-block {
    margin-bottom: 1.5rem;
    grid-template-columns: 1fr 1fr;
  }
  .rank-card {
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .rank-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 15px;
  }
  .rank-title { font-size: 1.1rem; font-weight: 800; color: #fff; letter-spacing: 1px; }
  .rank-level { font-size: 0.7rem; color: #00ffcc; font-weight: 700; background: rgba(0, 255, 204, 0.1); padding: 2px 8px; border-radius: 4px; }
  
  .xp-container { width: 100%; }
  .xp-bar { height: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px; overflow: hidden; margin-bottom: 8px; border: 1px solid rgba(0, 255, 204, 0.1); }
  .xp-fill { height: 100%; background: linear-gradient(90deg, #00ffcc, #0099ff); box-shadow: 0 0 10px rgba(0, 255, 204, 0.5); border-radius: 5px; transition: width 1s ease-out; }
  .xp-meta { display: flex; justify-content: space-between; font-size: 0.6rem; color: rgba(0, 255, 204, 0.6); font-weight: 700; }

  .activity-card { padding: 24px; }
  .activity-header { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #fff; margin-bottom: 20px; font-weight: 700; letter-spacing: 1px; }
  .activity-bars { display: flex; align-items: flex-end; justify-content: space-between; height: 100px; gap: 8px; }
  .activity-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .bar-limit { width: 100%; height: 70px; background: rgba(255, 255, 255, 0.02); border-radius: 2px; display: flex; align-items: flex-end; position: relative; }
  .bar-fill { width: 100%; border-radius: 1px; transition: height 0.5s ease; }
  .day-label { font-size: 0.6rem; color: rgba(0, 255, 204, 0.4); font-weight: 600; }

  /* Intensity Levels */
  .level-0 { background: transparent; }
  .level-1 { background: rgba(0, 255, 204, 0.2); }
  .level-2 { background: rgba(0, 255, 204, 0.4); }
  .level-3 { background: rgba(0, 255, 204, 0.7); box-shadow: 0 0 10px rgba(0, 255, 204, 0.3); }
  .level-4 { background: #00ffcc; box-shadow: 0 0 15px #00ffcc; }

  .quick-resume {
    margin-bottom: 2rem;
    padding: 30px;
    border: 1px solid rgba(0, 255, 204, 0.2);
    position: relative;
    overflow: hidden;
  }
  .objective-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.7rem;
    font-weight: 700;
    margin-bottom: 20px;
    letter-spacing: 2px;
  }
  .indicator { width: 8px; height: 8px; border-radius: 50%; }
  .pulse-green { background: #00ffcc; box-shadow: 0 0 10px #00ffcc; animation: pulse-g 1.5s infinite; }
  @keyframes pulse-g { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

  .resume-content { display: flex; gap: 30px; position: relative; z-index: 2; }
  .resume-poster { width: 140px; height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(0, 255, 204, 0.3); }
  .resume-info { flex: 1; }
  .anime-title { font-size: 2rem; font-weight: 900; color: #fff; margin: 0 0 10px; line-height: 1.1; }
  .meta-row { display: flex; align-items: center; gap: 15px; font-size: 0.8rem; margin-bottom: 20px; }
  .ep-tag { background: rgba(0, 255, 204, 0.1); padding: 4px 12px; border-radius: 20px; font-weight: 700; }
  .status { color: #00ffcc; font-weight: 700; letter-spacing: 1px; }

  .progress-container { margin-bottom: 30px; max-width: 400px; }
  .progress-label { font-size: 0.6rem; color: rgba(0, 255, 204, 0.5); margin-bottom: 8px; letter-spacing: 1px; }
  .progress-bar-large { height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; }
  .progress-bar-large .fill { height: 100%; background: linear-gradient(90deg, #00ffcc, #0099ff); box-shadow: 0 0 10px #00ffcc; }

  .resume-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #00ffcc;
    color: #000;
    padding: 12px 30px;
    border-radius: 2px;
    text-decoration: none;
    font-weight: 800;
    font-size: 0.9rem;
    transition: all 0.3s;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .resume-btn:hover { background: #fff; transform: scale(1.05); }

  .decoration-lines { position: absolute; right: -20px; bottom: 20px; display: flex; flex-direction: column; gap: 5px; opacity: 0.3; transform: rotate(-45deg); }
  .decoration-lines .line { width: 150px; height: 1px; background: #00ffcc; }

  /* TACTICAL SETTINGS */
  .settings-grid {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .settings-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 15px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  .settings-btn:hover { background: rgba(0, 255, 204, 0.05); border-color: rgba(0, 255, 204, 0.3); }
  .settings-btn.active { color: #fff; border-color: #00ffcc; background: rgba(0, 255, 204, 0.1); }
  .settings-btn .led { width: 6px; height: 6px; border-radius: 50%; background: #444; }
  .settings-btn.active .led { background: #00ffcc; box-shadow: 0 0 8px #00ffcc; }

  .language-selector {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
  }
  .glass-select {
    background: #111;
    color: #fff;
    border: 1px solid rgba(0, 255, 204, 0.2);
    padding: 4px 12px;
    font-size: 0.7rem;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .glass-select:focus { border-color: #00ffcc; }

  /* Responsive */
  @media (max-width: 900px) {
    .columns { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 600px) {
    .stats-grid { grid-template-columns: 1fr; }
    .hud-header { flex-direction: column; gap: 10px; text-align: center; }
    .resume-content { flex-direction: column; align-items: center; text-align: center; }
    .progress-container { margin: 0 auto 30px; }
  }
</style>
