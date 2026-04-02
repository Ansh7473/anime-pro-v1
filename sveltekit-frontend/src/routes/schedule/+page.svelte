<script lang="ts">
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { Calendar, Clock, Play } from "lucide-svelte";

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];

  const buildDateOptions = () => {
    const opts = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      opts.push({
        date: toDateStr(d),
        label:
          i === 0
            ? "Today"
            : i === 1
              ? "Tomorrow"
              : d.toLocaleDateString("en-US", { weekday: "short" }),
        sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return opts;
  };

  const dateOptions = buildDateOptions();
  let selectedDate = $state(dateOptions[0].date);
  let scheduledAnimes: any[] = $state([]);
  let loading = $state(false);

  async function fetchSchedule() {
    loading = true;
    try {
      const res = await api.getAiringSchedule(1, 40); // AniList based airing schedule
      // For more accurate daily schedule, we'd need a specific AniList query with date range
      // but let's use the AiringSchedule for now as a base.
      scheduledAnimes = res.data || [];
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
      // In a real app, we'd filter or fetch specifically for this date
      // AniList requires a specific GraphQL query with airingAt_greater/less
      fetchSchedule();
    }
  });

  function formatTime(time: string) {
    if (!time) return "TBA";
    const [h, m] = time.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    return `${hr % 12 || 12}:${m} ${ampm}`;
  }
</script>

<svelte:head>
  <title>Release Schedule — AnimePro</title>
</svelte:head>

<div class="schedule-page">
  <!-- Hero Header -->
  <div class="hero-header">
    <div class="hero-bg"></div>
    <div class="hero-content container">
      <div class="title-row">
        <div class="icon-box">
          <Calendar size={22} color="white" />
        </div>
        <div>
          <p class="brand">ANIME PRO</p>
          <h1 class="main-title">Release Schedule</h1>
        </div>
        <div class="live-badge">
          <Clock size={13} color="#14b8a6" />
          <span>AIRING NOW</span>
        </div>
      </div>
      <p class="subtitle">Track when your favorite anime air this week</p>

      <!-- Date Selector -->
      <div class="date-selector">
        {#each dateOptions as opt, i}
          <button
            class="date-btn"
            class:active={selectedDate === opt.date}
            onclick={() => (selectedDate = opt.date)}
          >
            <span class="date-label">{opt.label}</span>
            <span class="date-sub">{opt.sub}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="content container">
    <div class="divider"></div>

    {#if loading}
      <div class="center">
        <div class="spinner"></div>
      </div>
    {:else if scheduledAnimes.length === 0}
      <div class="empty">
        <Calendar size={48} />
        <p>No anime scheduled for this day.</p>
        <p class="tip">Try a different day</p>
      </div>
    {:else}
      <div class="grid">
        {#each scheduledAnimes as anime (anime.id)}
          <a href="/anime/{anime.id}" class="schedule-card">
            <div class="card-edge"></div>
            <div class="poster-box">
              <img src={anime.poster} alt={anime.title} loading="lazy" />
            </div>
            <div class="card-info">
              <h3 class="anime-title">{anime.title}</h3>
              <div class="meta-row">
                {#if anime.nextAiringEpisode}
                  <div class="time-tag">
                    <Clock size={11} color="#14b8a6" />
                    <span
                      >{new Date(
                        anime.nextAiringEpisode.airingAt * 1000,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span
                    >
                  </div>
                {/if}
                <div class="ep-tag">
                  <Play size={10} fill="white" color="white" />
                  <span>{anime.episodes || "?"} eps</span>
                </div>
                {#if anime.score > 0}
                  <span class="score-tag">★ {anime.score.toFixed(1)}</span>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .schedule-page {
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
      rgba(20, 184, 166, 0.1) 0%,
      transparent 100%
    );
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(
      circle at 60% 30%,
      rgba(20, 184, 166, 0.07) 0%,
      transparent 55%
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
    background: linear-gradient(135deg, #14b8a6, #06b6d4);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.4);
  }
  .brand {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(20, 184, 166, 0.8);
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
    border-radius: 50px;
    font-size: 0.75rem;
    font-weight: 800;
    background: rgba(20, 184, 166, 0.1);
    border: 1px solid rgba(20, 184, 166, 0.25);
    color: #14b8a6;
  }
  .subtitle {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.95rem;
    margin: 0.5rem 0 2rem;
    padding-left: 62px;
  }
  .date-selector {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-left: 62px;
    scrollbar-width: none;
  }
  .date-selector::-webkit-scrollbar {
    display: none;
  }
  .date-btn {
    padding: 10px 18px;
    border-radius: 14px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: white;
    transition: all 0.2s;
    min-width: 72px;
  }
  .date-btn.active {
    border-color: rgba(20, 184, 166, 0.6);
    background: linear-gradient(135deg, #14b8a6, #06b6d4);
    box-shadow: 0 4px 16px rgba(20, 184, 166, 0.3);
  }
  .date-label {
    font-size: 0.82rem;
  }
  .date-sub {
    font-size: 0.7rem;
    opacity: 0.7;
    font-weight: 600;
  }
  .content {
    padding-bottom: 5rem;
  }
  .divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(20, 184, 166, 0.4),
      rgba(255, 255, 255, 0.05),
      transparent
    );
    margin-bottom: 2.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
  .schedule-card {
    display: flex;
    gap: 16px;
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(10px);
    transition: 0.3s;
    position: relative;
    overflow: hidden;
  }
  .schedule-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }
  .card-edge {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(#14b8a6, #06b6d4);
    border-radius: 3px 0 0 3px;
  }
  .poster-box {
    width: 72px;
    height: 100px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  .poster-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .card-info {
    flex: 1;
    display: flex;
    flexdirection: column;
    justify-content: center;
    gap: 8px;
    min-width: 0;
  }
  .anime-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .time-tag {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 50px;
    background: rgba(20, 184, 166, 0.15);
    border: 1px solid rgba(20, 184, 166, 0.25);
    font-size: 0.78rem;
    font-weight: 700;
    color: #14b8a6;
  }
  .ep-tag {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
  }
  .score-tag {
    font-size: 0.75rem;
    font-weight: 700;
    color: #fbbf24;
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
  .tip {
    font-size: 0.85rem;
    margin-top: 0.5rem;
    opacity: 0.5;
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
    .date-selector {
      gap: 8px;
      padding-left: 0;
    }
    .date-btn {
      padding: 8px 14px;
      min-width: 65px;
    }
    .date-label {
      font-size: 0.78rem;
    }
    .date-sub {
      font-size: 0.65rem;
    }
    .content {
      padding-bottom: 4rem;
    }
    .divider {
      margin-bottom: 2rem;
    }
    .grid {
      grid-template-columns: 1fr;
      gap: 0.9rem;
    }
    .schedule-card {
      gap: 14px;
      padding: 14px;
    }
    .poster-box {
      width: 68px;
      height: 94px;
    }
    .anime-title {
      font-size: 0.9rem;
    }
    .time-tag {
      padding: 2px 8px;
      font-size: 0.75rem;
    }
    .ep-tag {
      padding: 2px 8px;
      font-size: 0.72rem;
    }
    .score-tag {
      font-size: 0.72rem;
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
    .date-selector {
      gap: 6px;
    }
    .date-btn {
      padding: 7px 12px;
      min-width: 60px;
    }
    .date-label {
      font-size: 0.75rem;
    }
    .date-sub {
      font-size: 0.62rem;
    }
    .content {
      padding-bottom: 3rem;
    }
    .divider {
      margin-bottom: 1.5rem;
    }
    .grid {
      gap: 0.8rem;
    }
    .schedule-card {
      gap: 12px;
      padding: 12px;
      border-radius: 14px;
    }
    .poster-box {
      width: 64px;
      height: 88px;
      border-radius: 8px;
    }
    .anime-title {
      font-size: 0.85rem;
    }
    .meta-row {
      gap: 6px;
    }
    .time-tag {
      padding: 2px 7px;
      font-size: 0.72rem;
    }
    .ep-tag {
      padding: 2px 7px;
      font-size: 0.7rem;
    }
    .score-tag {
      font-size: 0.7rem;
    }
    .center {
      padding: 3rem 0;
    }
    .empty {
      padding: 3rem;
    }
    .tip {
      font-size: 0.8rem;
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
    .date-selector {
      gap: 5px;
    }
    .date-btn {
      padding: 6px 10px;
      min-width: 55px;
    }
    .date-label {
      font-size: 0.72rem;
    }
    .date-sub {
      font-size: 0.6rem;
    }
    .schedule-card {
      gap: 10px;
      padding: 10px;
    }
    .poster-box {
      width: 60px;
      height: 82px;
    }
    .anime-title {
      font-size: 0.8rem;
    }
    .time-tag {
      padding: 2px 6px;
      font-size: 0.7rem;
    }
    .ep-tag {
      padding: 2px 6px;
      font-size: 0.68rem;
    }
  }
</style>
