<script lang="ts">
  import { onMount } from 'svelte';
  import { api, getProxiedImage } from '$lib/api';
  import { auth, updateProfile } from '$lib/stores/auth';
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

  async function togglePref(key: string, value: string | number | boolean) {
    if (!$auth.currentProfile?.id || !$auth.token) return;
    try {
      // Corrected argument order: (token, id, data)
      const updated = await api.updateProfile($auth.token, $auth.currentProfile.id, { [key]: value });
      updateProfile(updated); // Sync with local auth store
    } catch (err) {
      console.error('Failed to sync settings:', err);
    }
  }
</script>

<s<svelte:head>
  <title>PROFILE | ANIMEPRO</title>
</svelte:head>

<div class="profile-page">
  {#if loading}
    <div class="loader-container">
      <div class="premium-loader">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
      <div class="loading-text">LOADING PROFILE...</div>
    </div>
  {:else if stats}
    <div class="profile-container">
      <!-- MINIMALIST HEADER -->
      <header class="profile-header">
        <div class="user-info">
          <div class="avatar-placeholder">
            {($auth.currentProfile?.name || 'A')[0].toUpperCase()}
          </div>
          <div class="user-meta">
            <h1>{$auth.currentProfile?.name || 'User'}</h1>
            <div class="status-row">
              <span class="status-badge">ONLINE</span>
              <span class="level-badge">LEVEL {stats?.progression?.level || '01'}</span>
            </div>
          </div>
        </div>
        <div class="account-actions">
          <div class="time-stamp">{new Date().toLocaleDateString()}</div>
        </div>
      </header>

      <div class="dashboard-grid">
        <!-- LEFT COLUMN: STATS & SETTINGS -->
        <div class="sidebar">
          <section class="premium-card stats-overview">
            <h2>STATISTICS</h2>
            <div class="stat-items">
              <div class="item">
                <span class="label">WATCH TIME</span>
                <span class="val">{(stats?.total_hours || 0).toFixed(1)}h</span>
              </div>
              <div class="item highlight">
                <span class="label">RANK</span>
                <span class="val">{stats?.progression?.rank || 'RECRUIT'}</span>
              </div>
              <div class="item">
                <span class="label">RESERVES</span>
                <span class="val">{stats?.reserves_count || '0'}</span>
              </div>
            </div>
          </section>

          <section class="premium-card config-sync">
            <h2>TACTICAL SYNC</h2>
            <div class="sync-items">
              <button 
                class="sync-btn"
                class:active={$auth.currentProfile?.autoNext}
                onclick={() => togglePref('autoNext', !$auth.currentProfile?.autoNext)}
              >
                <span>AUTO_NEXT</span>
                <div class="indicator"></div>
              </button>
              <button 
                class="sync-btn"
                class:active={$auth.currentProfile?.autoSkip}
                onclick={() => togglePref('autoSkip', !$auth.currentProfile?.autoSkip)}
              >
                <span>AUTO_SKIP</span>
                <div class="indicator"></div>
              </button>
              
              <div class="select-group">
                <span class="label">AUDIO_PROTOCOL</span>
                <select 
                  value={$auth.currentProfile?.language || 'sub'} 
                  onchange={(e) => togglePref('language', (e.target as HTMLSelectElement).value)}
                >
                  <option value="sub">SUBTITLED</option>
                  <option value="dub">DUBBED</option>
                  <option value="multi">MULTI_AUDIO</option>
                </select>
              </div>

              <div class="select-group">
                <span class="label">VISUAL_PROTOCOL</span>
                <select 
                  value={$auth.currentProfile?.theme || 'intelligence'} 
                  onchange={(e) => togglePref('theme', (e.target as HTMLSelectElement).value)}
                >
                  <option value="intelligence">INTELLIGENCE (BLUE)</option>
                  <option value="stealth">STEALTH (RED)</option>
                  <option value="cyberpunk">CYBERPUNK (NEON)</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <!-- MAIN COLUMN: ACTIVITY & RECS -->
        <div class="main-content">
          <!-- QUICK RESUME -->
          {#if stats?.quick_resume}
            <section class="resume-card premium-card">
              <div class="card-bg" style="background-image: url({getProxiedImage(stats.quick_resume.animePoster)})"></div>
              <div class="overlay"></div>
              <div class="resume-info">
                <span class="tag">ACTIVE OBJECTIVE</span>
                <h3>{stats.quick_resume.animeTitle}</h3>
                <div class="meta">
                  EPISODE {stats.quick_resume.episodeNumber} // {stats.quick_resume.duration > 0 ? Math.round((stats.quick_resume.progress / stats.quick_resume.duration) * 100) : 0}% COMPLETE
                </div>
                <a href="/watch/{stats.quick_resume.animeId}/{stats.quick_resume.episodeNumber}" class="btn-resume">
                  <Zap size={16} /> RESUME_MISSION
                </a>
              </div>
            </section>
          {/if}

          <!-- RECENT ACTIVITY -->
          <section class="premium-card">
            <h2>RECENT_ACTIVITY</h2>
            <div class="activity-list">
              {#if history.length === 0}
                <div class="empty">NO RECENT ACTIVITY RECORDED</div>
              {:else}
                {#each history as entry (entry.id)}
                  <a href="/anime/{entry.animeId}" class="activity-item">
                    <img src={getProxiedImage(entry.animePoster)} alt="" />
                    <div class="item-content">
                      <span class="name">{entry.animeTitle}</span>
                      <span class="meta">EP {entry.episodeNumber} • {new Date(entry.lastWatchedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="mini-progress">
                      <div class="fill" style="width: {entry.duration > 0 ? (entry.progress / entry.duration) * 100 : 0}%"></div>
                    </div>
                  </a>
                {/each}
              {/if}
            </div>
          </section>

          <!-- TACTICAL BRIEFING (AI Recommendations) -->
          <section class="premium-card">
            <div class="section-header">
              <h2>TACTICAL_BRIEFING</h2>
              <span class="ai-badge"><Radio size={12} /> AI_CONNECTED</span>
            </div>
            <p class="briefing-text">{recommendations?.briefing || 'Gathering intelligence for your next deployment...'}</p>
            <div class="recs-grid">
              {#each (recommendations?.recommendations || []) as rec (rec.id)}
                <a href="/anime/{rec.id}" class="rec-card">
                  <img src={getProxiedImage(rec.poster)} alt="" />
                  <div class="rec-blur"></div>
                  <div class="rec-info">
                    <span class="title">{rec.title}</span>
                    <span class="reason">{rec.reason}</span>
                  </div>
                </a>
              {/each}
            </div>
          </section>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .profile-page {
    min-height: 100vh;
    background: #0a0a0b;
    color: #f2f2f2;
    padding: 100px 20px 40px;
    font-family: inherit;
  }

  .profile-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* LOADING STATE */
  .loader-container {
    height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }
  .premium-loader {
    display: flex;
    gap: 8px;
  }
  .premium-loader .dot {
    width: 6px;
    height: 6px;
    background: var(--net-primary, #0099ff);
    border-radius: 50%;
    animation: bounce 0.6s infinite alternate;
  }
  .premium-loader .dot:nth-child(2) { animation-delay: 0.2s; }
  .premium-loader .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { to { opacity: 0.3; transform: scale(0.8); } }
  .loading-text { font-size: 0.7rem; letter-spacing: 2px; opacity: 0.5; }

  /* HEADER */
  .profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    padding-bottom: 30px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .user-info { display: flex; align-items: center; gap: 20px; }
  .avatar-placeholder {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #0099ff 0%, #0066cc 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: #fff;
    box-shadow: 0 10px 20px rgba(0, 153, 255, 0.2);
  }
  .user-meta h1 { font-size: 1.8rem; font-weight: 900; margin: 0 0 5px; letter-spacing: -0.02em; }
  .status-row { display: flex; gap: 10px; }
  .status-badge { font-size: 0.6rem; font-weight: 800; background: rgba(0, 255, 127, 0.1); color: #00ff7f; padding: 2px 8px; border-radius: 4px; }
  .level-badge { font-size: 0.6rem; font-weight: 800; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.6); padding: 2px 8px; border-radius: 4px; }
  .time-stamp { font-size: 0.8rem; opacity: 0.3; font-weight: 600; }

  /* DASHBOARD GRID */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 30px;
  }

  .premium-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .premium-card h2 {
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0 0 20px;
    text-transform: uppercase;
  }

  /* SIDEBAR STATS */
  .stat-items { display: flex; flex-direction: column; gap: 15px; }
  .stat-items .item { display: flex; justify-content: space-between; align-items: baseline; }
  .stat-items .label { font-size: 0.7rem; font-weight: 700; opacity: 0.5; }
  .stat-items .val { font-size: 1.25rem; font-weight: 800; }
  .stat-items .item.highlight .val { color: var(--net-primary, #0099ff); }

  /* CONFIG SYNC */
  .sync-items { display: flex; flex-direction: column; gap: 12px; }
  .sync-btn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 12px 16px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .sync-btn:hover { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1); }
  .sync-btn.active { color: #fff; border-color: rgba(0, 153, 255, 0.3); background: rgba(0, 153, 255, 0.05); }
  .indicator { width: 6px; height: 6px; border-radius: 50%; background: #333; transition: all 0.3s; }
  .active .indicator { background: var(--net-primary, #0099ff); box-shadow: 0 0 8px var(--net-primary, #0099ff); }

  .select-group { margin-top: 10px; }
  .select-group .label { font-size: 0.6rem; font-weight: 800; opacity: 0.3; display: block; margin-bottom: 8px; }
  .select-group select {
    width: 100%;
    background: #111112;
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    padding: 10px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }

  /* MAIN CONTENT */
  /* QUICK RESUME */
  .resume-card {
    height: 240px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 30px;
    border: none;
  }
  .card-bg {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover;
    background-position: center 20%;
    filter: brightness(0.6) saturate(1.2);
    transition: transform 0.8s cubic-bezier(0.2, 0, 0.2, 1);
  }
  .resume-card:hover .card-bg { transform: scale(1.05); }
  .overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: linear-gradient(0deg, rgba(10, 10, 11, 0.9) 0%, rgba(10, 10, 11, 0.2) 100%);
  }
  .resume-info { position: relative; z-index: 2; }
  .resume-info .tag { font-size: 0.6rem; font-weight: 900; letter-spacing: 2px; color: var(--net-primary, #0099ff); margin-bottom: 10px; display: block; }
  .resume-info h3 { font-size: 2rem; font-weight: 900; margin: 0 0 10px; letter-spacing: -0.03em; }
  .resume-info .meta { font-size: 0.8rem; font-weight: 700; opacity: 0.7; margin-bottom: 20px; }
  .btn-resume {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: #f2f2f2;
    color: #000;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 0.85rem;
    text-decoration: none;
    transition: all 0.3s;
  }
  .btn-resume:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1); }

  /* RECENT ACTIVITY */
  .activity-list { display: flex; flex-direction: column; gap: 8px; }
  .activity-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    transition: background 0.2s;
  }
  .activity-item:hover { background: rgba(255, 255, 255, 0.04); }
  .activity-item img { width: 40px; height: 56px; object-fit: cover; border-radius: 8px; }
  .item-content { flex: 1; display: flex; flex-direction: column; }
  .item-content .name { font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .item-content .meta { font-size: 0.7rem; opacity: 0.4; font-weight: 600; }
  .mini-progress { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: rgba(255, 255, 255, 0.05); }
  .mini-progress .fill { height: 100%; background: var(--net-primary, #0099ff); }

  /* AI BRIEFING */
  .section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
  .ai-badge { font-size: 0.6rem; font-weight: 800; color: var(--net-primary, #0099ff); display: flex; align-items: center; gap: 5px; }
  .briefing-text { font-size: 0.95rem; line-height: 1.6; opacity: 0.7; margin-bottom: 24px; font-weight: 500; }
  .recs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .rec-card {
    height: 140px;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 15px;
    text-decoration: none;
    color: #fff;
  }
  .rec-card img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
  .rec-blur { position: absolute; bottom: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%); }
  .rec-info { position: relative; z-index: 2; }
  .rec-info .title { display: block; font-size: 0.85rem; font-weight: 800; margin-bottom: 4px; }
  .rec-info .reason { font-size: 0.65rem; opacity: 0.6; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

  /* RESPONSIVE */
  @media (max-width: 1024px) {
    .dashboard-grid { grid-template-columns: 1fr; }
    .sidebar { order: 2; }
    .main-content { order: 1; }
  }
  @media (max-width: 640px) {
    .resume-info h3 { font-size: 1.5rem; }
    .profile-header { flex-direction: column; text-align: center; gap: 20px; }
    .user-info { flex-direction: column; }
  }
</style>

