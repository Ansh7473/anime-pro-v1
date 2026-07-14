<script lang="ts">
  import { api } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { untrack } from "svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import Row from "$lib/components/Row.svelte";
  import SkeletonDetail from "$lib/components/SkeletonDetail.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import { getAnimeJsonLd, truncateDescription } from "$lib/seo";

  let { data } = $props();

  // svelte-ignore state_referenced_locally
  let anime: any = $state(data.anime);
  let characters: any[] = $state([]);
  let recommendations: any[] = $state([]);
  let relations: any[] = $state([]);
  let episodes: any[] = $state([]);
  let detailsLoading = $state(true);
  let inWatchlist = $state(false);
  let isFavorite = $state(false);
  let watchlistStatus = $state("");
  let processingWatchlist = $state(false);
  let processingFavorite = $state(false);
  let synopsisOpen = $state(false);
  let activeTab = $state<"episodes" | "characters" | "trailer" | "comments" | "information">("episodes");
  let charFilter = $state<"all" | "main" | "supporting">("all");
  let epQuery = $state("");
  let epOrder = $state<"asc" | "desc">("asc");
  let shareLabel = $state("Share");

  // Caching layer for per-id, per-user auth lookups so the same id never
  // triggers /user/watchlist + /user/favorites twice in a session.
  let lastUserStatusFetchedId: number | null = null;
  let lastUserStatusUserKey = "";
  const statusKey = () => `${$auth.token ?? ""}|${$auth.currentProfile?.id ?? ""}`;

  const id = $derived(Number(data.id));
  const pageDescription = $derived(
    anime
      ? truncateDescription(
          anime.synopsis || anime.description,
          `Watch details, episodes, and recommendations for ${anime.title} on WatchAnimez.`,
        )
      : "Explore anime details, episodes, characters, and recommendations on WatchAnimez.",
  );
  const animeJsonLd = $derived(anime ? getAnimeJsonLd(anime, data.canonicalUrl) : null);

  const scoreLabel = $derived.by(() => {
    const s = Number(anime?.score || anime?.rating || 0);
    if (!s) return "";
    return (s > 10 ? s / 10 : s).toFixed(1);
  });
  const formatLabel = $derived(String(anime?.type || anime?.format || "TV").toUpperCase());
  const seasonLabel = $derived(
    [anime?.season, anime?.seasonYear || anime?.year].filter(Boolean).join(" ").toLowerCase(),
  );
  const yearLabel = $derived(anime?.year || anime?.seasonYear || "");
  const durationLabel = $derived(
    anime?.duration ? `${anime.duration}M` : anime?.duration === 0 ? "" : "",
  );
  const nativeTitle = $derived(
    anime?.title_japanese ||
      anime?.title_native ||
      (typeof anime?.title === "object" ? anime.title?.native : "") ||
      "",
  );
  const englishTitle = $derived(
    anime?.title_english ||
      (typeof anime?.title === "object" ? anime.title?.english : "") ||
      anime?.title ||
      "",
  );
  const synonyms = $derived.by(() => {
    const s = anime?.synonyms;
    if (Array.isArray(s) && s.length) return s.slice(0, 6).join(", ");
    return "N/A";
  });
  const studiosLabel = $derived.by(() => {
    const s = anime?.studios;
    if (!s) return "N/A";
    if (Array.isArray(s)) {
      return s
        .map((x: any) => (typeof x === "string" ? x : x?.name))
        .filter(Boolean)
        .join(", ") || "N/A";
    }
    return String(s);
  });
  const synopsisFull = $derived(
    String(anime?.synopsis || anime?.description || "No description available.").replace(
      /<[^>]*>?/gm,
      "",
    ),
  );
  const synopsisShort = $derived(
    synopsisFull.length > 280 ? synopsisFull.slice(0, 280) + "…" : synopsisFull,
  );
  const trailerUrl = $derived.by(() => {
    const t = anime?.trailer;
    if (!t) return "";
    if (typeof t === "string") return t;
    if (t.site === "youtube" && t.id) return `https://www.youtube.com/embed/${t.id}`;
    if (t.id) return `https://www.youtube.com/embed/${t.id}`;
    return "";
  });

  let filteredCharacters = $derived.by(() => {
    const list = characters || [];
    if (charFilter === "all") return list;
    return list.filter((c: any) => {
      const role = String(c?.role || "").toUpperCase();
      if (charFilter === "main") return role.includes("MAIN");
      return !role.includes("MAIN");
    });
  });

  let filteredEpisodes = $derived.by(() => {
    let list = [...episodes];
    const q = epQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          String(e.number).includes(q) ||
          String(e.title || "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) =>
      epOrder === "asc" ? a.number - b.number : b.number - a.number,
    );
    return list;
  });

  $effect(() => {
    if (!id) return;
    loadAnimeData(id, data.anime);
  });

  function pullFromAnime(a: any) {
    untrack(() => {
      characters = a?.characters || [];
      recommendations = a?.recommendations || [];
      relations = a?.relations || [];
      const n = Number(a?.episodes || 0);
      const count = n > 0 ? Math.min(n, 500) : 12;
      episodes = Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        title: `Episode ${i + 1}`,
        image: "",
      }));
    });
  }

  async function loadAnimeData(currentId: number, ssrAnime: any) {
    untrack(() => {
      detailsLoading = true;
      synopsisOpen = false;
      activeTab = "episodes";
      charFilter = "all";
      epQuery = "";
      characters = [];
      recommendations = [];
      relations = [];
      episodes = [];
      inWatchlist = false;
      isFavorite = false;
      watchlistStatus = "";
    });

    try {
      const ssr =
        ssrAnime &&
        (ssrAnime.id === currentId || ssrAnime.mal_id === currentId)
          ? ssrAnime
          : null;
      const fetchedAnime = ssr || (await api.getAnime(currentId));

      untrack(() => {
        anime = fetchedAnime;
        if (currentId === id) pullFromAnime(fetchedAnime);
      });

      if ($auth.token) {
        // Only fire once per id per session. Subsequent mounts reuse the result.
        if (lastUserStatusFetchedId !== currentId || lastUserStatusUserKey !== statusKey()) {
          untrack(() => {
            lastUserStatusFetchedId = currentId;
            lastUserStatusUserKey = statusKey();
          });
          Promise.all([
            api.getWatchlistStatus(
              $auth.token,
              currentId.toString(),
              $auth.currentProfile?.id,
            ),
            api.getFavoriteStatus(
              $auth.token,
              currentId.toString(),
              $auth.currentProfile?.id,
            ),
          ]).then(([wl, fav]) => {
            if (currentId === id) {
              untrack(() => {
                inWatchlist = wl.inWatchlist;
                watchlistStatus = wl.status;
                isFavorite = fav.isFavorite;
              });
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (currentId === id) {
        untrack(() => {
          detailsLoading = false;
        });
      }
    }
  }

  async function toggleWatchlist() {
    if (!$auth.token) {
      alert("Please login to use the watchlist!");
      return;
    }
    processingWatchlist = true;
    try {
      if (inWatchlist) {
        await api.removeFromWatchlist(
          $auth.token,
          id.toString(),
          $auth.currentProfile?.id,
        );
        inWatchlist = false;
        watchlistStatus = "";
      } else {
        await api.addToWatchlist($auth.token, {
          animeId: id.toString(),
          animeTitle: anime.title,
          animePoster: anime.poster || anime.image,
          profileId: $auth.currentProfile?.id,
          status: "PLANNING",
        });
        inWatchlist = true;
        watchlistStatus = "PLANNING";
      }
    } catch (e) {
      console.error("Watchlist toggle error:", e);
    } finally {
      processingWatchlist = false;
    }
  }

  async function toggleFavorite() {
    if (!$auth.token) {
      alert("Please login to save favorites!");
      return;
    }
    processingFavorite = true;
    try {
      if (isFavorite) {
        await api.removeFromFavorites(
          $auth.token,
          id.toString(),
          $auth.currentProfile?.id,
        );
        isFavorite = false;
      } else {
        await api.addToFavorites($auth.token, {
          animeId: id.toString(),
          animeTitle: anime.title,
          animePoster: anime.poster || anime.image,
          profileId: $auth.currentProfile?.id,
        });
        isFavorite = true;
      }
    } catch (e) {
      console.error("Favorite toggle error:", e);
    } finally {
      processingFavorite = false;
    }
  }

  async function shareAnime() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${anime?.title || "Anime"} · WatchAnimez`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      shareLabel = "Copied!";
    } catch {
      shareLabel = "Copy failed";
    }
    setTimeout(() => (shareLabel = "Share"), 1600);
  }
</script>

<svelte:head>
  <title>{anime?.title || "Anime Details"} — WatchAnimez</title>
  {#if anime}
    <meta name="description" content={pageDescription} />
    <meta property="og:title" content={`${anime.title} — WatchAnimez`} />
    <meta property="og:description" content={pageDescription} />
    {#if anime.poster || anime.image}
      <meta property="og:image" content={anime.poster || anime.image} />
    {/if}
  {/if}
</svelte:head>

{#if animeJsonLd}
  <JsonLd data={animeJsonLd} />
{/if}

{#if !anime}
  <SkeletonDetail />
{:else}
  <!-- Hero banner with overlay content -->
  <section
    class="ad-hero"
    style="--banner: url('{anime.bannerImage || anime.image || anime.poster || ""}')"
  >
    <div class="ad-hero-bg" aria-hidden="true"></div>
    <div class="ad-hero-shade" aria-hidden="true"></div>

    <div class="ad-hero-inner">
      <div class="ad-poster">
        <img src={anime.poster || anime.image} alt={anime.title} />
      </div>

      <div class="ad-info">
        <h1 class="ad-title">{anime.title}</h1>

        <div class="ad-meta">
          {#if scoreLabel}
            <span class="ad-chip">★ {scoreLabel}</span>
          {/if}
          {#if formatLabel}
            <span class="ad-chip muted">{formatLabel}</span>
          {/if}
          {#if seasonLabel}
            <span class="ad-chip muted">{seasonLabel}</span>
          {/if}
          {#if yearLabel && !String(seasonLabel).includes(String(yearLabel))}
            <span class="ad-chip muted">{yearLabel}</span>
          {/if}
          {#if anime.episodes}
            <span class="ad-chip muted">E {anime.episodes}</span>
          {/if}
          {#if durationLabel}
            <span class="ad-chip muted">{durationLabel}</span>
          {/if}
          {#if anime.status}
            <span class="ad-chip muted">{anime.status}</span>
          {/if}
        </div>

        {#if anime.genres?.length}
          <div class="ad-genres">
            {#each anime.genres as g}
              <span class="ad-genre">{typeof g === "string" ? g : g.name}</span>
            {/each}
          </div>
        {/if}

        <div class="ad-overview">
          <h2 class="ad-overview-label">Overview</h2>
          <p class="ad-synopsis">
            {synopsisOpen ? synopsisFull : synopsisShort}
          </p>
          {#if synopsisFull.length > 280}
            <button
              type="button"
              class="ad-readmore"
              onclick={() => (synopsisOpen = !synopsisOpen)}
            >
              {synopsisOpen ? "Show Less" : "Read More"}
              <span aria-hidden="true">{synopsisOpen ? "▴" : "▾"}</span>
            </button>
          {/if}
        </div>

        <div class="ad-actions">
          <a
            href="/watch/{id}/1/"
            class="ad-btn primary"
            data-sveltekit-preload-data="hover"
          >
            <span aria-hidden="true">▶</span> Watch Now
          </a>
          <button
            type="button"
            class="ad-btn ghost"
            class:active={inWatchlist}
            disabled={processingWatchlist}
            onclick={toggleWatchlist}
          >
            {#if processingWatchlist}
              <span class="spinner-small"></span>
            {:else}
              <span aria-hidden="true">{inWatchlist ? "✓" : "🔖"}</span>
              {inWatchlist ? "In Watchlist" : "Watchlist"}
            {/if}
          </button>
          <button
            type="button"
            class="ad-btn ghost"
            class:active={isFavorite}
            disabled={processingFavorite}
            onclick={toggleFavorite}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            {#if processingFavorite}
              <span class="spinner-small"></span>
            {:else}
              <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
              Favorite
            {/if}
          </button>
          <button type="button" class="ad-btn ghost" onclick={shareAnime}>
            <span aria-hidden="true">↗</span>
            {shareLabel}
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Body: info rail + tabs -->
  <div class="ad-body">
    <aside class="ad-side" class:active-mobile={activeTab === "information"}>
      <h2 class="ad-side-title">Information</h2>
      <dl class="ad-facts">
        <div class="ad-fact">
          <dt>Native</dt>
          <dd>{nativeTitle || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Synonyms</dt>
          <dd>{synonyms}</dd>
        </div>
        <div class="ad-fact">
          <dt>English</dt>
          <dd>{englishTitle || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Type</dt>
          <dd>{formatLabel || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Episodes</dt>
          <dd>{anime.episodes || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Status</dt>
          <dd>{anime.status || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Season</dt>
          <dd>{seasonLabel || "N/A"}</dd>
        </div>
        <div class="ad-fact">
          <dt>Studios</dt>
          <dd>{studiosLabel}</dd>
        </div>
        {#if scoreLabel}
          <div class="ad-fact">
            <dt>Score</dt>
            <dd>★ {scoreLabel}</dd>
          </div>
        {/if}
      </dl>
    </aside>

    <div class="ad-main" class:hidden-mobile={activeTab === "information"}>
      <div class="ad-tabs" role="tablist" aria-label="Anime sections">
        <button
          type="button"
          role="tab"
          class="ad-tab"
          class:active={activeTab === "episodes"}
          aria-selected={activeTab === "episodes"}
          onclick={() => (activeTab = "episodes")}
        >Season & Episode</button>
        <button
          type="button"
          role="tab"
          class="ad-tab mobile-only-tab"
          class:active={activeTab === "information"}
          aria-selected={activeTab === "information"}
          onclick={() => (activeTab = "information")}
        >Information</button>
        <button
          type="button"
          role="tab"
          class="ad-tab"
          class:active={activeTab === "characters"}
          aria-selected={activeTab === "characters"}
          onclick={() => (activeTab = "characters")}
        >Characters</button>
        <button
          type="button"
          role="tab"
          class="ad-tab"
          class:active={activeTab === "trailer"}
          aria-selected={activeTab === "trailer"}
          onclick={() => (activeTab = "trailer")}
        >Trailer</button>
        <button
          type="button"
          role="tab"
          class="ad-tab"
          class:active={activeTab === "comments"}
          aria-selected={activeTab === "comments"}
          onclick={() => (activeTab = "comments")}
        >Comments & Review</button>
      </div>

      {#if activeTab === "episodes"}
        <div class="ad-ep-toolbar">
          <div class="ad-ep-order">
            <span class="ad-ep-label">Order by:</span>
            <button
              type="button"
              class="ad-mini"
              class:active={epOrder === "desc"}
              onclick={() => (epOrder = "desc")}
            >Latest Episode</button>
            <button
              type="button"
              class="ad-mini"
              class:active={epOrder === "asc"}
              onclick={() => (epOrder = "asc")}
            >Oldest</button>
          </div>
          <label class="ad-ep-search">
            <span class="sr-only">Search episodes</span>
            <input
              type="search"
              placeholder="Search by number…"
              bind:value={epQuery}
            />
          </label>
        </div>

        {#if detailsLoading && episodes.length === 0}
          <div class="ad-ep-grid">
            {#each Array(12) as _, i (i)}
              <div class="ad-ep-card sk">
                <div class="ad-ep-thumb shimmer"></div>
                <div class="ad-ep-line shimmer"></div>
              </div>
            {/each}
          </div>
        {:else if filteredEpisodes.length}
          <div class="ad-ep-grid">
            {#each filteredEpisodes.slice(0, 48) as ep (ep.number)}
              <a class="ad-ep-card" href="/watch/{id}/{ep.number}/">
                <div class="ad-ep-thumb">
                  {#if ep.image}
                    <img src={ep.image} alt="" loading="lazy" />
                  {:else}
                    <img src={anime.poster || anime.image} alt="" loading="lazy" />
                  {/if}
                  <span class="ad-ep-play" aria-hidden="true">▶</span>
                  <span class="ad-ep-badge">EP {ep.number}</span>
                </div>
                <p class="ad-ep-title">{ep.title || `Episode ${ep.number}`}</p>
              </a>
            {/each}
          </div>
        {:else}
          <p class="ad-empty">No episodes found.</p>
        {/if}
      {:else if activeTab === "characters"}
        <div class="char-toolbar">
          <div class="char-filters" role="tablist" aria-label="Character filter">
            <button type="button" class="ad-mini" class:active={charFilter === "all"} onclick={() => (charFilter = "all")}>All</button>
            <button type="button" class="ad-mini" class:active={charFilter === "main"} onclick={() => (charFilter = "main")}>Main</button>
            <button type="button" class="ad-mini" class:active={charFilter === "supporting"} onclick={() => (charFilter = "supporting")}>Supporting</button>
          </div>
          <span class="char-count">{filteredCharacters.length} characters</span>
        </div>

        {#if detailsLoading}
          <div class="chars-rich-grid">
            {#each Array(8) as _, i (i)}
              <div class="char-rich sk">
                <div class="char-rich-art shimmer"></div>
                <div class="char-rich-body">
                  <div class="char-line-sk shimmer" style="width:70%"></div>
                  <div class="char-line-sk shimmer" style="width:40%"></div>
                  <div class="char-va-sk shimmer"></div>
                </div>
              </div>
            {/each}
          </div>
        {:else if filteredCharacters.length}
          <div class="chars-rich-grid">
            {#each filteredCharacters.slice(0, 36) as c (c.character?.id || c.character?.name)}
              {@const va = c.voiceActors?.[0]}
              {@const role = String(c.role || "SUPPORTING").toUpperCase()}
              {@const isMain = role.includes("MAIN")}
              <article class="char-rich">
                <div class="char-rich-art">
                  <img
                    src={c.character?.images?.jpg?.image_url || c.character?.image || ""}
                    alt={c.character?.name || "Character"}
                    loading="lazy"
                    decoding="async"
                  />
                  <span class="char-role-badge" class:main={isMain}>{isMain ? "MAIN" : "SUPPORTING"}</span>
                </div>
                <div class="char-rich-body">
                  <h3 class="char-rich-name">{c.character?.name || "Unknown"}</h3>
                  {#if c.character?.native}
                    <p class="char-rich-native">{c.character.native}</p>
                  {/if}
                  {#if va}
                    <div class="char-va">
                      {#if va.image}
                        <img class="char-va-avatar" src={va.image} alt="" loading="lazy" />
                      {:else}
                        <span class="char-va-avatar fallback" aria-hidden="true">VA</span>
                      {/if}
                      <div class="char-va-text">
                        <span class="char-va-label">Voice Actor</span>
                        <span class="char-va-name">{va.name || "Unknown"}</span>
                      </div>
                    </div>
                  {:else}
                    <p class="char-va-empty">No VA listed</p>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {:else}
          <p class="ad-empty">No character data yet.</p>
        {/if}
      {:else if activeTab === "trailer"}
        {#if trailerUrl}
          <div class="ad-trailer">
            <iframe
              src={trailerUrl}
              title="{anime.title} trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        {:else}
          <p class="ad-empty">No trailer available for this title.</p>
        {/if}
      {:else}
        <p class="ad-empty">
          Open an episode to join the conversation, or check the watch page comments.
        </p>
        <a class="ad-btn primary" href="/watch/{id}/1/">Go to Episode 1</a>
      {/if}

      {#if detailsLoading}
        <div class="ad-rows">
          <SkeletonRow count={8} />
        </div>
      {:else}
        {#if relations.length > 0}
          <div class="ad-rows">
            <Row title="Related Seasons & Prequels" items={relations} />
          </div>
        {/if}
        {#if recommendations.length > 0}
          <div class="ad-rows">
            <Row title="You Might Also Like" items={recommendations} />
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  /* ===== HERO ===== */
  .ad-hero {
    position: relative;
    width: 100%;
    min-height: clamp(380px, 52vh, 520px);
    overflow: hidden;
  }
  .ad-hero-bg {
    position: absolute;
    inset: 0;
    background-image: var(--banner);
    background-size: cover;
    background-position: center top;
    transform: scale(1.04);
    filter: saturate(1.05);
  }
  .ad-hero-shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.72) 42%, rgba(0, 0, 0, 0.35) 70%, rgba(0, 0, 0, 0.55) 100%),
      linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 40%, #000 100%);
  }
  .ad-hero-inner {
    position: relative;
    z-index: 2;
    max-width: var(--page-max, 1600px);
    margin: 0 auto;
    padding: 5.5rem var(--page-gutter, 2.5rem) 1.75rem;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 1.75rem;
    align-items: end;
    box-sizing: border-box;
  }
  .ad-poster {
    width: 100%;
    max-width: 240px;
  }
  .ad-poster img {
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 14px;
    box-shadow:
      0 16px 48px rgba(0, 0, 0, 0.65),
      0 0 0 1px rgba(255, 255, 255, 0.08);
    background: #111;
  }
  .ad-info {
    min-width: 0;
    padding-bottom: 0.25rem;
  }
  .ad-title {
    margin: 0 0 0.75rem;
    font-size: clamp(1.75rem, 3.6vw, 2.75rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.08;
    color: #fff;
    text-shadow: 0 4px 28px rgba(0, 0, 0, 0.55);
  }
  .ad-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .ad-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 26px;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
    border: 1px solid rgba(251, 191, 36, 0.22);
  }
  .ad-chip.muted {
    color: rgba(255, 255, 255, 0.82);
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .ad-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.9rem;
  }
  .ad-genre {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.72);
  }
  .ad-genre:not(:last-child)::after {
    content: "·";
    margin-left: 0.4rem;
    opacity: 0.45;
  }
  .ad-overview-label {
    margin: 0 0 0.4rem;
    font-size: 0.95rem;
    font-weight: 800;
    color: #fff;
  }
  .ad-synopsis {
    margin: 0;
    max-width: 62ch;
    font-size: 0.92rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.72);
  }
  .ad-readmore {
    margin-top: 0.35rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--net-red, #ff8a3d);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
  }
  .ad-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-top: 1.15rem;
  }
  .ad-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 44px;
    padding: 0.65rem 1.15rem;
    border-radius: 10px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 800;
    text-decoration: none;
    border: 1px solid transparent;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      background 0.15s ease,
      border-color 0.15s ease;
  }
  .ad-btn.primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
  }
  .ad-btn.primary:hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
  }
  .ad-btn.ghost {
    background: rgba(20, 20, 20, 0.72);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(10px);
  }
  .ad-btn.ghost:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.28);
  }
  .ad-btn.ghost.active {
    border-color: rgba(255, 138, 61, 0.45);
    color: var(--net-red, #ff8a3d);
  }
  .ad-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  /* ===== BODY ===== */
  .ad-body {
    max-width: var(--page-max, 1600px);
    margin: 0 auto;
    padding: 1.25rem var(--page-gutter, 2.5rem) 2.5rem;
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 1.5rem;
    box-sizing: border-box;
  }
  .ad-side {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 1rem 1rem 1.15rem;
    height: fit-content;
    position: sticky;
    top: 5rem;
  }
  .ad-side-title {
    margin: 0 0 0.85rem;
    font-size: 1.05rem;
    font-weight: 800;
    color: #fff;
  }
  .ad-facts {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .ad-fact dt {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
    margin-bottom: 0.2rem;
  }
  .ad-fact dd {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.35;
    word-break: break-word;
  }

  .ad-main {
    min-width: 0;
  }
  .ad-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 1rem;
  }
  .ad-tab {
    appearance: none;
    border: none;
    background: none;
    color: rgba(255, 255, 255, 0.55);
    font: inherit;
    font-size: 0.92rem;
    font-weight: 700;
    padding: 0.75rem 0.1rem;
    cursor: pointer;
    position: relative;
  }
  .ad-tab.active {
    color: #60a5fa;
  }
  .ad-tab.active::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -1px;
    height: 2px;
    background: #3b82f6;
    border-radius: 2px 2px 0 0;
  }
  .ad-tab:hover:not(.active) {
    color: #fff;
  }

  .ad-ep-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .ad-ep-order {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
  }
  .ad-ep-label {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
  }
  .ad-mini {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.8);
    border-radius: 8px;
    padding: 0.4rem 0.7rem;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
  }
  .ad-mini.active {
    background: rgba(236, 88, 0, 0.18);
    border-color: rgba(236, 88, 0, 0.45);
    color: #EC5800;
  }
  .ad-ep-search input {
    min-width: 180px;
    height: 38px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
    padding: 0 0.8rem;
    font: inherit;
    font-size: 0.85rem;
  }
  .ad-ep-search input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .ad-ep-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.85rem;
  }
  .ad-ep-card {
    display: block;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }
  .ad-ep-thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    border-radius: 10px;
    overflow: hidden;
    background: #151515;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .ad-ep-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.92;
  }
  .ad-ep-play {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.28);
    color: #fff;
    font-size: 1.1rem;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .ad-ep-card:hover .ad-ep-play {
    opacity: 1;
  }
  .ad-ep-badge {
    position: absolute;
    left: 0.4rem;
    bottom: 0.4rem;
    padding: 0.15rem 0.4rem;
    border-radius: 5px;
    background: rgba(0, 0, 0, 0.72);
    font-size: 0.68rem;
    font-weight: 800;
    color: #fff;
  }
  .ad-ep-title {
    margin: 0.4rem 0 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.88);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ad-ep-card.sk .ad-ep-thumb,
  .ad-ep-line {
    background: rgba(255, 255, 255, 0.06);
  }
  .ad-ep-line {
    height: 0.7rem;
    border-radius: 4px;
    margin-top: 0.4rem;
  }


  .char-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
    margin-bottom: 1rem;
  }
  .char-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .char-count { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.45); }
  .chars-rich-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.85rem;
  }
  .char-rich {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.7rem;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .char-rich:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.12);
  }
  .char-rich-art {
    position: relative;
    width: 88px;
    height: 120px;
    border-radius: 10px;
    overflow: hidden;
    background: #151515;
  }
  .char-rich-art img { width: 100%; height: 100%; object-fit: cover; }
  .char-role-badge {
    position: absolute; left: 0.3rem; bottom: 0.3rem;
    padding: 0.12rem 0.35rem; border-radius: 5px;
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.04em;
    color: #fff; background: rgba(0,0,0,0.72);
    border: 1px solid rgba(255,255,255,0.12);
  }
  .char-role-badge.main {
    background: rgba(59,130,246,0.85);
    border-color: rgba(147,197,253,0.35);
  }
  .char-rich-body {
    min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.25rem;
  }
  .char-rich-name { margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff; line-height: 1.25; }
  .char-rich-native { margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.45); }
  .char-va {
    display: flex; align-items: center; gap: 0.5rem;
    margin-top: 0.45rem; padding-top: 0.45rem;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .char-va-avatar {
    width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #222; flex-shrink: 0;
  }
  .char-va-avatar.fallback {
    display: grid; place-items: center; font-size: 0.6rem; font-weight: 800;
    color: rgba(255,255,255,0.55); border: 1px solid rgba(255,255,255,0.1);
  }
  .char-va-text { min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }
  .char-va-label {
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: rgba(255,255,255,0.4);
  }
  .char-va-name {
    font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.88);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .char-va-empty { margin: 0.45rem 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
  .char-rich.sk .char-rich-art { background: rgba(255,255,255,0.06); }
  .char-va-sk { width: 70%; height: 28px; border-radius: 8px; margin-top: 0.5rem; }
  .char-line-sk { width: 70%; height: 0.7rem; border-radius: 4px; margin: 0.25rem 0; }

  .chars-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 1rem;
  }
  .char-card {
    text-align: center;
  }
  .char-card img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--net-card-bg);
  }
  .char-name {
    font-size: 0.8rem;
    font-weight: 600;
    margin-top: 0.4rem;
  }
  .char-role {
    font-size: 0.7rem;
    color: var(--net-text-muted);
  }
  .char-img-sk {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto;
  }
  .char-line-sk {
    width: 70%;
    height: 0.7rem;
    border-radius: 4px;
    margin: 0.4rem auto 0;
  }
  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.05) 30%,
      rgba(255, 255, 255, 0.11) 50%,
      rgba(255, 255, 255, 0.05) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .ad-trailer {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 14px;
    overflow: hidden;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .ad-trailer iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
  .ad-empty {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    margin: 1rem 0;
  }
  .ad-rows {
    margin-top: 1.75rem;
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .mobile-only-tab {
    display: none;
  }

  @media (max-width: 1100px) {
    .ad-hero-inner {
      grid-template-columns: 180px 1fr;
      gap: 1.25rem;
      padding-top: 5rem;
    }
    .ad-body {
      grid-template-columns: 220px 1fr;
    }
  }

  @media (max-width: 860px) {
    .mobile-only-tab {
      display: block;
    }
    .ad-hero-inner {
      grid-template-columns: 140px 1fr;
      padding: 4.5rem var(--page-gutter-md, 1.25rem) 1.25rem;
    }
    .ad-body {
      grid-template-columns: 1fr;
      padding: 1rem var(--page-gutter-md, 1.25rem) 2rem;
    }
    .ad-side {
      display: none;
    }
    .ad-side.active-mobile {
      display: block;
      position: static;
      order: 1;
    }
    .ad-main.hidden-mobile {
      display: none;
    }
    .ad-main {
      order: 1;
    }
  }

  @media (max-width: 560px) {
    .ad-hero {
      min-height: 0;
    }
    .ad-hero-inner {
      grid-template-columns: 1fr;
      justify-items: start;
      padding: 4.25rem var(--page-gutter-sm, 0.75rem) 1rem;
    }
    .ad-poster {
      max-width: 150px;
    }
    .ad-title {
      font-size: 1.45rem;
    }
    .ad-actions {
      width: 100%;
    }
    .ad-btn {
      flex: 1 1 auto;
    }
    .ad-btn.primary {
      flex: 1 1 100%;
    }
    .ad-body {
      padding: 0.85rem var(--page-gutter-sm, 0.75rem) 1.75rem;
    }
    .ad-ep-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    }
    .chars-rich-grid { grid-template-columns: 1fr; }
    .char-rich { grid-template-columns: 76px 1fr; }
    .char-rich-art { width: 76px; height: 104px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
    }
  }
</style>
