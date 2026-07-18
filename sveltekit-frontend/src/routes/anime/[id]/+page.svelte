<script lang="ts">
  import { api } from "$lib/api";
  import { getAnimeTitle, getEnglishAnimeTitle, getJapaneseAnimeTitle } from "$lib/animeTitle";
  import { auth } from "$lib/stores/auth";
  import { titleLanguage } from "$lib/stores/titleLanguage";
  import { untrack } from "svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import Row from "$lib/components/Row.svelte";
  import SkeletonDetail from "$lib/components/SkeletonDetail.svelte";
  import SkeletonRow from "$lib/components/SkeletonRow.svelte";
  import { getAnimeJsonLd, truncateDescription } from "$lib/seo";
  import { Layers3 } from "lucide-svelte";

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
  const EPISODE_RANGE_SIZE = 30;
  let epRangeIndex = $state(0);
  let shareLabel = $state("Share");
  let failedTitleLogo = $state("");
  const titleLogo = $derived(
    String(
      anime?.clearLogo ||
        anime?.clear_logo ||
        anime?.artwork?.clearLogo ||
        anime?.artwork?.clear_logo ||
        "",
    ),
  );
  const visibleTitleLogo = $derived(titleLogo && titleLogo !== failedTitleLogo ? titleLogo : "");

  // Caching layer for per-id, per-user auth lookups so the same id never
  // triggers /user/watchlist + /user/favorites twice in a session.
  let lastUserStatusFetchedId: number | null = null;
  let lastUserStatusUserKey = "";
  const statusKey = () => `${$auth.token ?? ""}|${$auth.currentProfile?.id ?? ""}`;

  const id = $derived(Number(data.id));
  const displayTitle = $derived(getAnimeTitle(anime, $titleLanguage));
  const englishTitle = $derived(getEnglishAnimeTitle(anime));
  const nativeTitle = $derived(getJapaneseAnimeTitle(anime));
  const secondaryTitle = $derived(
    ($titleLanguage === "japanese" ? englishTitle : nativeTitle) !== displayTitle
      ? ($titleLanguage === "japanese" ? englishTitle : nativeTitle)
      : "",
  );
  const pageDescription = $derived(
    anime
      ? truncateDescription(
          anime.synopsis || anime.description,
          `Watch details, episodes, and recommendations for ${displayTitle} on WatchAnimeX.`,
        )
      : "Explore anime details, episodes, characters, and recommendations on WatchAnimeX.",
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
  const posterUrl = $derived(anime?.poster || anime?.image || "");
  const wideBannerUrl = $derived(anime?.bannerImage || anime?.artwork?.banner || "");
  const heroImageUrl = $derived(wideBannerUrl || posterUrl);

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
        (episode) =>
          String(episode.number).includes(q) ||
          String(episode.title || "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) =>
      epOrder === "asc" ? a.number - b.number : b.number - a.number,
    );
    return list;
  });

  const episodeRanges = $derived.by(() => {
    const ranges = [];
    for (let start = 0; start < filteredEpisodes.length; start += EPISODE_RANGE_SIZE) {
      const chunk = filteredEpisodes.slice(start, start + EPISODE_RANGE_SIZE);
      const numbers = chunk.map((episode) => Number(episode.number));
      const resultStart = start + 1;
      const resultEnd = start + chunk.length;
      ranges.push({
        index: ranges.length,
        label: epQuery.trim()
          ? `Results ${resultStart}–${resultEnd}`
          : `EP ${Math.min(...numbers)}–${Math.max(...numbers)}`,
      });
    }
    return ranges;
  });

  const visibleEpisodes = $derived(
    filteredEpisodes.slice(
      epRangeIndex * EPISODE_RANGE_SIZE,
      (epRangeIndex + 1) * EPISODE_RANGE_SIZE,
    ),
  );

  $effect(() => {
    id;
    epQuery;
    epOrder;
    untrack(() => (epRangeIndex = 0));
  });

  $effect(() => {
    const lastRange = Math.max(0, episodeRanges.length - 1);
    if (epRangeIndex > lastRange) epRangeIndex = lastRange;
  });

  $effect(() => {
    if (!id) return;
    loadAnimeData(id, data.anime);
  });

  let loadGeneration = 0;

  function isCurrentLoad(currentId: number, generation: number) {
    return currentId === id && generation === loadGeneration;
  }

  function getEpisodeTitle(episode: any, number: number) {
    const title = [episode?.title, episode?.name, episode?.episodeTitle, episode?.episode_title]
      .find((value) => typeof value === "string" && value.trim());
    return title?.trim() || `Episode ${number}`;
  }

  function mergeEpisodeMetadata(metadata: any[], availableEpisodes = 0) {
    const byNumber = new Map(
      metadata.map((episode, index) => [Number(episode?.number ?? index + 1), episode]),
    );
    const highestNumber = metadata.reduce(
      (highest, episode, index) => Math.max(highest, Number(episode?.number ?? index + 1)),
      0,
    );
    const canonicalAvailable = Number(availableEpisodes);
    const count = Math.min(
      canonicalAvailable > 0
        ? canonicalAvailable
        : Math.max(episodes.length, metadata.length, highestNumber),
      2000,
    );
    episodes = Array.from({ length: count }, (_, index) => {
      const number = index + 1;
      const episode = byNumber.get(number);
      return {
        number,
        title: getEpisodeTitle(episode, number),
        image: episode?.image || episode?.thumbnail || "",
      };
    });
  }

  function pullFromAnime(a: any) {
    untrack(() => {
      characters = a?.characters || [];
      recommendations = a?.recommendations || [];
      relations = a?.relations || [];
      const n = Number(a?.episodes || 0);
      const count = n > 0 ? Math.min(n, 2000) : 12;
      episodes = Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        title: "",
        image: "",
      }));
    });
  }

  async function loadEpisodeMetadata(currentId: number, generation: number, currentAnime: any) {
    const metadataId = currentAnime?.idMal || currentAnime?.mal_id;
    if (!metadataId) return;

    try {
      const metadata = await api.getEpisodeMetadata(metadataId, 1, 2000);
      if (!isCurrentLoad(currentId, generation)) return;
      const list = metadata?.data?.episodes ?? metadata?.episodes ?? [];
      const available = Number(
        metadata?.data?.availableEpisodes ?? metadata?.availableEpisodes ?? 0,
      );
      if (list.length > 0) {
        untrack(() => mergeEpisodeMetadata(list, available));
      }
    } catch (metadataError) {
      if (isCurrentLoad(currentId, generation)) {
        console.warn("Episode titles could not be loaded:", metadataError);
      }
    }
  }

  async function loadAnimeData(currentId: number, ssrAnime: any) {
    const generation = ++loadGeneration;
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
        [ssrAnime.id, ssrAnime.anilist_id, ssrAnime.idMal, ssrAnime.mal_id]
          .map(Number)
          .includes(currentId)
          ? ssrAnime
          : null;
      const fetchedAnime = ssr || (await api.getAnime(currentId));

      if (!isCurrentLoad(currentId, generation)) return;
      const ssrMetadata = Array.isArray(data.episodeMetadata) ? data.episodeMetadata : [];
      untrack(() => {
        anime = fetchedAnime;
        pullFromAnime(fetchedAnime);
        if (ssrMetadata.length > 0) mergeEpisodeMetadata(ssrMetadata);
        // Core AniList identity, titles and hero fields are interactive now.
        // Nested AniList sections and episode enrichment continue independently.
        detailsLoading = false;
      });

      void api.getAnimeExtras(currentId)
        .then((extras: any) => {
          if (!isCurrentLoad(currentId, generation) || !extras) return;
          untrack(() => {
            characters = extras.characters || [];
            recommendations = extras.recommendations || [];
            relations = extras.relations || [];
            anime = {
              ...anime,
              characters,
              recommendations,
              relations,
            };
          });
        })
        .catch((extrasError: unknown) => {
          if (isCurrentLoad(currentId, generation)) {
            console.warn("AniList characters and recommendations could not be loaded:", extrasError);
          }
        });

      // Clear logos are presentation enrichment. Load them independently so
      // ani.zip/TheTVDB never delays canonical AniList detail navigation.
      if (!fetchedAnime?.clearLogo && !fetchedAnime?.clear_logo && !fetchedAnime?.artwork?.clearLogo && !fetchedAnime?.artwork?.clear_logo) {
        void api.getAnimeArtwork(currentId)
          .then((result: any) => {
            if (!isCurrentLoad(currentId, generation) || !result) return;
            untrack(() => {
              anime = {
                ...anime,
                ...(result.artwork ? { artwork: result.artwork } : {}),
                ...(result.clearLogo || result.clear_logo
                  ? { clearLogo: result.clearLogo || result.clear_logo }
                  : {}),
                ...(result.tvdb_id ? { tvdb_id: result.tvdb_id } : {}),
              };
              failedTitleLogo = "";
            });
          })
          .catch((artworkError: unknown) => {
            if (isCurrentLoad(currentId, generation)) {
              console.warn("Anime title artwork could not be loaded:", artworkError);
            }
          });
      }

      if (ssrMetadata.length === 0) {
        void loadEpisodeMetadata(currentId, generation, fetchedAnime);
      }

      if ($auth.token) {
        const userKey = statusKey();
        if (lastUserStatusFetchedId !== currentId || lastUserStatusUserKey !== userKey) {
          const token = $auth.token;
          const profileId = $auth.currentProfile?.id;
          untrack(() => {
            lastUserStatusFetchedId = currentId;
            lastUserStatusUserKey = userKey;
          });
          void Promise.all([
            api.getWatchlistStatus(token, currentId.toString(), profileId),
            api.getFavoriteStatus(token, currentId.toString(), profileId),
          ])
            .then(([wl, fav]) => {
              if (isCurrentLoad(currentId, generation) && statusKey() === userKey) {
                untrack(() => {
                  inWatchlist = wl.inWatchlist;
                  watchlistStatus = wl.status;
                  isFavorite = fav.isFavorite;
                });
              }
            })
            .catch((statusError) => {
              if (isCurrentLoad(currentId, generation) && statusKey() === userKey) {
                console.warn("User anime status could not be loaded:", statusError);
                untrack(() => {
                  lastUserStatusFetchedId = null;
                  lastUserStatusUserKey = "";
                });
              }
            });
        }
      }
    } catch (e) {
      if (isCurrentLoad(currentId, generation)) console.error(e);
    } finally {
      if (isCurrentLoad(currentId, generation)) {
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
    const title = `${displayTitle} · WatchAnimeX`;
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
  <title>{displayTitle || "Anime Details"} - WatchAnimeX</title>
  {#if anime}
    <meta name="description" content={pageDescription} />
    <meta property="og:title" content={`${displayTitle} - WatchAnimeX`} />
    <meta property="og:description" content={pageDescription} />
    {#if heroImageUrl}
      <meta property="og:image" content={heroImageUrl} />
    {/if}
  {/if}
</svelte:head>

{#if animeJsonLd}
  <JsonLd data={animeJsonLd} />
{/if}

{#if !anime}
  <SkeletonDetail />
{:else}
  <section
    class="ad-hero"
    class:cover-fallback={!wideBannerUrl}
    style="--banner: url('{heroImageUrl}')"
  >
    <div class="ad-hero-bg" aria-hidden="true"></div>
    <div class="ad-hero-shade" aria-hidden="true"></div>

    <div class="ad-hero-inner">
      <div class="ad-info">
        <div class="ad-heading">
          {#if secondaryTitle}<p class="ad-native-title">{secondaryTitle}</p>{/if}
          <h1 class="ad-title">
            {#if visibleTitleLogo}
              <img
                class="ad-title-logo"
                src={visibleTitleLogo}
                alt={displayTitle}
                onerror={() => (failedTitleLogo = titleLogo)}
              />
              <span class="sr-only">{displayTitle}</span>
            {:else}
              {displayTitle}
            {/if}
          </h1>

          <div class="ad-meta" aria-label="Anime metadata">
            {#if scoreLabel}<span><b>★ {scoreLabel}</b> score</span>{/if}
            {#if seasonLabel}<span>{seasonLabel}</span>{/if}
            {#if anime.episodes}<span>{anime.episodes} episodes</span>{/if}
            {#if durationLabel}<span>{durationLabel} runtime</span>{/if}
            {#if anime.status}<span>{String(anime.status).replace(/_/g, " ")}</span>{/if}
          </div>

          {#if anime.genres?.length}
            <p class="ad-genres">
              {anime.genres.map((g: any) => typeof g === "string" ? g : g?.name).filter(Boolean).join(" / ")}
            </p>
          {/if}
        </div>

        <div class="ad-overview">
          <p class="ad-synopsis" class:open={synopsisOpen}>{synopsisOpen ? synopsisFull : synopsisShort}</p>
          {#if synopsisFull.length > 280}
            <button type="button" class="ad-readmore" onclick={() => (synopsisOpen = !synopsisOpen)}>
              {synopsisOpen ? "Show less" : "Read full synopsis"}
            </button>
          {/if}
        </div>
      </div>

      <div class="ad-poster-dock">
        {#if posterUrl}
          <div class="ad-poster"><img src={posterUrl} alt={displayTitle} /></div>
        {/if}
        <a href="/watch/{id}/1/" class="ad-btn primary" data-sveltekit-preload-data="hover"><span aria-hidden="true">▶</span> Play episode 1</a>
        <div class="ad-utility-actions">
          <button type="button" class:active={inWatchlist} disabled={processingWatchlist} onclick={toggleWatchlist}>
            {processingWatchlist ? "Saving..." : inWatchlist ? "✓ In watchlist" : "+ Watchlist"}
          </button>
          <button type="button" class:active={isFavorite} disabled={processingFavorite} onclick={toggleFavorite}>
            {processingFavorite ? "Saving..." : isFavorite ? "♥ Favorited" : "♡ Favorite"}
          </button>
          <button type="button" onclick={shareAnime}>↗ {shareLabel}</button>
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
          <div class="ad-ep-tools">
            {#if episodeRanges.length > 1}
              <label class="ad-ep-range">
                <Layers3 size={15} aria-hidden="true" />
                <span class="sr-only">Episode range</span>
                <select bind:value={epRangeIndex} aria-label="Episode range">
                  {#each episodeRanges as range (range.index)}
                    <option value={range.index}>{range.label}</option>
                  {/each}
                </select>
              </label>
            {/if}
            <label class="ad-ep-search">
              <span class="sr-only">Search episodes</span>
              <input
                type="search"
                placeholder="Search number or title…"
                bind:value={epQuery}
              />
            </label>
          </div>
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
            {#each visibleEpisodes as ep (ep.number)}
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
              title="{displayTitle} trailer"
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
    </div>
  </div>

  <div class="ad-related">
    {#if detailsLoading}
      <div class="ad-rows">
        <SkeletonRow count={8} />
      </div>
    {:else}
      {#if relations.length > 0}
        <div class="ad-rows">
          <Row title="Related chronology" items={relations} />
        </div>
      {/if}
      {#if recommendations.length > 0}
        <div class="ad-rows">
          <Row title="More from this shelf" items={recommendations} />
        </div>
      {/if}
    {/if}
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
  .ad-hero.cover-fallback .ad-hero-bg {
    transform: scale(1.12);
    filter: blur(18px) saturate(0.75) brightness(0.72);
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
    padding: 5.5rem var(--page-gutter, 2.5rem) 2.25rem;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-areas: "poster info";
    gap: 0 1.75rem;
    align-items: end;
    box-sizing: border-box;
  }
  .ad-info { grid-area: info; }
  .ad-poster-dock {
    grid-area: poster;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
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
  .ad-native-title {
    margin: 0 0 0.35rem;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.85rem;
    font-weight: 600;
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
  .ad-title:has(.ad-title-logo) {
    min-height: clamp(80px, 10vw, 140px);
    display: flex;
    align-items: flex-end;
  }
  .ad-title-logo {
    display: block;
    width: auto;
    max-width: min(420px, 100%);
    max-height: 140px;
    object-fit: contain;
    object-position: left center;
    filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.72));
  }
  .ad-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.9rem;
    margin-bottom: 0.6rem;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.82rem;
    font-weight: 600;
  }
  .ad-meta b {
    color: #fbbf24;
    font-weight: 800;
  }
  .ad-genres {
    margin: 0 0 0.9rem;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.82rem;
    font-weight: 600;
  }
  .ad-overview { max-width: 62ch; }
  .ad-synopsis {
    margin: 0;
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
  .ad-utility-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .ad-utility-actions button {
    flex: 1 1 auto;
    min-height: 40px;
    padding: 0.5rem 0.75rem;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(20, 20, 20, 0.6);
    color: rgba(255, 255, 255, 0.85);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .ad-utility-actions button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.28);
  }
  .ad-utility-actions button.active {
    border-color: rgba(255, 138, 61, 0.45);
    color: var(--net-red, #ff8a3d);
  }
  .ad-utility-actions button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
  .ad-ep-order,
  .ad-ep-tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
  }
  .ad-ep-tools { margin-left: auto; }
  .ad-ep-range {
    height: 38px;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding-left: 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: #EC5800;
  }
  .ad-ep-range select {
    height: 100%;
    min-width: 130px;
    border: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    background: #11110f;
    color: #fff;
    padding: 0 0.75rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 750;
    cursor: pointer;
  }
  .ad-ep-range:focus-within {
    border-color: rgba(236, 88, 0, 0.65);
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
  .ad-related {
    max-width: var(--page-max, 1500px);
    margin: 0 auto;
    padding: 0 var(--page-gutter, 2.5rem) 2.5rem;
    box-sizing: border-box;
  }
  .ad-related .ad-rows:first-child {
    margin-top: 0;
  }
  @media (max-width: 860px) {
    .ad-related {
      padding: 0 var(--page-gutter-md, 1.25rem) 2rem;
    }
  }
  @media (max-width: 560px) {
    .ad-related {
      padding: 0 var(--page-gutter-sm, 0.85rem) 1.75rem;
    }
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
      gap: 0 1.25rem;
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
      padding: 4.5rem var(--page-gutter-md, 1.25rem) 1.5rem;
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
    .ad-main {
      order: 1;
    }
    .ad-main.hidden-mobile > :not(.ad-tabs) {
      display: none;
    }
  }

  @media (max-width: 560px) {
    .ad-hero {
      min-height: 0;
    }
    .ad-hero-inner {
      grid-template-columns: 1fr;
      grid-template-areas:
        "poster"
        "info";
      justify-items: start;
      padding: 4.25rem var(--page-gutter-sm, 0.75rem) 1.5rem;
    }
    .ad-poster-dock {
      width: 100%;
    }
    .ad-poster {
      max-width: 150px;
    }
    .ad-title {
      font-size: 1.45rem;
    }
    .ad-btn.primary {
      width: 100%;
    }
    .ad-body {
      padding: 0.85rem var(--page-gutter-sm, 0.75rem) 1.75rem;
    }
    .ad-ep-tools {
      width: 100%;
      margin-left: 0;
    }
    .ad-ep-range,
    .ad-ep-search {
      flex: 1 1 100%;
    }
    .ad-ep-range select,
    .ad-ep-search input {
      width: 100%;
      min-width: 0;
    }
    .ad-ep-grid {
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    }
    .chars-rich-grid { grid-template-columns: 1fr; }
    .char-rich { grid-template-columns: 76px 1fr; }
    .char-rich-art { width: 76px; height: 104px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; }
  }

  /* Editorial detail desk */
  .ad-hero { background:#070706; }
  .ad-hero-bg { filter:saturate(.78) contrast(1.03); }
  .ad-hero-shade { background:linear-gradient(90deg,#070706 0%,rgba(7,7,6,.88) 38%,rgba(7,7,6,.35) 72%),linear-gradient(180deg,rgba(7,7,6,.12),#070706 100%); }
  .ad-hero-inner,.ad-body { max-width:var(--page-max,1500px); }
  .ad-poster img { border-radius:4px;box-shadow:none;border:1px solid #302923; }
  .ad-title { color:var(--editorial-text,#f1ece4);font-size:clamp(2rem,4vw,3.7rem);line-height:.98;letter-spacing:-.055em;text-shadow:none; }
  .ad-genres,.ad-meta { border-color:var(--editorial-line,#28231f); }
  .ad-btn { border-radius:3px;transition:background .15s,border-color .15s,color .15s; }
  .ad-btn.primary { background:var(--editorial-accent,#df886b);color:#170c09;box-shadow:none; }
  .ad-btn.primary:hover { transform:none;filter:none;background:var(--editorial-accent-hover,#f1a287); }
  .ad-utility-actions button { border-radius:3px;background:#0d0c0b;border-color:#332c27; }
  .ad-utility-actions button:hover:not(:disabled) { background:#171310;border-color:#4b3d35; }
  .ad-side { border-radius:4px;background:var(--editorial-surface,#0d0c0b);border-color:var(--editorial-line,#28231f); }
  .ad-tabs { border-color:var(--editorial-line,#28231f); }.ad-tab.active{color:var(--editorial-accent-hover,#f1a287)}.ad-tab.active::after{height:1px;background:var(--editorial-accent,#df886b)}
  .ad-mini,.ad-ep-search input { border-radius:3px;background:#0d0c0b;border-color:#332c27; }.ad-mini.active{background:#df886b;color:#170c09;border-color:#df886b}
  .ad-ep-grid { gap:1.4rem .8rem; }.ad-ep-thumb { border-radius:3px;border-color:#302923; }.ad-ep-badge{border-radius:2px}.ad-ep-play{background:rgba(7,7,6,.55)}
  .char-rich { border-radius:4px;background:#0d0c0b;border-color:#28231f; }.char-rich:hover{background:#151210;border-color:#4a3c35}.char-rich-art,.ad-trailer{border-radius:3px}.char-role-badge.main{background:#df886b;color:#170c09;border-color:#df886b}
  @media(max-width:860px){.ad-hero-inner{padding-left:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-right))}.ad-body{padding-left:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-right))}}
  @media(max-width:560px){.ad-hero-inner,.ad-body{padding-left:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-right))}}

  /* Mobile cinematic detail composition */
  @media (max-width: 560px) {
    .ad-hero {
      min-height: 0;
      border-bottom: 1px solid var(--editorial-line, #28231f);
    }
    .ad-hero-bg {
      background-position: 58% top;
      transform: scale(1.02);
      filter: saturate(.72) contrast(1.05);
    }
    .ad-hero-shade {
      background:
        linear-gradient(90deg, rgba(7,7,6,.92) 0%, rgba(7,7,6,.56) 54%, rgba(7,7,6,.28) 100%),
        linear-gradient(180deg, rgba(7,7,6,.14) 0%, rgba(7,7,6,.72) 35%, #070706 76%, #070706 100%);
    }
    .ad-hero-inner {
      grid-template-columns: 116px minmax(0, 1fr);
      grid-template-areas:
        "poster info"
        "overview overview"
        "primary primary"
        "utilities utilities";
      gap: .9rem 1rem;
      align-items: end;
      justify-items: stretch;
      padding-top: 3.7rem;
      padding-bottom: 1.2rem;
    }
    .ad-info,
    .ad-poster-dock {
      display: contents;
    }
    .ad-heading {
      grid-area: info;
      min-width: 0;
      align-self: end;
      padding-bottom: .05rem;
    }
    .ad-poster {
      grid-area: poster;
      width: 116px;
      max-width: none;
      align-self: end;
    }
    .ad-poster img {
      border-color: #4a3c35;
      box-shadow: 9px 12px 0 rgba(7, 7, 6, .5);
    }
    .ad-native-title {
      overflow: hidden;
      margin: 0 0 .32rem;
      color: #9a9189;
      font-size: .66rem;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ad-title {
      margin-bottom: .62rem;
      color: var(--editorial-text, #f1ece4);
      font-size: clamp(1.28rem, 6vw, 1.52rem);
      line-height: 1.02;
      letter-spacing: -.045em;
      text-wrap: balance;
    }
    .ad-meta {
      gap: .32rem;
      margin: 0 0 .48rem;
      font-size: .66rem;
      line-height: 1;
    }
    .ad-meta span {
      min-height: 24px;
      display: inline-flex;
      align-items: center;
      padding: .28rem .42rem;
      color: #b6aea6;
      background: rgba(13, 12, 11, .84);
      border: 1px solid #332c27;
      border-radius: 2px;
      text-transform: capitalize;
    }
    .ad-meta b {
      color: #efa086;
    }
    .ad-genres {
      display: -webkit-box;
      overflow: hidden;
      margin: 0;
      color: #9a9189;
      font-size: .68rem;
      line-height: 1.35;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }
    .ad-overview {
      grid-area: overview;
      max-width: none;
      padding-top: .15rem;
      border-top: 1px solid rgba(73, 61, 53, .62);
    }
    .ad-synopsis {
      display: -webkit-box;
      overflow: hidden;
      padding-top: .78rem;
      color: #b8b0a8;
      font-size: .82rem;
      line-height: 1.55;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      line-clamp: 4;
    }
    .ad-synopsis.open {
      display: block;
      overflow: visible;
      -webkit-line-clamp: unset;
      line-clamp: unset;
    }
    .ad-readmore {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      margin-top: .1rem;
      color: #efa086;
      font-size: .76rem;
    }
    .ad-btn.primary {
      grid-area: primary;
      width: 100%;
      min-height: 48px;
      color: #170c09;
      border: 1px solid #efa086;
      background: #df886b;
      font-size: .86rem;
      letter-spacing: -.01em;
    }
    .ad-utility-actions {
      grid-area: utilities;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: .4rem;
    }
    .ad-utility-actions button {
      min-width: 0;
      min-height: 46px;
      padding: .52rem .3rem;
      overflow: hidden;
      color: #a59d95;
      background: rgba(13, 12, 11, .92);
      border-color: #332c27;
      font-size: .69rem;
      line-height: 1.15;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ad-utility-actions button.active {
      color: #efa086;
      border-color: #8b5746;
      box-shadow: inset 0 -2px #df886b;
    }
    .ad-body {
      padding-top: .9rem;
    }
    .ad-tabs {
      flex-wrap: nowrap;
      gap: 1.15rem;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      margin: 0 0 1rem;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .ad-tabs::-webkit-scrollbar {
      display: none;
    }
    .ad-tab {
      flex: 0 0 auto;
      min-height: 46px;
      padding: .75rem 0;
      font-size: .78rem;
      white-space: nowrap;
    }
    .ad-main {
      order: 0;
    }
    .ad-side.active-mobile {
      order: 1;
      margin-top: 0;
    }
  }
</style>
