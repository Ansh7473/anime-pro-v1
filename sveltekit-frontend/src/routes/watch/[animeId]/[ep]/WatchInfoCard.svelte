<script lang="ts">
  import { getProxiedImage } from "$lib/api";

  let {
    anime = null,
    episodes = [],
  }: {
    anime?: any;
    episodes?: any[];
  } = $props();

  // Helper to format season
  function formatSeason(season: string, year: any): string {
    if (!season) return year ? String(year) : "—";
    const s = season.toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1) + (year ? ` ${year}` : "");
  }

  // Helper to format date objects
  function formatDate(d: any): string {
    if (!d) return "—";
    if (typeof d === "string") return d;
    if (d.year && d.month && d.day) {
      const date = new Date(d.year, d.month - 1, d.day);
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    if (d.year) return String(d.year);
    return "—";
  }

  // Get Studio name
  let studioName = $derived.by(() => {
    if (!anime) return "—";
    const nodes = anime.studios?.nodes ?? (Array.isArray(anime.studios) ? anime.studios : null);
    if (nodes && nodes.length > 0) {
      return nodes
        .map((s: any) => (typeof s === "string" ? s : s?.name))
        .filter(Boolean)
        .join(", ") || "—";
    }
    return anime.studio || "—";
  });

  let synopsisExpanded = $state(false);
  let detailsExpanded = $state(false);

  // Links
  let malUrl = $derived(anime ? `https://myanimelist.net/anime/${anime.idMal || anime.mal_id || ""}` : "");
  let alUrl = $derived(anime ? `https://anilist.co/anime/${anime.id || anime.anilistId || ""}` : "");
  let trailerUrl = $derived.by(() => {
    if (!anime) return "";
    if (anime.trailer && anime.trailer.site === "youtube" && anime.trailer.id) {
      return `https://www.youtube.com/watch?v=${anime.trailer.id}`;
    }
    return `https://www.youtube.com/results?search_query=${encodeURIComponent((anime.title || "") + " trailer")}`;
  });
</script>

{#if anime}
  <div class="info-card">
    <!-- Left Column: Poster + Actions -->
    <div class="ic-poster-col">
      <div class="ic-poster-wrap">
        <img
          class="ic-poster"
          src={getProxiedImage(anime?.image || anime?.poster)}
          alt={anime?.title}
          loading="lazy"
        />
      </div>

      <!-- Poster buttons underneath -->
      <div class="ic-poster-btns">
        <a href={trailerUrl} target="_blank" rel="noopener noreferrer" class="ic-p-btn btn-trailer">
          TRAILER
        </a>
        <button class="ic-p-btn btn-plus" title="Add to watchlist">
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
        </button>
        <a href={alUrl} target="_blank" rel="noopener noreferrer" class="ic-p-btn btn-al" title="View on AniList">
          AL
        </a>
        <a href={malUrl} target="_blank" rel="noopener noreferrer" class="ic-p-btn btn-mal" title="View on MyAnimeList">
          MAL
        </a>
      </div>
    </div>

    <!-- Right Column: Info Details -->
    <div class="ic-body">
      <div class="ic-genres-row">
        {#if anime?.genres?.length}
          <div class="ic-genres">
            {#each anime.genres.slice(0, 6) as g}
              <span class="ic-genre">{typeof g === 'string' ? g : g?.name || ""}</span>
            {/each}
          </div>
        {/if}
        <button
          class="ic-details-toggle"
          aria-expanded={detailsExpanded}
          onclick={() => (detailsExpanded = !detailsExpanded)}
        >
          {detailsExpanded ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {#if anime?.description || anime?.synopsis}
        <div class="ic-desc-wrap">
          <p class="ic-desc" class:expanded={synopsisExpanded}>
            {@html (anime.description || anime.synopsis || "").replace(/<br\s*\/?>/gi, ' ')}
          </p>
          <button
            class="ic-desc-toggle"
            aria-expanded={synopsisExpanded}
            onclick={() => (synopsisExpanded = !synopsisExpanded)}
          >
            {synopsisExpanded ? "Read less" : "Read more"}
          </button>
        </div>
      {/if}

      <!-- Collapsible Details Grid -->
      {#if detailsExpanded}
      <div class="ic-meta-two-col">
        <!-- Left Sub-Grid -->
        <div class="meta-sub-grid">
          <div class="ic-meta">
            <span class="ic-meta-label">Format</span>
            <span class="ic-meta-value">{anime.type || anime.format || "TV"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Status</span>
            <span class="ic-meta-value">{anime.status || "—"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Episodes</span>
            <span class="ic-meta-value">{anime.episodes || episodes.length || "—"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Rating</span>
            <span class="ic-meta-value">
              {anime.rating ? `${Math.round(anime.rating * 10) / 10} / 100` : (anime.score ? `${Math.round(anime.score * 10)} / 100` : "—")}
            </span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Duration</span>
            <span class="ic-meta-value">{anime.duration ? `${anime.duration} min` : "—"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Season</span>
            <span class="ic-meta-value">{formatSeason(anime.season, anime.seasonYear || anime.year)}</span>
          </div>
        </div>

        <!-- Right Sub-Grid -->
        <div class="meta-sub-grid">
          <div class="ic-meta">
            <span class="ic-meta-label">Start Date</span>
            <span class="ic-meta-value">{formatDate(anime.startDate || anime.releaseDate)}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">End Date</span>
            <span class="ic-meta-value">{formatDate(anime.endDate)}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Country</span>
            <span class="ic-meta-value">{anime.countryOfOrigin || "JP"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Adult</span>
            <span class="ic-meta-value">{anime.isAdult ? "Yes" : "No"}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Studios</span>
            <span class="ic-meta-value">{studioName}</span>
          </div>
          <div class="ic-meta">
            <span class="ic-meta-label">Official Site</span>
            <span class="ic-meta-value">
              {#if anime.officialSite || anime.website}
                <a href={anime.officialSite || anime.website} target="_blank" rel="noopener noreferrer" class="ic-link">
                  {String(anime.officialSite || anime.website).replace(/https?:\/\/(www\.)?/, '').split('/')[0]}
                </a>
              {:else}
                —
              {/if}
            </span>
          </div>
        </div>
      </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .info-card {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(14, 14, 20, 0.5);
    backdrop-filter: blur(12px);
  }

  .ic-poster-col {
    flex-shrink: 0;
    width: 140px;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .ic-poster-wrap {
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: #000;
    aspect-ratio: 2/3;
    width: 100%;
  }
  .ic-poster {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  .ic-poster-wrap:hover .ic-poster {
    transform: scale(1.04);
  }

  /* Poster Quick-action buttons */
  .ic-poster-btns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.35rem;
  }
  .ic-p-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 28px;
    min-width: 0 !important;
    min-height: 0 !important;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.65rem;
    font-weight: 800;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  .ic-p-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  .btn-trailer {
    grid-column: span 3;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .btn-trailer:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .ic-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ic-genres-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .ic-details-toggle {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 0.3rem 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.68rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    touch-action: manipulation;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ic-details-toggle:hover {
    color: #fff;
    border-color: rgba(255, 138, 61, 0.3);
    background: rgba(229, 9, 20, 0.08);
  }

  .ic-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .ic-genre {
    padding: 0.15rem 0.55rem;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 750;
    background: rgba(229, 9, 20, 0.08);
    border: 1px solid rgba(229, 9, 20, 0.15);
    color: #f40612;
    transition: all 0.2s;
  }
  .ic-genre:hover {
    background: rgba(249, 115, 22, 0.15);
    border-color: rgba(249, 115, 22, 0.3);
  }

  .ic-desc-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .ic-desc {
    font-size: 0.78rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
  }
  .ic-desc.expanded {
    -webkit-line-clamp: unset;
    color: rgba(255, 255, 255, 0.7);
  }
  .ic-desc-toggle {
    align-self: flex-start;
    background: none;
    border: none;
    padding: 0;
    color: #f40612;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    touch-action: manipulation;
  }
  .ic-desc-toggle:hover {
    color: #ff4d4d;
    text-decoration: underline;
  }

  /* Two column metadata layout */
  .ic-meta-two-col {
    display: flex;
    gap: 2rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  .meta-sub-grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.65rem 1rem;
  }
  .ic-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .ic-meta-label {
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.3);
  }
  .ic-meta-value {
    font-size: 0.76rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ic-link {
    color: #f40612;
    transition: color 0.2s;
  }
  .ic-link:hover {
    color: #ff4d4d;
    text-decoration: underline;
  }

  @media (max-width: 1280px) {
    .ic-meta-two-col { gap: 1rem; }
  }
  @media (max-width: 1100px) {
    .ic-meta-two-col { flex-direction: column; gap: 0.65rem; }
  }
  @media (max-width: 768px) {
    .info-card { flex-direction: row; gap: 1rem; align-items: flex-start; padding: 1rem; }
    .ic-poster-col { width: 90px; }
    .ic-meta-two-col { gap: 0.5rem; }
    .meta-sub-grid { grid-template-columns: 1fr; gap: 0.5rem; }
  }
  @media (max-width: 480px) {
    .info-card { padding: 0.75rem; gap: 0.75rem; }
    .ic-poster-col { width: 75px; }
    .ic-body { gap: 0.5rem; }
  }
</style>
