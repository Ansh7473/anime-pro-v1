<script lang="ts">
  import { getProxiedImage } from "$lib/api";
  import { Play, ChevronDown, LayoutGrid, List } from "lucide-svelte";

  let {
    episodes = [],
    ep = 0,
    currentEpPage = 0,
    recommendations = [],
    relations = [],
    onChangeEp,
    onGoToPage,
  } = $props<{
    episodes: any[];
    ep: number;
    currentEpPage: number;
    recommendations: any[];
    relations: any[];
    onChangeEp: (n: number) => void;
    onGoToPage: (i: number) => void;
  }>();

  const EPISODES_PER_PAGE = 50;

  let epView = $state<"grid" | "list">("grid");
  let epFilter = $state("");

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

  function titleOf(item: any): string {
    const t = item?.title || item?.name || item?.userPreferred;
    if (typeof t === "string" && t) return t;
    if (t && typeof t === "object")
      return t.english || t.userPreferred || t.romaji || t.native || "Unknown";
    return "Unknown";
  }
</script>

<!-- Episodes -->
<div class="rail-panel side-episodes">
  <div class="ep-panel-head">
    <div class="ep-panel-title">
      <Play size={14} />
      <span>Episodes</span>
      <span class="ep-panel-count">{episodes.length}</span>
    </div>
    <div class="ep-panel-controls">
      {#if totalPages > 1}
        <div class="ep-range-wrap">
          <select
            class="ep-range-select"
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
          onclick={() => (epView = "grid")}
        >
          <LayoutGrid size={14} />
        </button>
        <button
          class:on={epView === "list"}
          title="List view"
          aria-label="List view"
          onclick={() => (epView = "list")}
        >
          <List size={14} />
        </button>
      </div>
    </div>
  </div>

  <div class="ep-filter-row">
    <input
      class="ep-filter-input"
      type="text"
      placeholder="Filter episodes…"
      bind:value={epFilter}
    />
  </div>

  {#if epView === "grid"}
    <div class="ep-number-grid">
      {#each filteredEpisodes as episode}
        <button
          class="ep-num-btn"
          class:current={episode.number === ep}
          class:watched={(episode.progressPercent || 0) >= 85}
          class:partial={(episode.progressPercent || 0) > 0 &&
            (episode.progressPercent || 0) < 85}
          class:filler={episode.isFiller}
          title={episode.title || `Episode ${episode.number}`}
          onclick={() => onChangeEp(episode.number)}
        >
          {episode.number}
        </button>
      {/each}
    </div>
  {:else}
    <div class="ep-list">
      {#each filteredEpisodes as episode}
        <button
          class="ep-list-item"
          class:current={episode.number === ep}
          class:watched={(episode.progressPercent || 0) >= 85}
          onclick={() => onChangeEp(episode.number)}
        >
          <span class="eli-num">{episode.number}</span>
          <span class="eli-title line-clamp-1">
            {episode.title || `Episode ${episode.number}`}
          </span>
          {#if episode.isFiller}<span class="eli-filler">Filler</span>{/if}
          {#if episode.number === ep}<span class="eli-play"
              ><Play size={11} fill="currentColor" /></span
            >{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if relations?.length}
  <div class="rail-panel rail-section">
    <div class="rail-head"><span>Related</span></div>
    <div class="rail-list">
      {#each relations.slice(0, 10) as item}
        <a class="rail-item" href={`/anime/${item.id || item.mal_id}`}>
          <img
            class="rail-thumb"
            src={getProxiedImage(item.poster || item.image)}
            alt={titleOf(item)}
            loading="lazy"
          />
          <div class="rail-item-body">
            <span class="rail-item-title line-clamp-2">{titleOf(item)}</span>
            <span class="rail-item-meta">
              {item.type || item.format || "Anime"}{item.episodes
                ? ` · ${item.episodes} eps`
                : ""}
            </span>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}

{#if recommendations.length}
  <div class="rail-panel rail-section">
    <div class="rail-head"><span>Recommendations</span></div>
    <div class="rail-list">
      {#each recommendations.slice(0, 12) as item}
        <a class="rail-item" href={`/anime/${item.id || item.mal_id}`}>
          <img
            class="rail-thumb"
            src={getProxiedImage(item.poster || item.image)}
            alt={titleOf(item)}
            loading="lazy"
          />
          <div class="rail-item-body">
            <span class="rail-item-title line-clamp-2">{titleOf(item)}</span>
            <span class="rail-item-meta">
              {item.type || item.format || "Anime"}{item.episodes
                ? ` · ${item.episodes} eps`
                : ""}
            </span>
          </div>
        </a>
      {/each}
    </div>
  </div>
{/if}

<style>
  .rail-panel {
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 0.85rem;
  }

  /* Episode panel header */
  .ep-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.65rem;
    border-bottom: 1px solid var(--hairline);
  }
  .ep-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--txt);
  }
  .ep-panel-title :global(svg) {
    color: var(--accent);
  }
  .ep-panel-count {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--txt-dim);
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    padding: 0.05rem 0.4rem;
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
    background: var(--surface-btn);
    color: var(--txt);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    padding: 0.34rem 1.5rem 0.34rem 0.55rem;
    font-size: 0.74rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .ep-range-select option {
    background: #141414;
    color: var(--txt);
  }
  .ep-range-wrap :global(.ptr-none) {
    position: absolute;
    right: 6px;
    pointer-events: none;
    color: var(--txt-dim);
  }
  .ep-view-toggle {
    display: inline-flex;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    overflow: hidden;
  }
  .ep-view-toggle button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 28px;
    background: transparent;
    color: var(--txt-dim);
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }
  .ep-view-toggle button.on {
    background: var(--accent);
    color: #fff;
  }
  .ep-view-toggle button:not(.on):hover {
    background: var(--surface-btn-hover);
    color: var(--txt);
  }

  /* Filter + grid */
  .ep-filter-row {
    margin-bottom: 0.6rem;
  }
  .ep-filter-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    padding: 0.5rem 0.7rem;
    color: var(--txt);
    font-size: 0.8rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.18s ease;
  }
  .ep-filter-input::placeholder {
    color: var(--txt-dim);
  }
  .ep-filter-input:focus {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  }
  .ep-number-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }
  .ep-num-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 30px;
    background: var(--surface-2);
    color: var(--txt-dim);
    border: 1px solid transparent;
    border-radius: var(--radius-inner);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      border-color 0.15s ease;
  }
  .ep-num-btn:hover {
    background: var(--surface-btn-hover);
    color: var(--txt);
  }
  .ep-num-btn.partial {
    color: var(--txt);
  }
  .ep-num-btn.watched {
    background: color-mix(in srgb, #e49335 22%, var(--surface-2));
    color: #e7b780;
  }
  .ep-num-btn.filler {
    border-color: rgba(255, 165, 0, 0.3);
  }
  .ep-num-btn.current {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  /* List view */
  .ep-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 48vh;
    overflow-y: auto;
    padding-right: 3px;
  }
  .ep-list-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.55rem;
    background: var(--surface-2);
    border: 1px solid transparent;
    border-radius: var(--radius-inner);
    text-align: left;
    transition: background 0.15s ease;
  }
  .ep-list-item:hover {
    background: var(--surface-btn-hover);
  }
  .eli-num {
    flex-shrink: 0;
    min-width: 26px;
    text-align: center;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--txt-dim);
  }
  .eli-title {
    flex: 1;
    min-width: 0;
    font-size: 0.8rem;
    color: var(--txt-muted);
  }
  .eli-filler {
    flex-shrink: 0;
    font-size: 0.6rem;
    font-weight: 700;
    color: #ffa500;
    border: 1px solid rgba(255, 165, 0, 0.35);
    border-radius: 4px;
    padding: 0.05rem 0.35rem;
    text-transform: uppercase;
  }
  .eli-play {
    flex-shrink: 0;
    color: var(--accent);
    display: inline-flex;
  }
  .ep-list-item.current {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .ep-list-item.current .eli-num,
  .ep-list-item.current .eli-title {
    color: var(--txt);
  }
  .ep-list-item.watched .eli-num {
    color: #e7b780;
  }

  /* Rail lists */
  .rail-head {
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--txt);
    margin-bottom: 0.7rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--hairline);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .rail-head::before {
    content: "";
    width: 3px;
    height: 0.9em;
    border-radius: 999px;
    background: var(--accent);
  }
  .rail-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .rail-item {
    display: flex;
    gap: 0.6rem;
    padding: 0.35rem;
    border-radius: var(--radius-inner);
    transition: background 0.15s ease;
  }
  .rail-item:hover {
    background: var(--surface-2);
  }
  .rail-thumb {
    width: 46px;
    height: 64px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
    background: var(--surface-2);
  }
  .rail-item-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.2rem;
  }
  .rail-item-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--txt);
    line-height: 1.3;
  }
  .rail-item-meta {
    font-size: 0.7rem;
    color: var(--txt-dim);
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  @media (max-width: 1100px) {
    .rail-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.5rem;
    }
    .ep-list {
      max-height: 60vh;
    }
  }
  @media (max-width: 768px) {
    .ep-number-grid {
      grid-template-columns: repeat(6, 1fr);
    }
  }
  @media (max-width: 640px) {
    .rail-list {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }
    .rail-thumb {
      width: 40px;
      height: 56px;
    }
  }
  @media (max-width: 480px) {
    .ep-number-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }
  @media (max-width: 400px) {
    .rail-list {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
