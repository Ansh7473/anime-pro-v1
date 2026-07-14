<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { Play, ChevronDown, LayoutGrid, List } from "lucide-svelte";
  import { onMount } from "svelte";

  let {
    episodes = [],
    ep = 0,
    currentEpPage = 0,
    anime = null,
    onChangeEp,
    onGoToPage,
  } = $props<{
    episodes: any[];
    ep: number;
    currentEpPage: number;
    anime: any;
    onChangeEp: (n: number) => void;
    onGoToPage: (i: number) => void;
  }>();

  const EPISODES_PER_PAGE = 50;

  let epView = $state<"grid" | "list">("list");
  let epFilter = $state("");

  let currentEpEl: HTMLElement | null = $state(null);

  function refCurrent(node: HTMLElement, isCurrent: boolean) {
    if (isCurrent) currentEpEl = node;
    return {
      update(c: boolean) {
        if (c) currentEpEl = node;
        else if (currentEpEl === node) currentEpEl = null;
      },
      destroy() {
        if (currentEpEl === node) currentEpEl = null;
      },
    };
  }

  $effect(() => {
    void ep;
    void currentEpPage;
    currentEpEl?.scrollIntoView({ block: "nearest" });
  });

  onMount(() => {
    const mq = window.matchMedia("(max-width: 1100px)");
    const sync = () => { epView = mq.matches ? "grid" : "list"; };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  });

  let totalPages = $derived(Math.ceil(episodes.length / EPISODES_PER_PAGE));
  let epPageRanges = $derived.by(() => {
    const ranges: { index: number; label: string }[] = [];
    for (let i = 0; i < totalPages; i++) {
      const start = i * EPISODES_PER_PAGE + 1;
      const end = Math.min((i + 1) * EPISODES_PER_PAGE, episodes.length);
      ranges.push({ index: i, label: `${start}-${end}` });
    }
    return ranges;
  });
  let displayedEpisodes = $derived.by(() => {
    const start = currentEpPage * EPISODES_PER_PAGE;
    return episodes.slice(start, start + EPISODES_PER_PAGE);
  });
  let filteredEpisodes = $derived.by(() => {
    const q = epFilter.trim().toLowerCase();
    if (!q) return displayedEpisodes;
    return displayedEpisodes.filter(
      (e: any) =>
        String(e.number).includes(q) ||
        (e.title || "").toLowerCase().includes(q),
    );
  });
</script>

