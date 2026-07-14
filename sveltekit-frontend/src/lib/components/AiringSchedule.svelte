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
      <div class="title-row">
        <span class="live-dot" aria-hidden="true"></span>
        <span class="airing-sub">This week</span>
      </div>
      <div class="title-main">
        <h2 class="airing-heading">Airing Schedule</h2>
        <a href="/schedule" class="airing-link">Full calendar →</a>
      </div>
    </div>
  </div>

  <div class="airing-days" role="tablist" aria-label="Pick a day">
    {#each dateOptions as opt, i}
      <button
        class="airing-day"
        class:active={selectedIndex === i}
        role="tab"
        aria-selected={selectedIndex === i}
        onclick={() => (selectedIndex = i)}
      >
        <span class="ad-label">{opt.label}</span>
        <span class="ad-sub">{opt.sub}</span>
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="airing-scroll">
      {#each Array(8) as _, i (i)}
        <div class="airing-skel"></div>
      {/each}
    </div>
  {:else if items.length === 0}
    <div class="airing-empty">
      <p>No episodes estimated for this day.</p>
      <a href="/schedule">Browse full schedule</a>
    </div>
  {:else}
    <div class="airing-scroll">
      {#each items as a (a.id || a.mal_id)}
        <a class="airing-card" href={`/anime/${a.id || a.mal_id}`}>
          <div class="ac-thumb">
            <img
              src={getProxiedImage(a.poster || a.image)}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div class="ac-shade" aria-hidden="true"></div>
            <span class="ac-ep">EP {a.episode}</span>
            <span class="ac-time">
              <Clock size={10} />
              {untilLabel(a.airingAt)}
            </span>
          </div>
          <span class="ac-title">{titleOf(a)}</span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .airing-section {
    margin-top: 0.5rem;
    padding: 1.15rem 0 0.35rem;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 55%,
      transparent 100%
    );
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .airing-head {
    padding: 0 1rem;
    margin-bottom: 0.85rem;
  }
  .airing-titles {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.55);
    animation: pulse-live 1.8s ease-out infinite;
  }
  @keyframes pulse-live {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
    }
    70% {
      box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }
  .airing-sub {
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(34, 197, 94, 0.95);
  }
  .title-main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .airing-heading {
    margin: 0;
    font-size: 1.18rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
    line-height: 1.15;
  }
  .airing-link {
    font-size: 0.78rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.65);
    text-decoration: none;
    white-space: nowrap;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    transition:
      color 0.2s,
      border-color 0.2s,
      background 0.2s;
  }
  .airing-link:hover {
    color: #fff;
    border-color: rgba(229, 9, 20, 0.4);
    background: rgba(229, 9, 20, 0.12);
  }

  .airing-days {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 0 1rem 0.9rem;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }
  .airing-days::-webkit-scrollbar {
    display: none;
  }
  .airing-day {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 4.1rem;
    min-height: 48px;
    padding: 0.45rem 0.7rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      transform 0.15s ease,
      box-shadow 0.18s ease;
    font-family: inherit;
    scroll-snap-align: start;
  }
  .airing-day:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.07);
  }
  .airing-day.active {
    background: linear-gradient(145deg, #FF8A3D 0%, #b20710 100%);
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
    box-shadow:
      0 8px 20px rgba(229, 9, 20, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
  }
  .airing-day:active {
    transform: scale(0.96);
  }
  .ad-label {
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .ad-sub {
    font-size: 0.6rem;
    font-weight: 600;
    opacity: 0.78;
  }

  .airing-scroll {
    display: flex;
    gap: 0.85rem;
    overflow-x: auto;
    padding: 0.15rem 1rem 1rem;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
  .airing-scroll::-webkit-scrollbar {
    display: none;
  }
  .airing-card {
    flex-shrink: 0;
    width: 148px;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-decoration: none;
    scroll-snap-align: start;
    -webkit-tap-highlight-color: transparent;
  }
  .ac-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 13px;
    overflow: hidden;
    background: #141416;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 10px 24px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      transform 0.18s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }
  .ac-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
  }
  .ac-shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.78) 0%,
      rgba(0, 0, 0, 0.15) 42%,
      transparent 60%
    );
  }
  @media (hover: hover) and (pointer: fine) {
    .airing-card:hover .ac-thumb {
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow:
        0 14px 28px rgba(0, 0, 0, 0.5),
        0 0 18px rgba(229, 9, 20, 0.12);
    }
    .airing-card:hover .ac-thumb img {
      transform: scale(1.06);
    }
    .airing-card:hover .ac-title {
      color: #fff;
    }
  }
  .airing-card:active .ac-thumb {
    transform: scale(0.97);
    border-color: rgba(255, 138, 61, 0.55);
  }
  .ac-ep {
    position: absolute;
    bottom: 8px;
    left: 7px;
    z-index: 2;
    background: rgba(8, 8, 10, 0.8);
    color: #fff;
    font-size: 0.62rem;
    font-weight: 800;
    padding: 0.18rem 0.45rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .ac-time {
    position: absolute;
    top: 7px;
    right: 7px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.58rem;
    font-weight: 800;
    color: #fff;
    background: rgba(229, 9, 20, 0.9);
    padding: 0.2rem 0.4rem;
    border-radius: 999px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    letter-spacing: 0.01em;
  }
  .ac-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #ececf0;
    line-height: 1.28;
    min-height: 2.05em;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    letter-spacing: -0.01em;
    transition: color 0.2s;
  }
  .airing-empty {
    color: var(--net-text-muted, #888);
    font-size: 0.88rem;
    padding: 0.75rem 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .airing-empty a {
    color: #fff;
    font-weight: 700;
    font-size: 0.82rem;
    text-decoration: none;
  }
  .airing-empty a:hover {
    color: var(--net-red, #FF8A3D);
  }
  .airing-skel {
    flex-shrink: 0;
    width: 148px;
    aspect-ratio: 2 / 3;
    border-radius: 13px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.08),
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
    .airing-skel,
    .live-dot {
      animation: none;
    }
    .ac-thumb,
    .ac-thumb img,
    .airing-day {
      transition: none;
    }
  }

  @media (max-width: 768px) {
    .airing-section {
      margin-top: 0.25rem;
      padding-top: 1rem;
    }
    .airing-head {
      padding: 0 0.9rem;
      margin-bottom: 0.7rem;
    }
    .airing-heading {
      font-size: 1.08rem;
    }
    .airing-link {
      font-size: 0.72rem;
      padding: 0.3rem 0.55rem;
    }
    .airing-days {
      padding: 0 0.9rem 0.8rem;
      gap: 0.35rem;
    }
    .airing-day {
      min-width: 3.7rem;
      min-height: 46px;
      border-radius: 11px;
      padding: 0.4rem 0.55rem;
    }
    .airing-scroll {
      gap: 0.7rem;
      padding: 0.1rem 0.9rem 0.95rem;
    }
    .airing-card,
    .airing-skel {
      width: clamp(132px, 38vw, 160px);
    }
    .ac-thumb,
    .airing-skel {
      border-radius: 12px;
    }
  }
  @media (max-width: 480px) {
    .airing-section {
      padding-top: 0.9rem;
    }
    .airing-head {
      padding: 0 0.75rem;
    }
    .airing-heading {
      font-size: 1.02rem;
    }
    .airing-days {
      padding: 0 0.75rem 0.75rem;
      gap: 0.3rem;
    }
    .airing-day {
      min-width: 3.35rem;
      min-height: 44px;
      padding: 0.35rem 0.45rem;
      border-radius: 10px;
    }
    .ad-label {
      font-size: 0.72rem;
    }
    .ad-sub {
      font-size: 0.56rem;
    }
    .airing-scroll {
      gap: 0.65rem;
      padding: 0.05rem 0.75rem 0.85rem;
    }
    .airing-card,
    .airing-skel {
      width: clamp(124px, 40vw, 152px);
    }
    .ac-thumb,
    .airing-skel {
      border-radius: 11px;
    }
    .ac-title {
      font-size: 0.74rem;
    }
    .ac-time {
      font-size: 0.54rem;
      top: 6px;
      right: 6px;
    }
    .ac-ep {
      bottom: 7px;
      left: 6px;
      font-size: 0.58rem;
    }
  }
  @media (max-width: 360px) {
    .airing-card,
    .airing-skel {
      width: 40vw;
    }
    .airing-days,
    .airing-scroll,
    .airing-head {
      padding-inline: 0.65rem;
    }
  }
</style>
