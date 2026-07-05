<script lang="ts">
  import { onMount } from 'svelte';
  import { api, getProxiedImage } from '$lib/api';
  import { auth, updateProfile } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import {
    Activity,
    Clock,
    Zap,
    Cpu,
    Radio,
    User
  } from 'lucide-svelte';

  let stats = $state<any>(null);
  let history = $state<any[]>([]);
  let watchlist = $state<any[]>([]);
  let recommendations = $state<any>(null);
  let loading = $state(true);

  async function loadDashboard() {
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
      history = (historyRes || []).slice(0, 10);
      watchlist = watchlistRes || [];
      recommendations = recsRes;
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      loading = false;
    }
  }

  onMount(loadDashboard);

  async function togglePref(key: string, value: string | number | boolean) {
    if (!$auth.currentProfile?.id || !$auth.token) return;
    try {
      const updated = await api.updateProfile($auth.token, $auth.currentProfile.id, { [key]: value });
      updateProfile(updated);
    } catch (err) {
      console.error('Failed to sync settings:', err);
    }
  }
</script>

<svelte:head>
  <title>My Dashboard — WatchAnimez</title>
  <meta name="description" content="Your personal WatchAnimez dashboard — watch history, recommendations, preferences, and viewing statistics." />
  <meta property="og:title" content="My Dashboard — WatchAnimez" />
  <meta property="og:description" content="Your personal WatchAnimez dashboard — watch history, recommendations, preferences, and viewing statistics." />
</svelte:head>

