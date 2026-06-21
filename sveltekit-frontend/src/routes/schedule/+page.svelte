<script lang="ts">
  import { api } from "$lib/api";
  import AnimeCard from "$lib/components/AnimeCard.svelte";
  import { onMount } from "svelte";
  import { Calendar, Clock, AlertCircle } from "lucide-svelte";

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];

  const buildDateOptions = () => {
    const opts = [];
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      opts.push({
        date: toDateStr(d),
        day: weekdays[d.getDay()],
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" }),
        sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return opts;
  };

  const dateOptions = buildDateOptions();
  let selectedDate = $state(dateOptions[0].date);
  let selectedIndex = $state(0);
  let scheduledAnimes: any[] = $state([]);
  let loading = $state(false);

  async function fetchSchedule() {
    loading = true;
    try {
      const dayDate = new Date(selectedDate + "T00:00:00");
      const start = Math.floor(dayDate.getTime() / 1000);
      const end = start + 86399;

      const res = await api.getAnilistSchedule(start, end);
      scheduledAnimes = res || [];
    } catch (err) {
      console.error("Failed to fetch schedule", err);
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

  function selectDay(index: number) {
    selectedIndex = index;
    selectedDate = dateOptions[index].date;
  }

  function formatTime(airingAt: number) {
    if (!airingAt) return "";
    return new Date(airingAt * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }
</script>

<svelte:head>
  <title>Anime Release Schedule — WatchAnimez</title>
  <meta name="description" content="Check the WatchAnimez anime release schedule for upcoming episodes, airing times, and new releases this week." />
</svelte:head>

<div class="schedule-page container">
  <!-- Page Header -->
  <div class="page-header">
    <div class="header-top">
      <div>
        <h1 class="page-title">Release Schedule</h1>
        <p class="page-subtitle">See what's airing this week</p>
      </div>
      <div class="header-badge">
        <Calendar size={16} />
        <span>Weekly Schedule</span>
      </div>
    </div>
  </div>

  <!-- Day Selector -->
  <div class="day-selector">
    {#each dateOptions as opt, i}
      <button
        class="day-btn"
        class:active={selectedIndex === i}
        onclick={() => selectDay(i)}
      >
        <span class="day-label">{opt.label}</span>
        <span class="day-date">{opt.sub}</span>
      </button>
    {/each}
  </div>

  <!-- Content -->
  <main class="content-area">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading schedule...</p>
      </div>
    {:else if scheduledAnimes.length === 0}
      <div class="empty-state">
        <AlertCircle size={48} class="empty-icon" />
        <h2>No episodes scheduled</h2>
        <p>No anime releases found for this date. Try selecting a different day.</p>
      </div>
    {:else}
      <div class="results-count">
        <span>{scheduledAnimes.length} anime airing {selectedIndex === 0 ? "today" : `on ${dateOptions[selectedIndex].label}`}</span>
      </div>
      <div class="anime-grid">
        {#each scheduledAnimes as anime (anime.id)}
          <div class="schedule-card">
            <AnimeCard {anime} />
            {#if anime.nextAiringEpisode}
              <div class="episode-info">
                <Clock size={12} />
                <span>EP {anime.nextAiringEpisode.episode} · {formatTime(anime.nextAiringEpisode.airingAt)}</span>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .schedule-page {
    padding-top: 2rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .page-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.3rem;
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 1rem;
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

  /* Day Selector */
  .day-selector {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    margin-bottom: 2rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .day-selector::-webkit-scrollbar { display: none; }

  .day-btn {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: var(--net-text-muted);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    min-width: 80px;
  }
  .day-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }
  .day-btn.active {
    background: var(--net-red);
    border-color: var(--net-red);
    color: white;
  }
  .day-label {
    font-size: 0.85rem;
    font-weight: 700;
  }
  .day-date {
    font-size: 0.72rem;
    opacity: 0.7;
  }

  /* Content */
  .content-area {
    min-height: 40vh;
  }

  .results-count {
    margin-bottom: 1.5rem;
    font-size: 0.88rem;
    color: var(--net-text-muted);
    font-weight: 500;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    gap: 1rem;
    color: var(--net-text-muted);
  }
  .loading-state p {
    font-size: 0.9rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
    text-align: center;
    gap: 1rem;
  }
  .empty-icon {
    color: var(--net-text-muted);
    opacity: 0.5;
  }
  .empty-state h2 {
    font-size: 1.3rem;
    font-weight: 700;
  }
  .empty-state p {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    max-width: 400px;
  }

  .anime-grid {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }

  .schedule-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .episode-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
    color: var(--net-red);
    font-weight: 600;
    padding: 0 0.25rem;
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.6rem; }
    .page-subtitle { font-size: 0.9rem; }
    .header-badge { display: none; }
    .day-btn {
      padding: 0.6rem 1rem;
      min-width: 70px;
    }
    .day-label { font-size: 0.8rem; }
    .anime-grid {
      gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(125px, 1fr));
    }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.4rem; }
    .day-btn {
      padding: 0.5rem 0.75rem;
      min-width: 60px;
    }
    .day-label { font-size: 0.75rem; }
    .day-date { font-size: 0.65rem; }
    .anime-grid {
      gap: 0.85rem;
      grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
    }
    .episode-info { font-size: 0.7rem; }
  }

  @media (max-width: 360px) {
    .anime-grid {
      grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
    }
  }
</style>
