<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { Clock } from "lucide-svelte";

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const buildDateOptions = () => {
    const opts: { date: string; label: string; sub: string }[] = [];
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
  let selectedIndex = $state(0);
  let items = $state<any[]>([]);
  let loading = $state(true);

  function titleOf(item: any): string {
    const t = item?.title || item?.name || item?.userPreferred;
    if (typeof t === "string" && t) return t;
    if (t && typeof t === "object")
      return t.english || t.userPreferred || t.romaji || t.native || "Unknown";
    return "Unknown";
  }

  function untilLabel(airingAt: number): string {
    if (!airingAt) return "";
    const diff = airingAt * 1000 - Date.now();
    if (diff <= 0) return "Aired";
    const mins = Math.floor(diff / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d > 0) return `in ${d}d ${h}h`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }

  async function load() {
    loading = true;
    try {
      const d = new Date(dateOptions[selectedIndex].date + "T00:00:00");
      const start = Math.floor(d.getTime() / 1000);
      const end = start + 86399;
      const res = await api.getAnilistSchedule(start, end);
      items = (res || []).filter((a: any) => a?.airingAt);
    } catch {
      items = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    selectedIndex;
    load();
  });
</script>

<section class="airing-section">
  <div class="airing-head">
    <div class="airing-titles">
      <span class="airing-sub">Estimated</span>
      <a href="/schedule" class="airing-title">Airing Schedule →</a>
    </div>
    <div class="airing-days">
      {#each dateOptions as opt, i}
        <button
          class="airing-day"
          class:active={selectedIndex === i}
          onclick={() => (selectedIndex = i)}
        >
          <span class="ad-label">{opt.label}</span>
          <span class="ad-sub">{opt.sub}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if loading}
    <div class="airing-scroll">
      {#each Array(8) as _, i (i)}
        <div class="airing-skel"></div>
      {/each}
    </div>
  {:else if items.length === 0}
    <p class="airing-empty">No episodes estimated for this day.</p>
  {:else}
    <div class="airing-scroll">
      {#each items as a (a.id || a.mal_id)}
        <a class="airing-card" href={`/anime/${a.id || a.mal_id}`}>
          <div class="ac-thumb">
            <img
              src={getProxiedImage(a.poster || a.image)}
              alt={titleOf(a)}
              loading="lazy"
            />
            <span class="ac-ep">EP {a.episode}</span>
          </div>
          <span class="ac-title">{titleOf(a)}</span>
          <span class="ac-time">
            <Clock size={11} /> {untilLabel(a.airingAt)}
          </span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .airing-section {
    padding: 0.5rem 1rem 0;
    margin-top: 1.5rem;
  }
  .airing-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
  }
  .airing-titles {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .airing-sub {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--net-text-muted, #888);
  }
  .airing-title {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--net-text, #fff);
    text-decoration: none;
  }
  .airing-title:hover {
    color: var(--net-red, #e50914);
  }
  .airing-days {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    max-width: 100%;
  }
  .airing-days::-webkit-scrollbar {
    display: none;
  }
  .airing-day {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 0.35rem 0.7rem;
    background: var(--net-card-bg, #181818);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: var(--net-text-muted, #999);
    cursor: pointer;
    transition: all 0.18s ease;
    font-family: inherit;
  }
  .airing-day:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.18);
  }
  .airing-day.active {
    background: var(--net-red, #e50914);
    border-color: var(--net-red, #e50914);
    color: #fff;
  }
  .ad-label {
    font-size: 0.78rem;
    font-weight: 700;
  }
  .ad-sub {
    font-size: 0.62rem;
    opacity: 0.75;
  }

  .airing-scroll {
    display: flex;
    gap: 0.85rem;
    overflow-x: auto;
    padding: 0.25rem 0 0.75rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
  }
  .airing-scroll::-webkit-scrollbar {
    display: none;
  }
  .airing-card {
    flex-shrink: 0;
    width: 160px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    text-decoration: none;
    scroll-snap-align: start;
  }
  .ac-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 10px;
    overflow: hidden;
    background: var(--net-card-bg, #181818);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .ac-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  .airing-card:hover .ac-thumb img {
    transform: scale(1.06);
  }
  .ac-ep {
    position: absolute;
    bottom: 6px;
    left: 6px;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 5px;
  }
  .ac-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--net-text, #fff);
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ac-time {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--net-red, #e50914);
  }
  .airing-empty {
    color: var(--net-text-muted, #888);
    font-size: 0.9rem;
    padding: 0.5rem 0 1rem;
  }
  .airing-skel {
    flex-shrink: 0;
    width: 160px;
    height: 280px;
    border-radius: 10px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.07),
      rgba(255, 255, 255, 0.04)
    );
    background-size: 200% 100%;
    animation: ascr 1.4s infinite;
  }
  @keyframes ascr {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .airing-skel {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .airing-section {
      padding: 0.5rem 0.75rem 0;
    }
    .airing-title {
      font-size: 1.15rem;
    }
    .airing-card,
    .airing-skel {
      width: clamp(150px, 42vw, 200px);
    }
    .airing-skel {
      height: 320px;
    }
  }
  @media (max-width: 480px) {
    .airing-card,
    .airing-skel {
      width: clamp(140px, 44vw, 180px);
    }
    .airing-skel {
      height: 300px;
    }
    .airing-title {
      font-size: 1rem;
    }
  }
</style>