<!-- Episodes Panel -->
<div class="rail-panel side-episodes">
  <div class="ep-panel-head">
    <div class="ep-panel-title">
      <Play size={13} fill="currentColor" />
      <span>Episodes</span>
      <span class="ep-panel-count">{episodes.length}</span>
    </div>
    <div class="ep-panel-controls">
      {#if totalPages > 1}
        <div class="ep-range-wrap">
          <select
            class="ep-range-select"
            aria-label="Episode range"
            value={currentEpPage}
            onchange={(e) => onGoToPage(parseInt(e.currentTarget.value))}
          >
            {#each epPageRanges as range}
              <option value={range.index}>{range.label}</option>
            {/each}
          </select>
          <ChevronDown size={12} class="ptr-none" />
        </div>
      {/if}
      <div class="ep-view-toggle">
        <button
          class:on={epView === "grid"}
          title="Grid view"
          aria-label="Grid view"
          aria-pressed={epView === "grid"}
          onclick={() => (epView = "grid")}
        >
          <LayoutGrid size={13} />
        </button>
        <button
          class:on={epView === "list"}
          title="List view"
          aria-label="List view"
          aria-pressed={epView === "list"}
          onclick={() => (epView = "list")}
        >
          <List size={13} />
        </button>
      </div>
    </div>
  </div>

  <div class="ep-filter-row">
    <input
      class="ep-filter-input"
      type="text"
      placeholder="Filter episodes…"
      aria-label="Filter episodes"
      bind:value={epFilter}
    />
  </div>

  {#if epView === "grid"}
    <nav aria-label="Episodes">
      <ul class="ep-number-grid">
        {#each filteredEpisodes as episode}
          <li>
            <button
              class="ep-num-btn"
              class:current={episode.number === ep}
              class:watched={(episode.progressPercent || 0) >= 85}
              class:partial={(episode.progressPercent || 0) > 0 &&
                (episode.progressPercent || 0) < 85}
              class:filler={episode.isFiller}
              aria-current={episode.number === ep ? "true" : undefined}
              title={episode.title || `Episode ${episode.number}`}
              use:refCurrent={episode.number === ep}
              onclick={() => onChangeEp(episode.number)}
            >
              {episode.number}
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  {:else}
    <nav aria-label="Episodes">
      <ul class="ep-list">
        {#each filteredEpisodes as episode}
          <li>
            <button
              class="ep-card"
              class:current={episode.number === ep}
              class:watched={(episode.progressPercent || 0) >= 85}
              aria-current={episode.number === ep ? "true" : undefined}
              use:refCurrent={episode.number === ep}
              onclick={() => onChangeEp(episode.number)}
            >
              <!-- Thumbnail on left -->
              <div class="ep-card-thumb-wrap">
                <img
                  class="ep-card-thumb"
                  src={getProxiedImage(episode.image || episode.thumbnail || anime?.image || anime?.poster || "/static/favicon-192.png")}
                  alt={episode.title || `Episode ${episode.number}`}
                  loading="lazy"
                />
                <span class="ep-card-badge">EP {episode.number}</span>
              </div>

              <!-- Content on right -->
              <div class="ep-card-body">
                <div class="ep-card-title-row">
                  <span class="ep-card-title">{episode.title || `Episode ${episode.number}`}</span>
                </div>
                <p class="ep-card-desc">
                  {episode.description || episode.synopsis || "No description available for this episode."}
                </p>
                <div class="ep-card-meta">
                  <div class="ep-card-audio">
                    <span class="ep-card-icon-tag" title="Subbed">
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </span>
                    <span class="ep-card-icon-tag" title="Dubbed">
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    </span>
                  </div>
                  {#if episode.airDate || episode.releaseDate}
                    <span class="ep-card-date">{episode.airDate || episode.releaseDate}</span>
                  {/if}
                </div>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  {/if}

  <!-- Next Airing Countdown Banner -->
  {#if anime?.nextAiringEpisode}
    {@const nextEp = anime.nextAiringEpisode}
    {@const airDate = new Date(nextEp.airingAt * 1000)}
    {@const days = Math.floor(nextEp.timeUntilAiring / 86400)}
    {@const hours = Math.floor((nextEp.timeUntilAiring % 86400) / 3600)}
    <div class="next-ep-countdown">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      <span>Episode {nextEp.episode} in {days > 0 ? `${days}d ` : ""}{hours}h · {airDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
    </div>
  {/if}
</div>

<style>
  .rail-panel {
    background: #09090d;
    padding: 0.85rem;
    height: 100%;
    align-self: stretch;
    display: flex;
    flex-direction: column;
  }

  /* Episode panel header */
  .ep-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  .ep-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    font-weight: 800;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .ep-panel-title :global(svg) {
    color: var(--accent, #FF8A3D);
  }
  .ep-panel-count {
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.05rem 0.45rem;
    border-radius: 999px;
  }
  .ep-panel-controls {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .ep-range-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .ep-range-select {
    appearance: none;
    -webkit-appearance: none;
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 0.3rem 1.4rem 0.3rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .ep-range-select option {
    background: #141414;
    color: #fff;
  }
  .ep-range-wrap :global(.ptr-none) {
    position: absolute;
    right: 6px;
    pointer-events: none;
    color: rgba(255, 255, 255, 0.4);
  }
  .ep-view-toggle {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    overflow: hidden;
  }
  .ep-view-toggle button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.2s;
  }
  .ep-view-toggle button.on {
    background: var(--accent, #FF8A3D);
    color: #fff;
  }
  .ep-view-toggle button:not(.on):hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }

  /* Filter */
  .ep-filter-row {
    margin-bottom: 0.6rem;
  }
  .ep-filter-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    color: #fff;
    font-size: 0.75rem;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
  }
  .ep-filter-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
  .ep-filter-input:focus {
    border-color: rgba(255, 138, 61, 0.3);
    background: rgba(255, 255, 255, 0.05);
  }

  /* Grid view */
  .ep-number-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.35rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .ep-num-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 28px;
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    font-family: inherit;
    transition: all 0.2s;
  }
  .ep-num-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .ep-num-btn.watched {
    background: rgba(229, 9, 20, 0.1);
    color: var(--accent, #FF8A3D);
    border-color: rgba(229, 9, 20, 0.15);
  }
  .ep-num-btn.current {
    background: var(--accent, #FF8A3D);
    color: #fff;
    border-color: var(--accent, #FF8A3D);
  }

  /* Card / List view */
  .ep-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    list-style: none;
    margin: 0;
    padding: 0;
    padding-right: 2px;
  }

  .ep-card {
    display: flex;
    gap: 0.65rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    text-align: left;
    transition: all 0.25s ease;
    cursor: pointer;
    width: 100%;
    min-width: 0;
  }
  .ep-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .ep-card-thumb-wrap {
    position: relative;
    width: 100px;
    height: 56px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .ep-card-thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .ep-card-badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
    font-size: 0.55rem;
    font-weight: 800;
  }
  .ep-card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .ep-card-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.4rem;
  }
  .ep-card-title {
    font-size: 0.78rem;
    font-weight: 700;
    color: #e8e8e8;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ep-card-desc {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.35);
    line-height: 1.35;
    margin: 0.15rem 0 0.3rem;
    display: -webkit-box;
    -webkit-line-clamp: 1; /* Match sleek 1-line layout or 2-lines depending on space */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ep-card-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.3);
  }
  .ep-card-audio {
    display: flex;
    gap: 0.25rem;
  }
  .ep-card-icon-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.4);
  }
  .ep-card-date {
    font-weight: 600;
  }

  /* Active/Current state: Brand red glow */
  .ep-card.current {
    background: rgba(229, 9, 20, 0.10) !important;
    border-color: rgba(229, 9, 20, 0.4) !important;
    box-shadow: 0 0 12px rgba(229, 9, 20, 0.15);
  }
  .ep-card.current .ep-card-title {
    color: var(--accent, #FF8A3D);
  }
  .ep-card.current .ep-card-badge {
    background: #FF8A3D;
    color: #fff;
  }
  .ep-card.current .ep-card-icon-tag {
    background: rgba(255, 138, 61, 0.22);
    color: #f40612;
  }

  /* Next airing countdown banner */
  .next-ep-countdown {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(217, 160, 28, 0.08);
    border: 1px solid rgba(217, 160, 28, 0.2);
    color: #e2b13c;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 750;
    margin-top: 0.65rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .next-ep-countdown svg {
    color: #d9a01c;
    flex-shrink: 0;
  }

  @media (max-width: 1100px) {
    .ep-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.75rem;
      flex: none;
      max-height: none;
    }
    .ep-number-grid {
      max-height: 40vh;
    }
  }
  @media (max-width: 768px) {
    .ep-number-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }
  @media (max-width: 480px) {
    .ep-number-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }
</style>
