<script lang="ts">
  import { Server, ChevronDown } from "lucide-svelte";

  let {
    sources = [],
    groupedSources = {},
    selectedSource = null,
    onSelect,
  } = $props<{
    sources: any[];
    groupedSources: Record<string, any>;
    selectedSource: any;
    onSelect: (src: any) => void;
  }>();

  let openProvider = $state<string | null>(null);

  // Explicitly typed so each-block destructuring doesn't degrade to `unknown`.
  let providerEntries = $derived(
    Object.entries(groupedSources ?? {}) as Array<
      [string, Record<string, any[]>]
    >,
  );
</script>

<div class="server-selection">
  <div class="server-header">
    <div class="server-title-group">
      <div class="server-icon-wrapper">
        <Server size={18} class="server-icon" />
      </div>
      <div>
        <h3>Select Server</h3>
        <p class="server-subtitle">Choose your preferred streaming source</p>
      </div>
    </div>
    <div class="server-stats">
      <div class="stat-badge">
        <span class="stat-number">{sources.length}</span>
        <span class="stat-label">Sources</span>
      </div>
      <div class="stat-badge">
        <span class="stat-number">{Object.keys(groupedSources).length}</span>
        <span class="stat-label">Providers</span>
      </div>
    </div>
  </div>

  <div class="provider-grid">
    {#each providerEntries as [provider, categories]}
      <div class="provider-card" class:open={openProvider === provider}>
        <button
          class="provider-toggle"
          onclick={() =>
            (openProvider = openProvider === provider ? null : provider)}
          aria-expanded={openProvider === provider}
        >
          <span class="prov-name">{provider}</span>
          <span class="provider-summary">
            {Object.values(categories).reduce(
              (sum: number, list: any[]) => sum + list.length,
              0,
            )} sources
            <ChevronDown
              size={15}
              class={`provider-chevron ${openProvider === provider ? "rotated" : ""}`}
            />
          </span>
        </button>
        <div class="provider-sources" class:expanded={openProvider === provider}>
          <div class="quality-tabs">
            {#each Object.entries(categories) as [category, categorySources]}
              <div class="category-group">
                <span class="cat-label">{category}</span>
                <div class="source-chips">
                  {#each categorySources as src}
                    <button
                      class="source-chip"
                      class:active={selectedSource?.url === src.url}
                      onclick={() => onSelect(src)}
                    >
                      {src.name || "Default"}
                      {#if src.quality}<span class="q">{src.quality}</span>{/if}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .server-selection {
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 0.85rem;
  }

  .server-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--hairline);
    gap: 1rem;
  }
  .server-title-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .server-icon-wrapper {
    width: 38px;
    height: 38px;
    background: var(--surface-btn);
    border: 1px solid var(--hairline);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .server-title-group :global(.server-icon) {
    color: var(--accent);
  }
  .server-title-group h3 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    color: var(--txt);
  }
  .server-subtitle {
    font-size: 0.78rem;
    color: var(--txt-dim);
    margin: 0;
  }
  .server-stats {
    display: flex;
    gap: 0.6rem;
  }
  .stat-badge {
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 70px;
  }
  .stat-number {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .stat-label {
    font-size: 0.65rem;
    color: var(--txt-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 0.75rem;
  }
  .provider-card {
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 0.85rem 1rem;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .provider-card:hover {
    background: var(--surface-card);
    border-color: var(--hairline-strong);
  }
  .provider-card.open {
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  }
  .provider-toggle {
    width: 100%;
    border: none;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0;
    cursor: pointer;
  }
  .prov-name {
    font-size: 0.82rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--txt);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .prov-name::before {
    content: "▶";
    color: var(--accent);
    font-size: 0.6rem;
  }
  .provider-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--txt-dim);
    font-size: 0.74rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .provider-summary :global(.provider-chevron) {
    transition: transform 0.25s ease;
  }
  .provider-summary :global(.provider-chevron.rotated) {
    transform: rotate(180deg);
  }
  .provider-sources {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition:
      max-height 0.35s ease,
      opacity 0.25s ease,
      margin-top 0.25s ease;
  }
  .provider-sources.expanded {
    max-height: 900px;
    opacity: 1;
    margin-top: 0.85rem;
  }
  .category-group {
    margin-bottom: 0.75rem;
    padding: 0.65rem;
    background: var(--surface-1);
    border-radius: var(--radius-inner);
    border: 1px solid var(--hairline);
  }
  .category-group:last-child {
    margin-bottom: 0;
  }
  .cat-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.65rem;
    padding: 3px 9px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: color-mix(in srgb, var(--accent) 70%, #fff);
  }
  .cat-label::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .source-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .source-chip {
    padding: 9px 14px;
    background: var(--surface-btn);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    color: var(--txt);
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .source-chip:hover {
    background: var(--surface-btn-hover);
    border-color: var(--hairline-strong);
  }
  .source-chip.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .source-chip .q {
    font-size: 0.68rem;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 5px;
    text-transform: uppercase;
    background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  :global(.tv-mode) .source-chip:focus-visible {
    background: #fff;
    color: #000;
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    .server-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .server-stats {
      width: 100%;
    }
    .stat-badge {
      flex: 1;
    }
    .provider-grid {
      grid-template-columns: 1fr;
    }
    .source-chip {
      min-height: 40px;
    }
  }
</style>
