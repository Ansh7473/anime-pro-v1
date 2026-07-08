<script lang="ts">
  let {
    ep = 1,
    currentEpisodeTitle = '',
    anime = null,
    animeId = null,
    onReport = () => {},
    onDownload = () => {},
    onShare = () => {},
    shareLabel = 'Share',
  }: {
    ep?: number;
    currentEpisodeTitle?: string;
    anime?: any;
    animeId?: string | number | null;
    onReport?: () => void;
    onDownload?: () => void;
    onShare?: () => void;
    shareLabel?: string;
  } = $props();

  // Fallback when parent doesn't pass animeId explicitly.
  const resolvedAnimeId = $derived(animeId ?? anime?.id ?? anime?.mal_id ?? '');
  const animeTitle = $derived(anime?.title ?? '');
</script>

<div class="title-bar">
  <!-- Top Row: Back link + Anime title (page H1) + Episode title (secondary) -->
  <div class="tb-top-row">
    <div class="tb-title-col">
      {#if resolvedAnimeId}
        <a class="tb-back" href={`/anime/${resolvedAnimeId}`} aria-label={`Back to ${animeTitle}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          <span>{animeTitle || 'Back'}</span>
        </a>
      {/if}
      <h1 class="tb-anime-title">{animeTitle}</h1>
      <h2 class="tb-title" title={currentEpisodeTitle}>
        <span class="tb-num">{ep}.</span>
        {currentEpisodeTitle}
      </h2>
    </div>


  </div>

  <!-- Bottom Row: Meta pills + Action Buttons side-by-side -->
  <div class="tb-bottom-row">
    <div class="tb-pills">
      {#if anime?.releaseDate || anime?.year}
        <span class="tb-pill">{anime?.releaseDate || anime?.year}</span>
      {/if}

      <!-- Stats: Comments count (mocked to match design) -->
      <span class="tb-pill" aria-label="13 comments">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="pill-svg-icon" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>13</span>
      </span>

      <!-- Stats: Likes count (mocked to match design) -->
      <span class="tb-pill" aria-label="12 likes">
        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="pill-svg-icon" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span>12</span>
      </span>
    </div>

    <!-- Actions -->
    <div class="tb-actions">
      <button class="tb-action-btn" onclick={onReport}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
        <span>Report</span>
      </button>
      <button class="tb-action-btn" onclick={onDownload}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Download</span>
      </button>
      <button class="tb-action-btn" onclick={onShare}>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
        <span>{shareLabel}</span>
      </button>
    </div>
  </div>
</div>

<style>
  .title-bar {
    padding: 1.1rem 1.25rem;
    background: #0a0a0f;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .tb-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .tb-title-col {
    flex: 1;
    min-width: 0;
  }

  .tb-back {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    margin-bottom: 0.35rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 0.2s;
  }
  .tb-back:hover {
    color: #f40612;
  }

  .tb-anime-title {
    font-size: clamp(1.05rem, 2.2vw + 0.5rem, 1.5rem);
    font-weight: 850;
    color: #fff;
    line-height: 1.2;
    margin: 0 0 0.15rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tb-title {
    font-size: clamp(0.85rem, 1.4vw + 0.4rem, 1.05rem);
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.25;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tb-num {
    color: rgba(255, 255, 255, 0.55);
    margin-right: 0.15rem;
  }

  .tb-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .tb-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .tb-pill {
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.45);
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .pill-svg-icon {
    color: rgba(255, 255, 255, 0.4);
  }

  .tb-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .tb-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    font-size: 0.72rem;
    font-weight: 750;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    transition: all 0.2s;
  }
  .tb-action-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
    color: #fff;
    transform: translateY(-1px);
  }
  .tb-action-btn:active {
    transform: translateY(0);
  }
  .tb-action-btn svg {
    color: rgba(255, 255, 255, 0.5);
  }
  .tb-action-btn:hover svg {
    color: #fff;
  }

  @media (max-width: 640px) {
    .title-bar { padding: 0.85rem 0.75rem; gap: 0.65rem; }
    .tb-top-row { flex-direction: column; align-items: flex-start; gap: 0.65rem; }
    .tb-bottom-row { flex-direction: column; align-items: flex-start; gap: 0.65rem; }
    .tb-actions { width: 100%; justify-content: flex-start; }
  }
  @media (max-width: 480px) {
    .tb-actions {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      width: 100%;
      gap: 0.5rem;
      padding-bottom: 0.15rem;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .tb-actions::-webkit-scrollbar {
      display: none;
    }
    .tb-action-btn {
      flex-shrink: 0;
      height: 44px;
    }
  }
</style>
