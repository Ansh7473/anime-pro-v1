<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import { onMount } from "svelte";

  let {
    autoplay = true,
    autoSkip = false,
    autoNext = true,
    theaterMode = false,
    showShortcuts = false,
    isEmbedPlayer = false,
    ep = 1,
    totalEpisodes = 0,
    sources = [],
    selectedSource = null,
    audioCategories = [],
    selectedCategory = 'Sub',
    serversInCategory = [],
    sourceLabel = (src: any, i?: number) => 'Server',
    onSelectAudioCategory = (cat: string) => {},
    onSelectServerByUrl = (url: string) => {},
    onToggleAutoplay = () => {},
    onToggleAutoSkip = () => {},
    onToggleAutoNext = () => {},
    onToggleTheater = () => {},
    onToggleShortcuts = () => {},
    onPrevEp = () => {},
    onNextEp = () => {},
  }: {
    autoplay?: boolean;
    autoSkip?: boolean;
    autoNext?: boolean;
    theaterMode?: boolean;
    showShortcuts?: boolean;
    isEmbedPlayer?: boolean;
    ep?: number;
    totalEpisodes?: number;
    sources?: any[];
    selectedSource?: any;
    audioCategories?: string[];
    selectedCategory?: string;
    serversInCategory?: any[];
    sourceLabel?: (src: any, i?: number) => string;
    onSelectAudioCategory?: (cat: string) => void;
    onSelectServerByUrl?: (url: string) => void;
    onToggleAutoplay?: () => void;
    onToggleAutoSkip?: () => void;
    onToggleAutoNext?: () => void;
    onToggleTheater?: () => void;
    onToggleShortcuts?: () => void;
    onPrevEp?: () => void;
    onNextEp?: () => void;
  } = $props();

  let audioOpen = $state(false);
  let serverOpen = $state(false);

  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t?.closest?.('.etb-dd')) {
        audioOpen = false;
        serverOpen = false;
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  });
</script>

