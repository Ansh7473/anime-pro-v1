<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy, untrack } from "svelte";
  import {
    Play, Star, Eye, Tv, BookOpen, Heart, Share2,
    AlertTriangle, ChevronDown, Server,
  } from "lucide-svelte";
  import VideoPlayer from "$lib/components/VideoPlayer.svelte";
  import LiveChat from "$lib/components/LiveChat.svelte";
  import CommentsSection from "$lib/components/CommentsSection.svelte";
  import { getEnglishAnimeTitle } from "$lib/animeTitle";

  let { data } = $props();
  const animeId = $derived(data.animeId);

  let anime: any = $state(
    // svelte-ignore state_referenced_locally
    data.ssrAnime ?? null,
  );
  // Playback providers do not own identity. Each receives the cross-reference
  // it actually expects from the canonical AniList record.
  const anilistStreamingId = $derived(String(anime?.id || anime?.anilist_id || animeId));
  const malStreamingId = $derived(String(anime?.idMal || anime?.mal_id || ""));
  const providerSearchTitle = $derived(getEnglishAnimeTitle(anime));

  let episodes: any[] = $state(
    // svelte-ignore state_referenced_locally
    data.ssrEpisodes ?? [],
  );
  const ep = $derived(parseInt(data.ep as string) || 1);

  let sources: any[] = $state([]);
  let selectedSource: any = $state(null);
  let sourceLoading = $state(false);
  let error = $state("");

  let sidebarTab = $state<"chat" | "comments">("comments");
  let synopsisExpanded = $state(false);

  // Episode range paging — long series (One Piece 1000+) are chunked into
  // 100-episode ranges so the grid stays usable.
  const RANGE_SIZE = 100;
  let rangeStart = $state(0);
  const ranges = $derived.by(() => {
    const out: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < episodes.length; i += RANGE_SIZE) {
      out.push({ start: i, end: Math.min(i + RANGE_SIZE, episodes.length) });
    }
    return out;
  });
  const visibleEpisodes = $derived(
    episodes.length > RANGE_SIZE
      ? episodes.slice(rangeStart, rangeStart + RANGE_SIZE)
      : episodes,
  );

  // Keep the active range aligned with the current episode.
  $effect(() => {
    if (episodes.length > RANGE_SIZE) {
      rangeStart = Math.floor((ep - 1) / RANGE_SIZE) * RANGE_SIZE;
    }
  });

  // ── Providers ──────────────────────────────────────────────────────────
  // All providers are queried concurrently. Priority controls server order,
  // not whether Tatakai or Anichi are allowed to make a source call.
  type ProviderRequest = {
    name: "Animelok" | "Tatakai" | "Anichi";
    enabled: () => boolean;
    request: (signal: AbortSignal) => Promise<any>;
  };

  const PROVIDERS: ProviderRequest[] = [
    {
      name: "Animelok",
      enabled: () => Boolean(malStreamingId),
      request: (signal) => api.getAnimelokSources(malStreamingId, ep, signal),
    },
    {
      name: "Tatakai",
      enabled: () => Boolean(anilistStreamingId),
      request: (signal) => api.getTatakaiSources(anilistStreamingId, ep, signal),
    },
    {
      name: "Anichi",
      enabled: () => Boolean(malStreamingId),
      request: (signal) => api.getAnichiSources(malStreamingId, ep, providerSearchTitle, signal),
    },
  ];

  // Per-episode source cache so back/forward and re-selecting an episode
  // are instant instead of re-scraping every provider.
  const _sourceCache = new Map<string, any[]>();
  const activeSourceControllers = new Set<AbortController>();
  let currentLoadId = 0;
  let playbackError = $state("");
  let playbackGeneration = $state(0);
  let embedLoadTimer: ReturnType<typeof setTimeout> | null = null;
  const attemptedSourceUrls = new Set<string>();

  function clearEmbedLoadTimer() {
    if (embedLoadTimer) clearTimeout(embedLoadTimer);
    embedLoadTimer = null;
  }

  function abortSourceRequests() {
    for (const controller of activeSourceControllers) controller.abort();
    activeSourceControllers.clear();
  }

  function resetPlaybackAttempts() {
    playbackGeneration += 1;
    attemptedSourceUrls.clear();
    playbackError = "";
    clearEmbedLoadTimer();
  }

  // Load exactly once for each canonical anime/URL-episode pair, including the
  // first mount. untrack keeps loadSources' internal state reads out of this effect.
  let loadedSourceRoute = "";
  $effect(() => {
    const routeKey = `${anilistStreamingId}:${malStreamingId}:${ep}`;
    if (!anilistStreamingId || routeKey === loadedSourceRoute) return;
    loadedSourceRoute = routeKey;
    untrack(() => void loadSources());
  });

  type SourceKind = "embed" | "hls" | "video" | "invalid";

  function getSourceKind(source: any): SourceKind {
    const rawUrl = String(source?.url || "").trim();
    if (!rawUrl) return "invalid";

    let pathname = "";
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "invalid";
      pathname = parsed.pathname.toLowerCase();
    } catch {
      return "invalid";
    }

    const type = String(source?.type || source?.mimeType || "").toLowerCase();
    // Provider payloads sometimes label direct HLS URLs as "iframe". Trust the
    // explicit HLS flag and media extension before the inconsistent type field.
    if (
      source?.isM3U8 === true ||
      type === "hls" ||
      type.includes("mpegurl") ||
      pathname.endsWith(".m3u8")
    ) return "hls";

    if (
      source?.isEmbed === true ||
      type === "iframe" ||
      type === "embed" ||
      pathname.includes("/embed/")
    ) return "embed";

    if (
      type.startsWith("video/") ||
      ["mp4", "webm", "ogg"].includes(type) ||
      /\.(mp4|webm|ogv|ogg)$/.test(pathname)
    ) return "video";

    // Unknown provider URLs are normally hosted player pages, not raw media.
    return "embed";
  }

  const sourceKind = $derived(getSourceKind(selectedSource));
  const isEmbedPlayer = $derived(sourceKind === "embed");
  const activeUrl = $derived(sourceKind === "invalid" ? "" : (selectedSource?.url ?? ""));
  const posterImg = $derived(getProxiedImage(anime?.image || anime?.poster || ""));

  function beginPlaybackAttempt(url: string) {
    clearEmbedLoadTimer();
    if (!url) return;
    attemptedSourceUrls.add(url);
    playbackError = "";
    if (getSourceKind(selectedSource) === "embed") {
      const generation = playbackGeneration;
      embedLoadTimer = setTimeout(() => {
        if (generation === playbackGeneration) {
          handleSourceFailure(url, "The embedded player did not load in time.");
        }
      }, 15_000);
    }
  }

  function markSourceReady(url: string) {
    if (url === activeUrl) clearEmbedLoadTimer();
  }

  function handleSourceFailure(failedUrl: string, reason: string) {
    if (!failedUrl || failedUrl !== activeUrl) return;
    clearEmbedLoadTimer();
    attemptedSourceUrls.add(failedUrl);
    const nextSource = sources.find((source) => !attemptedSourceUrls.has(String(source?.url || "")));
    if (nextSource) {
      selectedSource = nextSource;
      return;
    }
    playbackError = `${reason} All available servers were tried.`;
  }

  function retryPlayback() {
    resetPlaybackAttempts();
    selectedSource = sources[0] || null;
  }

  $effect(() => {
    const url = activeUrl;
    // Reading the generation makes manual retries of the currently selected
    // server restart its timer and remount the player instead of doing nothing.
    playbackGeneration;
    beginPlaybackAttempt(url);
  });

  function toPlainSynopsis(value: unknown): string {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const synopsisText = $derived(toPlainSynopsis(anime?.description || anime?.synopsis));

  function getEpisodeTitle(episode: any, number: number) {
    const title = [episode?.title, episode?.name, episode?.episodeTitle, episode?.episode_title]
      .find((value) => typeof value === "string" && value.trim());
    return title?.trim() || `Episode ${number}`;
  }

  const currentEpisodeTitle = $derived.by(() => {
    const episode = episodes.find((item: any) => item.number === ep);
    return getEpisodeTitle(episode, ep);
  });

  // ── Source loading ───────────────────────────────────────────────────────
  // Query every enabled provider in parallel with an abortable per-provider
  // budget. Results remain ordered Animelok → Tatakai → Anichi for playback.
  async function loadSources() {
    const loadId = ++currentLoadId;
    abortSourceRequests();
    resetPlaybackAttempts();
    sourceLoading = true;
    error = "";
    sources = [];
    selectedSource = null;

    const cacheKey = `${anilistStreamingId}:${malStreamingId}:${ep}`;
    const cached = _sourceCache.get(cacheKey);
    if (cached && cached.length) {
      sources = cached;
      selectedSource = cached[0];
      sourceLoading = false;
      return;
    }

    async function requestProvider(provider: ProviderRequest) {
      const controller = new AbortController();
      activeSourceControllers.add(controller);
      const timer = setTimeout(() => controller.abort(), 20_000);
      try {
        return { provider, result: await provider.request(controller.signal), failure: null };
      } catch (failure) {
        return { provider, result: null, failure };
      } finally {
        clearTimeout(timer);
        activeSourceControllers.delete(controller);
      }
    }

    try {
      const enabledProviders = PROVIDERS.filter((provider) => provider.enabled());
      const results = await Promise.all(enabledProviders.map(requestProvider));
      if (loadId !== currentLoadId) return;

      const collected: any[] = [];
      const seenSources = new Set<string>();

      for (const { provider, result, failure } of results) {
        if (failure) {
          if (!(failure instanceof DOMException && failure.name === "AbortError")) {
            console.warn(`${provider.name} source lookup failed:`, failure);
          }
          continue;
        }

        for (const source of extractSources(result)) {
          if (!source?.url || getSourceKind(source) === "invalid" || isBlacklisted(source)) continue;
          const identity = sourceIdentity(source);
          if (seenSources.has(identity)) continue;
          seenSources.add(identity);
          collected.push(source);
        }
      }

      sources = collected;
      if (collected.length) {
        selectedSource = collected[0];
        _sourceCache.set(cacheKey, collected);
      } else {
        error = "No sources found for this episode.";
      }
    } catch (cause) {
      console.error("loadSources failed", cause);
      if (loadId === currentLoadId) error = "Failed to load sources.";
    } finally {
      if (loadId === currentLoadId) sourceLoading = false;
    }
  }

  // Normalize labels because upstream spelling/casing changes independently of
  // provider identity (for example VidPlay-1 vs Vidplay 1).
  function normalizedServerKey(source: any): string {
    return sourceServer(source).replace(/[^a-z0-9]+/g, "");
  }

  const SERVER_BLACKLIST = new Set([
    "batosoftsub",
    "batodub",
    "pahehardsub",
    "pahedub",
  ]);

  function sourceProvider(source: any): string {
    return String(source?.providerName || source?.provider || "").toLowerCase().trim();
  }

  function sourceServer(source: any): string {
    return String(source?.serverName || source?.server || source?.name || "").toLowerCase().trim();
  }

  function sourceVariant(source: any): string {
    const urlMatch = String(source?.url || "").toLowerCase().match(/(?:\/|=)(h?sub|dub)(?:[/?#&]|$)/);
    if (urlMatch) return urlMatch[1] === "dub" ? "dub" : "sub";
    const category = String(source?.category || source?.language || "").toLowerCase().trim();
    return category;
  }

  function sourceIdentity(source: any): string {
    return `${sourceProvider(source)}|${sourceServer(source)}|${sourceVariant(source)}`;
  }

  function isBlacklisted(source: any): boolean {
    const provider = sourceProvider(source);
    const server = normalizedServerKey(source);
    if (SERVER_BLACKLIST.has(server)) return true;
    if (provider === "animelok") {
      return !(server === "multimulti" || (server.includes("toonstream") && server.includes("multi")));
    }
    if (provider === "anichi") {
      return !(server.startsWith("kiwistream") || server.startsWith("vidplay1"));
    }
    if (provider === "tatakai") {
      return !(server.startsWith("vidnest") || server === "pahe");
    }
    return false;
  }

  // Providers return varied shapes: an array, {sources}, or {data:{sources}}.
  function extractSources(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.sources)) return res.sources;
    if (Array.isArray(res?.data?.sources)) return res.data.sources;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  }

  function selectServerByUrl(url: string) {
    const source = sources.find((item) => item.url === url);
    if (!source) return;
    resetPlaybackAttempts();
    selectedSource = source;
  }

  function changeEp(n: number) {
    if (n < 1 || n > episodes.length) return;
    goto(`/watch/${animeId}/${n}`, { replaceState: false, noScroll: true });
  }

  function sourceLabel(source: any, index: number): string {
    const name = source?.name || source?.quality || "";
    const variant = sourceVariant(source);
    const needsVariant = (variant === "sub" || variant === "dub") && !/\b(sub|dub)\b/i.test(name);
    const label = `${name}${needsVariant ? ` (${variant.toUpperCase()})` : ""}`;
    return `Server ${index + 1}${label ? ` · ${label}` : ""}`;
  }

  let shareLabel = $state("Share");
  async function shareEpisode() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareLabel = "Copied!";
      setTimeout(() => (shareLabel = "Share"), 1500);
    } catch {
      shareLabel = "Copy failed";
      setTimeout(() => (shareLabel = "Share"), 1500);
    }
  }

  // Watchlist state is persisted only for authenticated users.
  let isFavorited = $state(false);
  let favBusy = false;

  async function toggleWatchlist() {
    if (favBusy) return;
    const tok = getToken();
    if (!tok) {
      await goto(`/auth/login?redirect=${encodeURIComponent(`/watch/${animeId}/${ep}`)}`);
      return;
    }

    favBusy = true;
    const next = !isFavorited;
    isFavorited = next;
    try {
      if (next) {
        await api.addToWatchlist(tok, {
          animeId: String(animeId),
          animeTitle: anime?.title || "",
          animePoster: anime?.image || anime?.poster || "",
        });
      } else {
        await api.removeFromWatchlist(tok, String(animeId));
      }
    } catch {
      isFavorited = !next;
    } finally {
      favBusy = false;
    }
  }

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("auth") || "{}").token || null;
    } catch { return null; }
  }

  // Rebuild `episodes` to reflect how many are actually released. Priority:
  // Merge real metadata by episode number so title lists work even when the
  // backend returns the same or fewer rows than the SSR placeholder list.
  function buildEpisodes(count: number, source: any[] = []) {
    const byNumber = new Map(
      source.map((episode, index) => [Number(episode?.number ?? index + 1), episode]),
    );
    return Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      const episode = byNumber.get(number);
      return {
        number,
        title: getEpisodeTitle(episode, number),
        image: episode?.image || episode?.thumbnail || "",
      };
    });
  }

  async function resolveEpisodeCount() {
    const nextAiring = Number(anime?.nextAiringEpisode?.episode || 0);
    const airedCount = nextAiring > 1 ? nextAiring - 1 : 0;
    let metadata: any[] = data.ssrEpisodeMetadataLoaded ? episodes : [];

    if (!data.ssrEpisodeMetadataLoaded) {
      try {
        const metadataId = anime?.idMal || anime?.mal_id || animeId;
        const response = await api.getEpisodeMetadata(metadataId, 1, 2000);
        metadata = response?.data?.episodes ?? response?.episodes ?? [];
      } catch (metadataError) {
        console.error("episode metadata resolve failed", metadataError);
      }
    }

    const highestMetadataNumber = metadata.reduce(
      (highest, episode, index) => Math.max(highest, Number(episode?.number ?? index + 1)),
      0,
    );
    const count = airedCount > 0
      ? airedCount
      : Math.max(episodes.length, metadata.length, highestMetadataNumber);

    if (count > 0) episodes = buildEpisodes(count, metadata);
  }

  onMount(async () => {
    // Fill metadata if SSR missed it.
    if (!anime || episodes.length === 0) {
      try {
        const res = await api.getAnime(animeId);
        anime = res;
      } catch (e) { console.error(e); }
    }

    // Resolve the accurate number of *released* episodes. SSR builds the grid
    // from `anime.episodes` (the TOTAL planned count), so a currently-airing
    // show (e.g. 2 aired / 12 total) wrongly lists all 12. For long finished
    // series (One Piece) the total is also stale/low. Reconcile here.
    await resolveEpisodeCount();
    // Watchlist status (best-effort).
    const tok = getToken();
    if (tok) {
      try {
        const st = await api.getWatchlistStatus(tok, String(animeId));
        isFavorited = !!(st?.inWatchlist ?? st?.exists ?? st);
      } catch {}
    }
  });

  onDestroy(() => {
    abortSourceRequests();
    clearEmbedLoadTimer();
  });