<div class="dashboard-page container">
  {#if loading}
    <div class="intel-skeleton" aria-hidden="true">
      <div class="isk-header shimmer"></div>
      <div class="stats-row">
        {#each Array(4) as _, i (i)}
          <div class="isk-stat shimmer"></div>
        {/each}
      </div>
      <div class="isk-block shimmer"></div>
      <div class="isk-block shimmer"></div>
    </div>
  {:else if stats}
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-top">
        <div class="header-left">
          <div class="avatar">
            {($auth.currentProfile?.name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <h1 class="page-title">{$auth.currentProfile?.name || 'My Dashboard'}</h1>
            <p class="page-subtitle">Your watch history, preferences, and personalized recommendations</p>
          </div>
        </div>
        <div class="header-badge">
          <User size={16} />
          <span>Dashboard</span>
        </div>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon"><Clock size={20} /></div>
        <div class="stat-info">
          <span class="stat-value">{(stats?.total_hours || 0).toFixed(1)}h</span>
          <span class="stat-label">Watch Time</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Activity size={20} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats?.progression?.rank || 'Newcomer'}</span>
          <span class="stat-label">Rank</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Zap size={20} /></div>
        <div class="stat-info">
          <span class="stat-value">{stats?.reserves_count || '0'}</span>
          <span class="stat-label">In Watchlist</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Radio size={20} /></div>
        <div class="stat-info">
          <span class="stat-value">Level {stats?.progression?.level || '1'}</span>
          <span class="stat-label">Profile Level</span>
        </div>
      </div>
    </div>

    <!-- Quick Resume -->
    {#if stats?.quick_resume}
      <section class="resume-section">
        <div class="resume-card">
          <img src={getProxiedImage(stats.quick_resume.animePoster)} alt="" class="resume-poster" />
          <div class="resume-info">
            <span class="resume-tag">Continue Watching</span>
            <h3 class="resume-title">{stats.quick_resume.animeTitle}</h3>
            <p class="resume-meta">
              Episode {stats.quick_resume.episodeNumber} · {stats.quick_resume.duration > 0 ? Math.round((stats.quick_resume.progress / stats.quick_resume.duration) * 100) : 0}% complete
            </p>
            <div class="resume-progress">
              <div class="resume-progress-fill" style="width: {stats.quick_resume.duration > 0 ? (stats.quick_resume.progress / stats.quick_resume.duration) * 100 : 0}%"></div>
            </div>
          </div>
          <a href="/watch/{stats.quick_resume.animeId}/{stats.quick_resume.episodeNumber}" class="resume-btn">
            <Zap size={16} /> Resume
          </a>
        </div>
      </section>
    {/if}

    <div class="dashboard-grid">
      <!-- Left: Preferences -->
      <div class="sidebar">
        <section class="card">
          <h2 class="card-title">Preferences</h2>
          <div class="pref-list">
            <button
              class="pref-toggle"
              class:active={$auth.currentProfile?.autoNext}
              onclick={() => togglePref('autoNext', !$auth.currentProfile?.autoNext)}
            >
              <span>Auto-Play Next Episode</span>
              <div class="toggle-dot"></div>
            </button>
            <button
              class="pref-toggle"
              class:active={$auth.currentProfile?.autoSkip}
              onclick={() => togglePref('autoSkip', !$auth.currentProfile?.autoSkip)}
            >
              <span>Skip Intros</span>
              <div class="toggle-dot"></div>
            </button>

            <div class="pref-select">
              <label for="audio-pref">Audio Preference</label>
              <select
                id="audio-pref"
                value={$auth.currentProfile?.language || 'sub'}
                onchange={(e) => togglePref('language', (e.target as HTMLSelectElement).value)}
              >
                <option value="sub">Subtitled</option>
                <option value="dub">Dubbed</option>
                <option value="multi">Multi-Audio</option>
              </select>
            </div>

            <a href="/profile" class="theme-link">
              <Cpu size={16} /> Customize Theme & Appearance
            </a>
          </div>
        </section>
      </div>

      <!-- Right: Activity + Recommendations -->
      <div class="main-col">
        <!-- Recent Activity -->
        <section class="card">
          <h2 class="card-title">Recent Activity</h2>
          <div class="activity-list">
            {#if history.length === 0}
              <div class="empty-state">
                <Clock size={32} class="empty-icon" />
                <p>No watch history yet. Start watching to build your activity!</p>
              </div>
            {:else}
              {#each history as entry (entry.id)}
                <a href="/anime/{entry.animeId}" class="activity-item">
                  <img src={getProxiedImage(entry.animePoster)} alt="" class="activity-poster" loading="lazy" decoding="async" />
                  <div class="activity-info">
                    <span class="activity-name">{entry.animeTitle}</span>
                    <span class="activity-meta">EP {entry.episodeNumber} · {new Date(entry.lastWatchedAt).toLocaleDateString()}</span>
                  </div>
                  <div class="activity-progress">
                    <div class="activity-progress-fill" style="width: {entry.duration > 0 ? (entry.progress / entry.duration) * 100 : 0}%"></div>
                  </div>
                </a>
              {/each}
            {/if}
          </div>
        </section>

        <!-- AI Recommendations -->
        <section class="card">
          <div class="card-title-row">
            <h2 class="card-title">Recommended For You</h2>
            <span class="ai-badge"><Radio size={12} /> AI Powered</span>
          </div>
          <p class="recs-intro">{recommendations?.briefing || 'Analyzing your taste to find your next favorite anime...'}</p>
          <div class="recs-grid">
            {#each (recommendations?.recommendations || []) as rec (rec.id)}
              <a href="/anime/{rec.id}" class="rec-card">
                <img src={getProxiedImage(rec.poster)} alt="" class="rec-poster" loading="lazy" decoding="async" />
                <div class="rec-info">
                  <span class="rec-title">{rec.title}</span>
                  <span class="rec-reason">{rec.reason}</span>
                </div>
              </a>
            {/each}
          </div>
        </section>
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard-page {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 1100px;
  }

  /* Loading */
  .intel-skeleton { padding-top: 1rem; }
  .isk-header { height: 80px; border-radius: 14px; margin-bottom: 1.5rem; }
  .isk-stat { height: 84px; border-radius: 12px; }
  .isk-block { height: 180px; border-radius: 14px; margin-top: 1.5rem; }
  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.05) 30%,
      rgba(255, 255, 255, 0.11) 50%,
      rgba(255, 255, 255, 0.05) 70%
    );
    background-size: 200% 100%;
    animation: intel-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes intel-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; }
  }

  /* Page Header */
  .page-header { margin-bottom: 2rem; }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--net-red), #7c040a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
  }
  .page-title {
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.2rem;
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 0.92rem;
  }
  .header-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.4rem 1rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--net-red);
    white-space: nowrap;
  }

  /* Stats Row */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 1.25rem;
    transition: all 0.2s;
  }
  .stat-card:hover {
    border-color: rgba(229, 9, 20, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }
  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(229, 9, 20, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--net-red);
    flex-shrink: 0;
  }
  .stat-info { display: flex; flex-direction: column; }
  .stat-value { font-size: 1.1rem; font-weight: 700; color: white; }
  .stat-label { font-size: 0.75rem; color: var(--net-text-muted); margin-top: 0.15rem; }

  /* Resume Section */
  .resume-section { margin-bottom: 2rem; }
  .resume-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.25rem;
    transition: all 0.2s;
  }
  .resume-card:hover {
    border-color: rgba(229, 9, 20, 0.2);
  }
  .resume-poster {
    width: 60px;
    height: 80px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .resume-info { flex: 1; min-width: 0; }
  .resume-tag {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--net-red);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .resume-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0.25rem 0;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .resume-meta {
    font-size: 0.82rem;
    color: var(--net-text-muted);
    margin-bottom: 0.5rem;
  }
  .resume-progress {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .resume-progress-fill {
    height: 100%;
    background: var(--net-red);
    border-radius: 2px;
    transition: width 0.3s;
  }
  .resume-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    background: var(--net-red);
    color: white;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
    transition: all 0.2s;
    flex-shrink: 0;
  }
  .resume-btn:hover { filter: brightness(1.15); }

  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  /* Cards */
  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .card-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 1.25rem;
    color: white;
  }
  .card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .card-title-row .card-title { margin-bottom: 0; }

  /* Preferences */
  .pref-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .pref-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    color: white;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .pref-toggle:hover { background: rgba(255, 255, 255, 0.06); }
  .toggle-dot {
    width: 38px;
    height: 22px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.12);
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .toggle-dot::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s;
  }
  .pref-toggle.active .toggle-dot {
    background: var(--net-red);
  }
  .pref-toggle.active .toggle-dot::after {
    transform: translateX(16px);
  }

  .pref-select {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .pref-select label {
    font-size: 0.78rem;
    color: var(--net-text-muted);
    font-weight: 600;
  }
  .pref-select select {
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: white;
    font-size: 0.88rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .pref-select select:focus { border-color: var(--net-red); }

  .theme-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    background: rgba(229, 9, 20, 0.06);
    border: 1px solid rgba(229, 9, 20, 0.12);
    border-radius: 10px;
    color: var(--net-red);
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
  }
  .theme-link:hover {
    background: rgba(229, 9, 20, 0.1);
    border-color: rgba(229, 9, 20, 0.25);
  }

  /* AI Badge */
  .ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.2);
    padding: 0.25rem 0.6rem;
    border-radius: 50px;
  }

  .recs-intro {
    font-size: 0.88rem;
    color: var(--net-text-muted);
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }

  .recs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  .rec-card {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    text-decoration: none;
    transition: all 0.2s;
  }
  .rec-card:hover {
    border-color: rgba(229, 9, 20, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }
  .rec-poster {
    width: 44px;
    height: 60px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .rec-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
  .rec-title {
    font-size: 0.82rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rec-reason {
    font-size: 0.72rem;
    color: var(--net-text-muted);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Activity List */
  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .activity-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .activity-item:hover { background: rgba(255, 255, 255, 0.04); }
  .activity-poster {
    width: 36px;
    height: 48px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
  }
  .activity-info { flex: 1; min-width: 0; }
  .activity-name {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .activity-meta {
    display: block;
    font-size: 0.72rem;
    color: var(--net-text-muted);
    margin-top: 0.15rem;
  }
  .activity-progress {
    width: 50px;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .activity-progress-fill {
    height: 100%;
    background: var(--net-red);
    border-radius: 2px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    gap: 0.75rem;
    text-align: center;
  }
  .empty-icon { color: var(--net-text-muted); opacity: 0.4; }
  .empty-state p { font-size: 0.88rem; color: var(--net-text-muted); }

  /* Responsive */
  @media (max-width: 900px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
    .stats-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .page-title { font-size: 1.4rem; }
    .page-subtitle { font-size: 0.85rem; }
    .header-badge { display: none; }
    .stats-row {
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .stat-card { padding: 1rem; }
    .stat-value { font-size: 0.95rem; }
    .resume-card {
      flex-direction: column;
      align-items: flex-start;
    }
    .resume-btn { width: 100%; justify-content: center; }
    .recs-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 400px) {
    .stats-row { grid-template-columns: 1fr; }
    .avatar { width: 42px; height: 42px; font-size: 1.1rem; }
  }
</style>