<div class="control-deck">
  <!-- Left Side: Checkboxes -->
  <div class="deck-toggles">
    <button class="deck-toggle" class:on={autoplay} aria-pressed={autoplay} onclick={onToggleAutoplay}>
      <span class="deck-checkbox">
        {#if autoplay}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </span>
      <span>Autoplay</span>
    </button>

    <button class="deck-toggle" class:on={autoSkip} aria-pressed={autoSkip} onclick={onToggleAutoSkip}>
      <span class="deck-checkbox">
        {#if autoSkip}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </span>
      <span>Auto Skip</span>
    </button>

    <button class="deck-toggle" class:on={autoNext} aria-pressed={autoNext} onclick={onToggleAutoNext}>
      <span class="deck-checkbox">
        {#if autoNext}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </span>
      <span>Auto Next</span>
    </button>

    <span class="deck-sep"></span>

    <button class="deck-toggle hide-mobile" class:on={showShortcuts} aria-pressed={showShortcuts} onclick={onToggleShortcuts}>
      <span class="deck-checkbox">
        {#if showShortcuts}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </span>
      <span>Shortcuts</span>
    </button>

    <button class="deck-toggle" class:on={theaterMode} aria-pressed={theaterMode} onclick={onToggleTheater}>
      <span class="deck-checkbox">
        {#if theaterMode}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
        {/if}
      </span>
      <span>Lights Off</span>
    </button>

    <span class="deck-sep"></span>

    <span class="deck-engine">
      <span class="deck-badge">{isEmbedPlayer ? 'Iframe' : 'Plyr'}</span>
    </span>
  </div>

  <!-- Right Side: Selectors & Navigation Actions -->
  <div class="deck-actions">
    {#if sources.length > 0}
      <div class="deck-selectors">
        <!-- Audio selector -->
        {#if audioCategories.length > 0}
          <div class="etb-dd" class:open={audioOpen}>
            <button
              class="etb-dd-trigger"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={audioOpen}
              aria-controls="audio-menu"
              aria-label="Audio language"
              onclick={() => { audioOpen = !audioOpen; serverOpen = false; }}
            >
              <span class="etb-select-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="dd-svg-icon" aria-hidden="true"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                AUDIO
              </span>
              <span class="etb-dd-value">
                <span class="etb-dd-text">{selectedCategory}</span>
                <ChevronDown size={12} class="etb-dd-caret" aria-hidden="true" />
              </span>
            </button>
            <div id="audio-menu" class="etb-dd-menu" role="listbox" aria-label="Audio language">
              {#each audioCategories as cat}
                <button
                  type="button"
                  class="etb-dd-opt"
                  class:sel={cat === selectedCategory}
                  role="option"
                  aria-selected={cat === selectedCategory}
                  onclick={() => { onSelectAudioCategory(cat); audioOpen = false; }}
                >{cat}</button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Server selector -->
        <div class="etb-dd etb-dd-server" class:open={serverOpen}>
          <button
            class="etb-dd-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={serverOpen}
            aria-controls="server-menu"
            aria-label="Server"
            onclick={() => { serverOpen = !serverOpen; audioOpen = false; }}
          >
            <span class="etb-select-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="dd-svg-icon" aria-hidden="true"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
              SERVER ({serversInCategory.length})
            </span>
            <span class="etb-dd-value">
              <span class="etb-dd-text">{selectedSource ? sourceLabel(selectedSource) : 'Select'}</span>
              <ChevronDown size={12} class="etb-dd-caret" aria-hidden="true" />
            </span>
          </button>
          <div id="server-menu" class="etb-dd-menu" role="listbox" aria-label="Server">
            {#each serversInCategory as src, i}
              <button
                type="button"
                class="etb-dd-opt"
                class:sel={selectedSource?.url === src.url}
                role="option"
                aria-selected={selectedSource?.url === src.url}
                onclick={() => { onSelectServerByUrl(src.url); serverOpen = false; }}
              >{sourceLabel(src, i)}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- Navigation -->
    <div class="deck-nav">
      {#if ep > 1}
        <button class="deck-nav-btn" onclick={onPrevEp}>
          &lsaquo;&lsaquo; Prev Episode
        </button>
      {/if}
      {#if ep > 1 && ep < totalEpisodes}
        <span class="deck-nav-sep">|</span>
      {/if}
      {#if ep < totalEpisodes}
        <button class="deck-nav-btn deck-nav-next" onclick={onNextEp}>
          Episode {ep + 1} &rsaquo;&rsaquo;
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .control-deck {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #09090d;
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-top: none;
    border-radius: 0 0 10px 10px;
    font-size: 0.72rem;
    font-weight: 750;
    user-select: none;
    position: relative;
    z-index: 30; /* Stacks above lower details cards */
  }

  .deck-toggles {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
  }

  .deck-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: rgba(255, 255, 255, 0.45);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    padding: 4px 6px;
    min-height: 32px;
    transition: color 0.2s;
  }
  .deck-toggle:hover {
    color: rgba(255, 255, 255, 0.85);
  }
  .deck-toggle.on {
    color: #fff;
  }

  /* Checkbox styling */
  .deck-checkbox {
    width: 14px;
    height: 14px;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.35);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    transition: all 0.2s;
  }
  .deck-toggle.on .deck-checkbox,
  .deck-checkbox.on {
    background: #FF8A3D;
    border-color: #FF8A3D;
    box-shadow: 0 0 8px rgba(229, 9, 20, 0.35);
  }

  .deck-sep {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
  }

  .deck-engine {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: rgba(255, 255, 255, 0.4);
    cursor: default;
  }

  .deck-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.5);
  }

  .deck-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .deck-selectors {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Dropdown dropdowns */
  .etb-dd { position: relative; z-index: 50; }
  .etb-dd-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    color: #fff;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 750;
    cursor: pointer;
    transition: all 0.2s;
  }
  .etb-dd-trigger:hover {
    background: rgba(229, 9, 20, 0.08);
    border-color: rgba(255, 138, 61, 0.3);
    color: #f40612;
  }
  .etb-select-label {
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: rgba(255, 255, 255, 0.4);
    margin-right: 0.15rem;
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
  }
  .dd-svg-icon {
    color: rgba(255, 255, 255, 0.4);
  }
  .etb-dd-value {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .etb-dd-text {
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  :global(.etb-dd-caret) {
    color: rgba(255, 255, 255, 0.4);
    transition: transform 0.2s;
  }
  .etb-dd.open :global(.etb-dd-caret) { transform: rotate(180deg); }

  .etb-dd-menu {
    position: absolute;
    bottom: calc(100% + 6px); /* Pop UP over the control deck */
    right: 0;
    min-width: 180px;
    max-height: min(240px, 60vh);
    overflow-y: auto;
    background: #0c0c12;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 0.35rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.6);
    z-index: 1000;
    display: none;
    flex-direction: column;
    gap: 0.2rem;
  }
  .etb-dd.open .etb-dd-menu { display: flex; }
  .etb-dd-opt {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    text-align: left;
    background: none;
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.75);
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .etb-dd-opt:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
  .etb-dd-opt.sel {
    background: rgba(229, 9, 20, 0.15);
    color: #f40612;
    font-weight: 700;
  }

  .deck-nav {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .deck-nav-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.45);
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 750;
    cursor: pointer;
    padding: 4px 6px;
    min-height: 32px;
    transition: color 0.2s;
  }
  .deck-nav-btn:hover {
    color: #fff;
  }
  .deck-nav-next {
    color: #f40612;
    margin-left: auto;
  }
  .deck-nav-next:hover {
    color: #ff4d4d;
  }

  .deck-nav-sep {
    opacity: 0.08;
    font-weight: 400;
  }

  @media (max-width: 640px) {
    .control-deck {
      padding: 0.6rem 0.75rem;
      gap: 0.6rem;
    }
    .deck-toggles {
      gap: 0.65rem;
    }
    .deck-engine {
      display: none;
    }
  }

  @media (max-width: 480px) {
    .control-deck {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.85rem;
    }
    .deck-toggles {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      width: 100%;
      gap: 1rem;
      padding-bottom: 0.15rem;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .deck-toggles::-webkit-scrollbar {
      display: none;
    }
    .deck-toggle {
      height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    .hide-mobile {
      display: none !important;
    }
    .deck-sep {
      display: none;
    }
    .deck-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 0.65rem;
    }
    .deck-selectors {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      width: 100%;
      gap: 0.5rem;
    }
    .etb-dd-trigger {
      width: 100%;
      justify-content: space-between;
      height: 44px;
    }
    .etb-dd-menu {
      width: 100%;
      left: 0;
      right: 0;
      z-index: 999;
    }
    .deck-nav {
      width: 100%;
      display: flex;
      align-items: center;
    }
    .deck-nav-btn {
      height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }
</style>