</script>

<svelte:head>
  <title>{anime?.title || "Player"} — Episode {ep} — WatchAnimeX</title>
  <meta
    name="description"
    content={anime
      ? `Watch ${anime.title} Episode ${ep} on WatchAnimeX using the available playback sources.`
      : `Watch anime Episode ${ep} on WatchAnimeX.`}
  />
</svelte:head>

<div class="watch-layout">
  <!-- ── LEFT: player + info + episodes ────────────────────────────────── -->
  <main class="watch-main">
    <!-- Video player -->
    <div class="player-frame">
      {#if sourceLoading && sources.length === 0}
        <div class="player-state">
          <div class="spinner"></div>
          <span>Scanning best available servers…</span>
        </div>
      {:else if error && sources.length === 0}
        <div class="player-state error">
          <AlertTriangle size={40} />
          <p>{error}</p>
          <button class="btn-retry" onclick={loadSources}>Retry</button>
        </div>
      {:else if playbackError}
        <div class="player-state error">
          <AlertTriangle size={40} />
          <p>{playbackError}</p>
          <button class="btn-retry" onclick={retryPlayback}>Retry all servers</button>
        </div>
      {:else if selectedSource}
        {#if !activeUrl}
          <div class="player-error">
            <AlertTriangle size={34} />
            <p>This source URL is not supported.</p>
          </div>
        {:else if isEmbedPlayer}
          {@const playerUrl = activeUrl}
          {#key `${playerUrl}:${playbackGeneration}`}
            <iframe
              title="Video player"
              src={playerUrl}
              allowfullscreen
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerpolicy="no-referrer"
              onload={() => markSourceReady(playerUrl)}
              onerror={() => handleSourceFailure(playerUrl, "The embedded player failed to load.")}
            ></iframe>
          {/key}
        {:else}
          {@const playerUrl = activeUrl}
          {#key `${playerUrl}:${playbackGeneration}`}
            <VideoPlayer
              src={playerUrl}
              type={sourceKind === "hls" ? "hls" : ""}
              poster={posterImg}
              autoplay
              onready={() => markSourceReady(playerUrl)}
              onerror={(reason) => handleSourceFailure(playerUrl, reason)}
              onended={() => changeEp(ep + 1)}
            />
          {/key}
        {/if}
      {:else}
        <div class="player-state">
          <div class="spinner"></div>
          <span>Loading episode…</span>
        </div>
      {/if}
    </div>

    <!-- Title + stats -->
    <div class="meta-block">
      <h1 class="anime-title">{anime?.title || "Loading…"}</h1>
      <div class="stats-row">
        <span class="ep-badge">EP {ep}</span>
        {#if anime?.rating || anime?.score}
          <span class="stat"><Star size={14} class="star" />{anime.rating || anime.score}</span>
          <span class="dot">•</span>
        {/if}
        {#if anime?.year || anime?.releaseDate}
          <span>{anime.year || anime.releaseDate}</span>
          <span class="dot">•</span>
        {/if}
        {#if anime?.genres?.length}
          <span class="genres">
            {anime.genres
              .map((g: any) => (typeof g === "string" ? g : g?.name))
              .filter(Boolean)
              .join(", ")}
          </span>
          <span class="dot">•</span>
        {/if}
        {#if anime?.views}
          <span class="stat"><Eye size={14} />{anime.views}</span>
        {/if}
      </div>
    </div>

    <!-- Action row -->
    <div class="action-row">
      <div class="action-left">
        <button class="btn-primary" onclick={toggleWatchlist}>
          <Heart size={16} class={isFavorited ? "filled" : ""} />
          <span>{isFavorited ? "In watchlist" : "Add to watchlist"}</span>
        </button>
        <button class="btn-ghost" onclick={shareEpisode}>
          <Share2 size={16} /><span>{shareLabel}</span>
        </button>

        {#if sources.length}
          <div class="server-picker">
            <Server size={15} />
            <select
              value={selectedSource?.url}
              onchange={(e) => selectServerByUrl((e.target as HTMLSelectElement).value)}
            >
              {#each sources as s, i (s.url)}
                <option value={s.url}>{sourceLabel(s, i)}</option>
              {/each}
            </select>
            <ChevronDown size={14} class="picker-chevron" />
          </div>
        {/if}
      </div>
    </div>

    <!-- Synopsis -->
    {#if anime?.description || anime?.synopsis}
      <section class="synopsis-card">
        <h3><BookOpen size={16} class="accent" /> Synopsis</h3>
        <p class:expanded={synopsisExpanded}>{synopsisText}</p>
        <button class="link-btn" onclick={() => (synopsisExpanded = !synopsisExpanded)}>
          {synopsisExpanded ? "Collapse" : "Read More"}
        </button>
      </section>
    {/if}

    <!-- Episode grid -->
    <section class="episodes-block">
      <div class="episodes-head">
        <h2><Tv size={16} class="accent" /> Select Episode</h2>
        {#if ranges.length > 1}
          <select
            class="range-select"
            aria-label="Episode range"
            value={rangeStart}
            onchange={(e) => (rangeStart = parseInt(e.currentTarget.value))}
          >
            {#each ranges as r}
              <option value={r.start}>EP {r.start + 1} - {r.end}</option>
            {/each}
          </select>
        {/if}
      </div>
      <div class="episode-grid">
        {#each visibleEpisodes as e (e.number)}
          {@const active = e.number === ep}
          <button
            class="ep-item"
            class:active
            onclick={() => changeEp(e.number)}
          >
            <span class="ep-thumb">
              {#if e.image}
                <img src={getProxiedImage(e.image)} alt="" loading="lazy" />
              {:else}
                <span class="ep-play"><Play size={14} /></span>
              {/if}
            </span>
            <span class="ep-body">
              <span class="ep-num">EP {e.number}</span>
              <span class="ep-title">{e.title}</span>
            </span>
          </button>
        {/each}
      </div>
    </section>
  </main>

  <!-- ── RIGHT: sticky chat / comments ─────────────────────────────────── -->
  <aside class="watch-aside">
    <div class="sidebar-panel">
      <div class="sidebar-tabs">
        <button
          class="sidebar-tab"
          class:active={sidebarTab === "chat"}
          onclick={() => (sidebarTab = "chat")}
        >
          Live Chat
        </button>
        <button
          class="sidebar-tab"
          class:active={sidebarTab === "comments"}
          onclick={() => (sidebarTab = "comments")}
        >
          Comments
        </button>
      </div>

      <div class="sidebar-body">
        {#if sidebarTab === "chat"}
          {#key ep}
            <LiveChat {animeId} episode={ep} />
          {/key}
        {:else}
          {#key ep}
            <CommentsSection {animeId} episode={ep} />
          {/key}
        {/if}
      </div>
    </div>
  </aside>
</div>

<style>
  .watch-layout {
    max-width: var(--page-max, 1600px);
    margin: 0 auto;
    padding: 1.5rem var(--page-gutter, 2.5rem);
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .watch-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Player ── */
  .player-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: var(--radius-lg, 14px);
    overflow: hidden;
    border: 1px solid var(--net-border);
  }
  .player-frame :global(video),
  .player-frame iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }
  .player-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    color: var(--net-text-muted);
    font-size: 0.85rem;
    text-align: center;
    padding: 1rem;
  }
  .player-state.error { color: var(--net-text); }
  .spinner {
    width: 38px;
    height: 38px;
    border: 3px solid rgba(255, 255, 255, 0.12);
    border-top-color: var(--net-red);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .btn-retry {
    background: var(--net-red);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    padding: 0.5rem 1.25rem;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
  }

  /* ── Title + stats ── */
  .meta-block { display: flex; flex-direction: column; gap: 0.6rem; }
  .anime-title {
    font-family: var(--net-display-font);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--net-text);
    margin: 0;
    letter-spacing: -0.01em;
  }
  .stats-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.55rem;
    font-size: 0.78rem;
    color: var(--net-text-muted);
  }
  .stat { display: inline-flex; align-items: center; gap: 0.3rem; }
  .stats-row :global(.star) { color: var(--net-red); fill: var(--net-red); }
  .ep-badge {
    background: color-mix(in srgb, var(--net-red) 22%, transparent);
    color: var(--net-red);
    font-weight: 800;
    font-family: var(--net-display-font);
    padding: 0.15rem 0.6rem;
    border-radius: var(--radius-sm);
    font-size: 0.72rem;
  }
  .dot { opacity: 0.4; }
  .genres { color: var(--net-text-muted); }

  /* ── Action row ── */
  .action-row { padding: 0.9rem 0; border-top: 1px solid var(--net-border); }
  .action-left { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .btn-primary,
  .btn-ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    font-weight: 700;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition);
    border: 1px solid transparent;
  }
  .btn-primary {
    background: var(--net-red);
    color: #fff;
    padding: 0.6rem 1.25rem;
  }
  .btn-primary:hover { background: var(--net-red-hover); }
  .btn-primary :global(.filled) { fill: #fff; }
  .btn-ghost {
    background: var(--net-card-bg);
    color: var(--net-text);
    border-color: var(--net-border);
    padding: 0.6rem 1rem;
  }
  .btn-ghost:hover { background: var(--net-card-hover); }

  .server-picker {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--net-card-bg);
    border: 1px solid var(--net-border);
    border-radius: var(--radius-md);
    padding: 0 0.7rem;
    color: var(--net-text-muted);
    height: 40px;
  }
  .server-picker select {
    appearance: none;
    background: transparent;
    border: none;
    color: var(--net-text);
    font-size: 0.78rem;
    font-weight: 700;
    padding: 0 1.3rem 0 0.1rem;
    cursor: pointer;
    outline: none;
  }
  .server-picker select option { background: var(--net-card-bg); color: var(--net-text); }
  .server-picker :global(.picker-chevron) {
    position: absolute;
    right: 0.55rem;
    pointer-events: none;
  }

  /* ── Synopsis ── */
  .synopsis-card {
    background: var(--net-card-bg);
    border: 1px solid var(--net-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
  }
  .synopsis-card h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--net-display-font);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--net-text);
    margin: 0 0 0.75rem;
  }
  .synopsis-card :global(.accent) { color: var(--net-red); }
  .synopsis-card p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--net-text-muted);
    margin: 0;
    white-space: pre-line;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .synopsis-card p.expanded {
    -webkit-line-clamp: unset;
    line-clamp: unset;
    overflow: visible;
  }
  .link-btn {
    background: none;
    border: none;
    color: var(--net-red);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0.5rem 0 0;
  }
  .link-btn:hover { text-decoration: underline; }

  /* ── Episodes ── */
  .episodes-head {
    margin-bottom: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .range-select {
    background: var(--net-card-hover, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--net-border);
    border-radius: 8px;
    padding: 0.4rem 0.7rem;
    color: var(--net-text);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    outline: none;
  }
  .range-select:focus { border-color: var(--net-red); }
  .episodes-head h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--net-display-font);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--net-text);
    margin: 0;
  }
  .episodes-head :global(.accent) { color: var(--net-red); }
  .episode-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.6rem;
    max-height: 340px;
    overflow-y: auto;
    padding-right: 0.35rem;
  }
  .ep-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.7rem;
    background: var(--net-card-bg);
    border: 1px solid var(--net-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
  }
  .ep-item:hover { background: var(--net-card-hover); }
  .ep-item.active {
    background: color-mix(in srgb, var(--net-red) 12%, transparent);
    border-color: color-mix(in srgb, var(--net-red) 45%, transparent);
  }
  .ep-item.active::before {
    content: "";
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: var(--net-red);
  }
  .ep-thumb {
    position: relative;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 52px;
    height: 34px;
    overflow: hidden;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.4);
  }
  .ep-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .ep-play {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
  }
  .ep-item.active .ep-play { background: var(--net-red); }
  .ep-body { min-width: 0; display: flex; flex-direction: column; }
  .ep-num {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--net-text-muted);
  }
  .ep-item.active .ep-num { color: var(--net-red); }
  .ep-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--net-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Sidebar ── */
  .watch-aside { width: 360px; flex-shrink: 0; }
  .sidebar-panel {
    position: sticky;
    top: 5rem;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 6.5rem);
    background: var(--net-card-bg);
    border: 1px solid var(--net-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--net-border);
    flex-shrink: 0;
  }
  .sidebar-tab {
    flex: 1;
    padding: 0.85rem;
    background: none;
    border: none;
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--net-text-muted);
    cursor: pointer;
    position: relative;
    transition: color 0.2s;
  }
  .sidebar-tab:hover { color: var(--net-text); }
  .sidebar-tab.active { color: var(--net-red); }
  .sidebar-tab.active::after {
    content: "";
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 2px;
    background: var(--net-red);
  }
  .sidebar-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .sidebar-body > :global(*) { flex: 1; min-height: 0; }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .watch-layout { flex-direction: column; padding: 1rem var(--page-gutter-md, 1.25rem); }
    .watch-aside { width: 100%; }
    .sidebar-panel { position: static; height: 480px; }
  }
  @media (max-width: 640px) {
    .watch-layout { padding: 0.5rem var(--page-gutter-sm, 0.85rem); }
    .anime-title { font-size: 1.2rem; }
    .episode-grid { grid-template-columns: 1fr; }
  }

  /* Editorial broadcast-desk pass */
  :global(body) { background: var(--editorial-bg, #070706); }
  .watch-layout { max-width: var(--page-max, 1500px); min-height: 100dvh; gap: 2rem; padding-top: 2rem; padding-left: max(var(--page-gutter, 2.5rem), env(safe-area-inset-left)); padding-right: max(var(--page-gutter, 2.5rem), env(safe-area-inset-right)); color: var(--editorial-text, #f1ece4); }
  .watch-main { gap: 1.6rem; }
  .player-frame { border: 1px solid #302923; border-radius: 4px; background: #030303; }
  .meta-block { padding-bottom: 1.1rem; border-bottom: 1px solid var(--editorial-line, #28231f); }
  .anime-title { font-size: clamp(1.5rem, 2.6vw, 2.35rem); font-weight: 850; line-height: 1.05; letter-spacing: -.04em; color: var(--editorial-text, #f1ece4); }
  .stats-row { color: var(--editorial-muted, #918a82); }
  .ep-badge { padding: .28rem .5rem; border-radius: 3px; background: var(--editorial-accent, #df886b); color: #170c09; }
  .action-row { padding: 0; border: 0; }
  .btn-primary,.btn-ghost,.server-picker { min-height: 40px; border-radius: 3px; transition: background .15s,color .15s,border-color .15s; }
  .btn-primary { background: var(--editorial-accent, #df886b); color: #180c08; }
  .btn-primary:hover { background: var(--editorial-accent-hover, #f1a287); }
  .btn-ghost,.server-picker { background: var(--editorial-surface, #0d0c0b); border-color: var(--editorial-line, #28231f); }
  .btn-ghost:hover { background: var(--editorial-surface-raised, #151210); border-color: #4b3d35; }
  .synopsis-card { padding: 1.2rem 0; border: 0; border-block: 1px solid var(--editorial-line, #28231f); border-radius: 0; background: transparent; }
  .synopsis-card h3,.episodes-head h2 { font-size: .72rem; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
  .synopsis-card p { max-width: 90ch; line-height: 1.75; color: var(--editorial-muted, #918a82); }
  .range-select { border-radius: 3px; background: var(--editorial-surface, #0d0c0b); border-color: var(--editorial-line, #28231f); }
  .episode-grid { grid-template-columns: repeat(auto-fill,minmax(210px,1fr)); gap: 0; max-height: 420px; border-top: 1px solid var(--editorial-line, #28231f); }
  .ep-item { min-height: 58px; padding: .65rem .35rem; border: 0; border-bottom: 1px solid var(--editorial-line, #28231f); border-radius: 0; background: transparent; }
  .ep-item:hover { background: var(--editorial-surface, #0d0c0b); }
  .ep-item.active { background: var(--editorial-surface-raised, #151210); border-color: var(--editorial-line, #28231f); }
  .ep-play { width: 30px; height: 30px; border-radius: 3px; background: #171411; color: #aaa198; }
  .ep-item.active .ep-play { background: var(--editorial-accent, #df886b); color: #170c09; }
  .watch-aside { width: min(360px, 27vw); }
  .sidebar-panel { top: 1.5rem; height: calc(100vh - 3rem); border: 1px solid var(--editorial-line, #28231f); border-radius: 4px; background: var(--editorial-surface, #0d0c0b); }
  .sidebar-tabs { border-color: var(--editorial-line, #28231f); }
  .sidebar-tab { color: var(--editorial-muted, #918a82); letter-spacing: .06em; text-transform: uppercase; }
  .sidebar-tab.active { color: var(--editorial-accent-hover, #f1a287); }
  .sidebar-tab.active::after { height: 1px; background: var(--editorial-accent, #df886b); }
  @media (max-width: 1024px) { .watch-layout { padding-left:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-right)); }.watch-aside{width:100%}.sidebar-panel{height:520px} }
  @media (max-width: 640px) { .watch-layout { padding-left:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-right)); }.player-frame{margin-inline:calc(var(--page-gutter-sm,.85rem) * -1);width:calc(100% + var(--page-gutter-sm,.85rem) * 2);border-inline:0}.action-left>*:not(.btn-icon){flex:1 1 auto}.episode-grid{grid-template-columns:1fr} }
</style>
