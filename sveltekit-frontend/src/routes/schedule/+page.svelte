<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { Calendar, Clock, Play, Activity, Radio, Target, ShieldAlert, Cpu } from "lucide-svelte";
  import { fade, fly, slide } from "svelte/transition";

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];

  const buildDateOptions = () => {
    const opts = [];
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      opts.push({
        date: toDateStr(d),
        day: weekdays[d.getDay()],
        label:
          i === 0
            ? "TODAY"
            : i === 1
              ? "NEXT_OP"
              : d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase(),
        code: `OPS_00${i + 1}`
      });
    }
    return opts;
  };

  const dateOptions = buildDateOptions();
  let selectedNode = $state(dateOptions[0]);
  let selectedDate = $derived(selectedNode.date);
  let scheduledAnimes: any[] = $state([]);
  let loading = $state(false);

  async function fetchSchedule() {
    loading = true;
    try {
      // Calculate Unix timestamps for the start and end of the selected day
      const dayDate = new Date(selectedNode.date + "T00:00:00");
      const start = Math.floor(dayDate.getTime() / 1000);
      const end = start + 86399; // 24 hours later (minus 1 second)

      const res = await api.getAnilistSchedule(start, end);
      scheduledAnimes = res || [];
    } catch (err) {
      console.error("Failed to fetch AniList schedule", err);
      scheduledAnimes = [];
    } finally {
      loading = false;
    }
  }

  onMount(fetchSchedule);

  $effect(() => {
    if (selectedDate) {
      fetchSchedule();
    }
  });

  function formatTime(airingAt: number) {
    if (!airingAt) return "??:??";
    return new Date(airingAt * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
</script>

<svelte:head>
  <title>Timeline Protocol — AnimePro</title>
</svelte:head>

<div class="schedule-page">
  <!-- Tactical HUD Header -->
  <header class="tactical-header">
    <div class="container">
      <div class="header-main" in:fly={{ y: -20, duration: 800 }}>
        <div class="status-box">
          <div class="scanline"></div>
          <div class="status-top">
            <div class="pulse-indicator"></div>
            <span class="status-text">MISSION_TIMELINE_ACTIVE</span>
            <span class="system-id">ID: PRO-SC01</span>
          </div>
          <div class="status-content">
            <h1 class="tactical-title">TIMELINE PROTOCOL</h1>
            <div class="telemetry-grid">
              <div class="tel-item">
                <span class="tel-label">SECTOR</span>
                <span class="tel-val">RELEASE_CALENDAR</span>
              </div>
              <div class="tel-item">
                <span class="tel-label">STATE</span>
                <span class="tel-val text-primary">REAL_TIME_SYNC</span>
              </div>
              <div class="tel-item hide-mobile">
                <span class="tel-label">UPLINK</span>
                <span class="tel-val">ENCRYPTED</span>
              </div>
            </div>
          </div>
        </div>

        <div class="action-badges hide-tablet">
          <div class="badge-item">
            <Radio size={14} class="text-primary" />
            <span>LIVE_FEED</span>
          </div>
          <div class="badge-item">
            <Activity size={14} class="text-secondary" />
            <span>SYNC_OK</span>
          </div>
        </div>
      </div>

      <!-- Timeline Selector -->
      <div class="timeline-protocol" in:fly={{ y: 20, duration: 800, delay: 200 }}>
        <div class="timeline-track">
          <div class="track-line"></div>
          {#each dateOptions as opt, i}
            <button
              class="timeline-node"
              class:active={selectedDate === opt.date}
              onclick={() => (selectedNode = opt)}
            >
              <div class="node-dot"></div>
              <div class="node-content">
                <span class="node-id">{opt.code}</span>
                <span class="node-day">{opt.label}</span>
                <span class="node-date">{opt.sub}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </header>

  <!-- Content Grid -->
  <main class="container content-area">
    {#if loading}
      <div class="loading-state" out:fade>
        <div class="tactical-spinner">
          <Cpu size={40} class="spinning text-primary" />
          <p class="mono">DECRYPTING_DATA...</p>
        </div>
      </div>
    {:else if scheduledAnimes.length === 0}
      <div class="empty-state" in:fade>
        <ShieldAlert size={48} class="text-muted" />
        <h2 class="mono">NO_DATA_DETECTED</h2>
        <p class="mono-sub">Zero deployments scheduled for this timestamp.</p>
      </div>
    {:else}
      <div class="deployment-grid">
        {#each scheduledAnimes as anime, i (anime.id)}
          <div 
            class="deployment-wrapper"
            in:fly={{ x: -20, duration: 500, delay: i * 50 }}
          >
            <a href="/anime/{anime.id}" class="deployment-module">
              <div class="module-scanline"></div>
              <div class="module-header">
                <div class="module-id">#{anime.id.toString().slice(-4)}</div>
                {#if anime.nextAiringEpisode}
                  <div class="module-timer">
                    <Clock size={12} />
                    <span>{formatTime(anime.nextAiringEpisode.airingAt)}</span>
                  </div>
                {/if}
              </div>

              <div class="module-body">
                <div class="poster-frame">
                  <img src={anime.poster} alt={anime.title} loading="lazy" />
                  <div class="poster-overlay"></div>
                  <div class="poster-tags">
                    {#if anime.nextAiringEpisode}
                      <span class="tag ep-tag">EP_{anime.nextAiringEpisode.episode}</span>
                    {/if}
                  </div>
                </div>

                <div class="module-info">
                  <h3 class="module-title">{anime.title}</h3>
                  <div class="module-meta">
                    <div class="meta-item">
                      <Target size={12} class="text-primary" />
                      <span>{anime.format || 'TV'}</span>
                    </div>
                    {#if anime.score > 0}
                      <div class="meta-item">
                        <Activity size={12} class="text-secondary" />
                        <span>{anime.score.toFixed(1)}_RTG</span>
                      </div>
                    {/if}
                  </div>
                  <div class="module-status">
                    <div class="status-bar">
                      <div class="status-fill" style="width: 85%"></div>
                    </div>
                    <span class="status-label">READY_FOR_UPLINK</span>
                  </div>
                </div>
              </div>

              <div class="module-footer">
                <span class="footer-text">ACCESS_MANIFEST</span>
                <Play size={12} fill="currentColor" />
              </div>
            </a>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .schedule-page {
    min-height: 100vh;
    padding-top: 100px;
    padding-bottom: 80px;
  }

  /* --- Tactical Header --- */
  .tactical-header {
    margin-bottom: 3rem;
  }

  .header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2.5rem;
    gap: 2rem;
  }

  .status-box {
    position: relative;
    flex: 1;
    background: var(--tactical-glass);
    border: 1px solid var(--tactical-border);
    padding: 1.5rem;
    border-radius: 4px;
    overflow: hidden;
  }

  .scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--tactical-primary), transparent);
    opacity: 0.3;
    animation: scan 3s linear infinite;
  }

  @keyframes scan {
    0% { top: 0; }
    100% { top: 100%; }
  }

  .status-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .pulse-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tactical-primary);
    box-shadow: 0 0 10px var(--tactical-primary);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  .status-text {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.1rem;
    color: var(--tactical-primary);
  }

  .system-id {
    margin-left: auto;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    opacity: 0.4;
  }

  .tactical-title {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 1rem 0;
    color: #fff;
  }

  .telemetry-grid {
    display: flex;
    gap: 2rem;
  }

  .tel-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .tel-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.05em;
  }

  .tel-val {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .action-badges {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .badge-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 14px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.05em;
  }

  /* --- Timeline Protocol --- */
  .timeline-protocol {
    position: relative;
    padding: 1rem 0;
  }

  .timeline-track {
    display: flex;
    justify-content: space-between;
    position: relative;
    padding-top: 1.5rem;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 1rem;
  }

  .timeline-track::-webkit-scrollbar { display: none; }

  .track-line {
    position: absolute;
    top: calc(1.5rem + 5px);
    left: 20px;
    right: 20px;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    z-index: 0;
  }

  .timeline-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    min-width: 100px;
    z-index: 1;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .node-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #111;
    border: 2px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s;
    position: relative;
  }

  .node-dot::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1px solid transparent;
    transition: all 0.3s;
  }

  .timeline-node:hover .node-dot {
    border-color: var(--tactical-primary);
    box-shadow: 0 0 10px var(--tactical-primary);
  }

  .timeline-node.active .node-dot {
    background: var(--tactical-primary);
    border-color: var(--tactical-primary);
    box-shadow: 0 0 15px var(--tactical-primary);
  }

  .timeline-node.active .node-dot::after {
    border-color: var(--tactical-primary);
    opacity: 0.5;
    animation: ripple 1.5s infinite;
  }

  @keyframes ripple {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2); opacity: 0; }
  }

  .node-content {
    text-align: center;
    background: var(--tactical-glass);
    border: 1px solid var(--tactical-border);
    padding: 10px;
    border-radius: 4px;
    width: 100%;
    transition: all 0.3s;
  }

  .timeline-node.active .node-content {
    border-color: var(--tactical-primary);
    background: rgba(20, 184, 166, 0.05);
  }

  .node-id {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: var(--tactical-primary);
    margin-bottom: 2px;
  }

  .node-day {
    display: block;
    font-size: 0.75rem;
    font-weight: 800;
    color: #fff;
  }

  .node-date {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.4);
  }

  /* --- Deployment Grid --- */
  .deployment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: 1.5rem;
  }

  .deployment-module {
    display: block;
    position: relative;
    background: var(--tactical-glass);
    border: 1px solid var(--tactical-border);
    border-radius: 4px;
    padding: 12px;
    overflow: hidden;
    transition: all 0.3s;
  }

  .deployment-module:hover {
    border-color: var(--tactical-primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
  }

  .module-scanline {
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 50%, rgba(20, 184, 166, 0.02) 50%);
    background-size: 100% 4px;
    pointer-events: none;
  }

  .module-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .module-timer {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--tactical-primary);
  }

  .module-body {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
  }

  .poster-frame {
    width: 90px;
    height: 125px;
    flex-shrink: 0;
    position: relative;
    border-radius: 2px;
    overflow: hidden;
    background: #111;
  }

  .poster-frame img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s;
  }

  .deployment-module:hover .poster-frame img {
    transform: scale(1.1);
  }

  .poster-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8));
  }

  .poster-tags {
    position: absolute;
    bottom: 6px;
    left: 6px;
  }

  .tag {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    background: var(--tactical-primary);
    color: #000;
    border-radius: 2px;
  }

  .module-info {
    flex: 1;
    min-width: 0;
  }

  .module-title {
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
    margin: 0 0 10px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .module-meta {
    display: flex;
    gap: 12px;
    margin-bottom: 15px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .module-status {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .status-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }

  .status-fill {
    height: 100%;
    background: var(--tactical-primary);
    opacity: 0.6;
  }

  .status-label {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.05em;
  }

  .module-footer {
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: rgba(255, 255, 255, 0.3);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    transition: all 0.3s;
  }

  .deployment-module:hover .module-footer {
    color: var(--tactical-primary);
  }

  /* --- States --- */
  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 0;
    gap: 1.5rem;
  }

  .tactical-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinning {
    animation: rotate 2s linear infinite;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .mono { font-family: var(--font-mono); letter-spacing: 0.1em; }
  .mono-sub { font-family: var(--font-mono); font-size: 0.8rem; opacity: 0.5; }

  /* --- Responsive --- */
  @media (max-width: 1024px) {
    .deployment-grid {
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    }
  }

  @media (max-width: 768px) {
    .schedule-page {
      padding-top: 80px;
    }
    
    .tactical-title {
      font-size: 1.6rem;
    }

    .telemetry-grid {
      gap: 1rem;
    }

    .deployment-grid {
      grid-template-columns: 1fr;
    }

    .deployment-module {
      max-width: none;
    }

    .timeline-node {
      min-width: 80px;
    }
  }

  .hide-mobile {
    @media (max-width: 480px) { display: none; }
  }

  .hide-tablet {
    @media (max-width: 1024px) { display: none; }
  }
</style>
e>
