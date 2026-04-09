<script lang="ts">
  import { api, getProxiedImage, getProxiedUrl } from "$lib/api";
  import Row from "$lib/components/Row.svelte";
  import { auth } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { onMount, onDestroy, untrack } from "svelte";
  import {
    Play,
    ChevronLeft,
    ChevronRight,
    Server,
    AlertCircle,
    Maximize,
    Monitor,
    SkipForward,
    Keyboard,
    RotateCw,
    MessageSquare,
    ChevronDown,
  } from "lucide-svelte";
  import Hls from "hls.js";
  import ReactionsBar from "$lib/components/ReactionsBar.svelte";
  import LiveChat from "$lib/components/LiveChat.svelte";
  import CommentsSection from "$lib/components/CommentsSection.svelte";

  let { data } = $props();
  const animeId = $derived(data.animeId);

  let tempEpUrl = $derived(data.ep);
  let ep = $state(0);
  let currentLoadId = 0;

  $effect(() => {
    const dataEp = parseInt(tempEpUrl as string) || 1;
    // Use untrack to avoid infinite loops if loadSources changes other tracked state
    untrack(() => {
      if (ep !== dataEp) {
        ep = dataEp;
        loadSources();
      }
    });
  });

  let anime: any = $state(null);
  let recommendations: any[] = $state([]);
  let sources: any[] = $state([]);
  let episodes: any[] = $state([]);
  let selectedSource: any = $state(null);

  let isEmbedPlayer = $derived.by(() => {
    if (!selectedSource) return false;
    return (
      selectedSource.isEmbed ||
      selectedSource.type === "iframe" ||
      selectedSource.url.includes("embed") ||
      !selectedSource.url.includes(".m3u8")
    );
  });

  // Episode pagination
  let currentEpPage = $state(0);
  const EPISODES_PER_PAGE = 50;

  // Derived values for pagination
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
    const end = start + EPISODES_PER_PAGE;
    return episodes.slice(start, end);
  });

  function goToEpPage(pageIndex: number) {
    currentEpPage = pageIndex;
  }

  // Group sources by Provider first, then by Language/Category
  let groupedSources = $derived.by(() => {
    const providerGroups: Record<string, Record<string, any[]>> = {};

    for (const src of sources) {
      let providerName = src.provider || "Unknown Provider";
      // Cleanup names
      if (providerName === "AnimeHindiDubbed-WP")
        providerName = "AHD (AnimeHindiDubbed)";

      let cat = "Subbed";
      const lang = (src.language || "").toLowerCase();
      const type = (src.type || "").toLowerCase();
      const c = (src.category || "").toLowerCase();
      const provLow = providerName.toLowerCase();

      if (
        lang.includes("hindi") ||
        c === "hindi" ||
        ((lang.includes("multi") || lang === "multi-audio") &&
          (provLow.includes("desidub") || provLow.includes("hindi")))
      ) {
        cat = "Hindi Dub";
      } else if (lang.includes("english") || c === "dub" || type === "dub") {
        cat = "English Dub";
      } else if (c === "raw" || type === "raw") {
        cat = "Raw / Unsubbed";
      }

      if (!providerGroups[providerName]) providerGroups[providerName] = {};
      if (!providerGroups[providerName][cat])
        providerGroups[providerName][cat] = [];
      providerGroups[providerName][cat].push(src);
    }

    return providerGroups;
  });

  let loading = $state(true);
  let sourceLoading = $state(false);
  let error = $state("");

  let videoElement: HTMLVideoElement | null = $state(null);
  let hls: Hls | null = null;
  let theaterMode = $state(false);
  let autoNext = $state($auth.currentProfile?.autoNext ?? true);
  let autoSkip = $state($auth.currentProfile?.autoSkip ?? false);
  let lastSavedTime = 0;

  // Auto-next countdown
  let showCountdown = $state(false);
  let countdownSeconds = $state(5);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Resume prompt
  let showResumePrompt = $state(false);
  let resumeTime = $state(0);

  // Keyboard shortcuts tooltip
  let showShortcuts = $state(false);

  let isRotated = $state(false);

  function isMobileDevice() {
    if (typeof window === "undefined" || typeof navigator === "undefined")
      return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  }

  // Check if native Android orientation bridge is available (Capacitor app)
  function hasNativeRotation(): boolean {
    // @ts-ignore
    return typeof window !== "undefined" && !!window.AndroidRotation;
  }

  async function toggleRotation() {
    try {
      const player = document.querySelector(".video-container");
      if (!player) return;

      if (!isRotated) {
        // ENTER ROTATION / LANDSCAPE
        if (isMobileDevice()) {
          // 1. First try native/web Fullscreen
          if (!document.fullscreenElement && player.requestFullscreen) {
            await player.requestFullscreen().catch(() => {});
          }

          // 2. Try to Lock Orientation
          if (hasNativeRotation()) {
            // @ts-ignore
            window.AndroidRotation.lockLandscape();
          // @ts-ignore
          } else if (screen.orientation && screen.orientation.lock) {
            // Wait slightly for fullscreen transition before locking
            await new Promise(r => setTimeout(r, 200));
            try {
              // @ts-ignore
              await screen.orientation.lock("landscape");
            } catch (e) {
              console.warn("Soft lock failed:", e);
            }
          }
        } else {
          // DESKTOP/TV: Just maximize
          if (!document.fullscreenElement && player.requestFullscreen) {
            await player.requestFullscreen();
          }
        }
        isRotated = true;
      } else {
        // EXIT ROTATION
        if (hasNativeRotation()) {
          // @ts-ignore
          window.AndroidRotation.unlock();
        } else if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock();
          } catch (e) {}
        }

        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
        isRotated = false;
      }
    } catch (e) {
      console.warn("Rotation error:", e);
      // Fallback: just toggle the state so CSS can try to handle it
      isRotated = !isRotated;
    }
  }

  function startCountdown() {
    if (!autoNext || ep >= episodes.length) return;
    showCountdown = true;
    countdownSeconds = 5;
    countdownInterval = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        cancelCountdown();
        changeEp(ep + 1);
      }
    }, 1000);
  }

  function cancelCountdown() {
    showCountdown = false;
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  async function saveProgress() {
    if (!videoElement || !$auth.token || !videoElement.currentTime) return;
    if (videoElement.currentTime - lastSavedTime < 30 && !videoElement.ended)
      return;

    try {
      await api.updateHistory($auth.token, {
        animeId: animeId.toString(),
        animeTitle: anime?.title || "",
        animePoster: anime?.image || anime?.poster || "",
        episodeNumber: ep,
        progress: videoElement.currentTime,
        duration: videoElement.duration,
        completed:
          videoElement.ended ||
          videoElement.currentTime / videoElement.duration > 0.9,
      });
      lastSavedTime = videoElement.currentTime;
    } catch (e) {
      console.error("Failed to save progress:", e);
    }
  }

  function togglePiP() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (videoElement) {
      videoElement.requestPictureInPicture();
    }
  }

  function handleVideoEnded() {
    saveProgress();
    if (autoNext && ep < episodes.length) {
      startCountdown();
    }
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Don't trigger if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    switch (e.key.toLowerCase()) {
      case "f":
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          videoElement?.closest(".video-wrapper")?.requestFullscreen();
        }
        break;
      case "t":
        e.preventDefault();
        theaterMode = !theaterMode;
        break;
      case "n":
        e.preventDefault();
        if (ep < episodes.length) changeEp(ep + 1);
        break;
      case "p":
        e.preventDefault();
        if (ep > 1) changeEp(ep - 1);
        break;
      case "escape":
        cancelCountdown();
        showShortcuts = false;
        break;
      case "?":
        showShortcuts = !showShortcuts;
        break;
    }
  }

  async function checkResumeProgress() {
    if (!$auth.token) return;
    try {
      const history = await api.getHistory($auth.token);
      if (Array.isArray(history)) {
        const entry = history.find(
          (h: any) =>
            h.animeId === animeId.toString() &&
            h.episodeNumber === ep &&
            !h.completed,
        );
        if (entry && entry.progress > 30) {
          resumeTime = entry.progress;
          showResumePrompt = true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  function resumePlayback() {
    if (videoElement && resumeTime > 0) {
      videoElement.currentTime = resumeTime;
    }
    showResumePrompt = false;
  }

  function dismissResume() {
    showResumePrompt = false;
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  onMount(async () => {
    try {
      const [animeRes, metaRes, recsRes] = await Promise.all([
        api.getAnime(animeId),
        api.getEpisodeMetadata(animeId, 1, 2000), // Increase to load all episodes
        api.getRecommendations(animeId),
      ]);
      anime = animeRes;
      episodes = metaRes?.data?.episodes || [];
      recommendations = recsRes || [];

      // Auto-select pagination page that contains the current episode
      if (ep > 0 && episodes.length > 0) {
        const pageIdx = Math.floor((ep - 1) / EPISODES_PER_PAGE);
        if (pageIdx >= 0 && pageIdx < totalPages) {
          currentEpPage = pageIdx;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }

    checkResumeProgress();
  });

  // Watch for 'ep' changes locally to keep pagination synced (next/prev ep buttons)
  $effect(() => {
    if (ep > 0 && episodes.length > 0) {
      const targetPage = Math.floor((ep - 1) / EPISODES_PER_PAGE);
      untrack(() => {
        if (currentEpPage !== targetPage && targetPage < totalPages) {
          currentEpPage = targetPage;
        }
      });
    }
  });

  onDestroy(() => {
    if (hls) hls.destroy();
    cancelCountdown();
  });

  async function loadSources() {
    const loadId = ++currentLoadId;
    sourceLoading = true;
    error = "";
    sources = [];
    selectedSource = null;
    cancelCountdown();

    if (hls) {
      hls.destroy();
      hls = null;
    }

    const providerConfigs = [
      { name: "9anime", fetcher: api.getNineAnimeSources },
      { name: "Animelok", fetcher: api.getAnimelokSources },
      { name: "DesiDub", fetcher: api.getDesiDubSources },
      { name: "AnimeHindiDubbed", fetcher: api.getAHDSources },
      { name: "Toonstream", fetcher: api.getToonstreamSources },
    ];

    let autoStarted = false;
    let providersFinished = 0;

    // Handle each provider independently
    providerConfigs.forEach(async (config) => {
      try {
        const res = await config.fetcher(animeId, ep);
        // Guard: If a new load request started, discard these results
        if (loadId !== currentLoadId) return;

        if (res?.data?.sources) {
          const providerSources = res.data.sources.map((s: any) => ({
            ...s,
            provider: s.provider || config.name,
          }));

          // Deduplicate: Don't add if URL already exists
          const uniqueNewSources = providerSources.filter(
            (ns: any) => !sources.some((s) => s.url === ns.url),
          );

          // Add to global sources list reactively
          sources = [...sources, ...uniqueNewSources];

          // Auto-select logic if we haven't started anything yet
          if (!autoStarted && providerSources.length > 0) {
            const preferredLang = (
              $auth.currentProfile?.language || "multi"
            ).toLowerCase();

            let bestMatch = null;
            if (preferredLang === "hindi") {
              bestMatch = providerSources.find(
                (s: any) =>
                  (s.language || "").toLowerCase().includes("hindi") ||
                  (s.category || "").toLowerCase() === "hindi",
              );
            } else if (preferredLang === "english" || preferredLang === "dub") {
              bestMatch = providerSources.find(
                (s: any) =>
                  (s.language || "").toLowerCase().includes("english") ||
                  (s.type || "").toLowerCase() === "dub",
              );
            }

            // Start player with the best match from this batch, or just the first available source
            // if it's the first provider to return and we have no match.
            const candidate = bestMatch || providerSources[0];
            if (candidate && !autoStarted) {
              selectedSource = candidate;
              autoStarted = true;

              // CRITICAL: Stop blocking the UI if we have a valid source to play
              sourceLoading = false;

              const isEmbed =
                selectedSource.isEmbed ||
                selectedSource.type === "iframe" ||
                selectedSource.url.includes("embed") ||
                !selectedSource.url.includes(".m3u8");

              if (!isEmbed) {
                initPlayer(selectedSource.url);
              } else {
                if (videoElement) {
                  videoElement.pause();
                  videoElement.src = "";
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Provider ${config.name} failed:`, err);
      } finally {
        providersFinished++;
        if (providersFinished === providerConfigs.length) {
          sourceLoading = false;
          if (sources.length === 0) {
            error = "No sources found for this episode on any provider.";
          }
        }
      }
    });

    // Fallback: If after 8 seconds we have nothing, stop loading
    setTimeout(() => {
      if (
        sourceLoading &&
        sources.length === 0 &&
        providersFinished < providerConfigs.length
      ) {
        // We don't force stop, but we set a flag or log
        console.log("Still waiting for some slow providers...");
      }
    }, 8000);
  }

  function initPlayer(url: string) {
    if (!videoElement) return;
    if (hls) hls.destroy();

    const isHls = url.includes(".m3u8") || url.includes("/m3u8");

    if (isHls && Hls.isSupported()) {
      hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        xhrSetup: (xhr, url) => {
          // If the segment URL is from a restricted provider, route it through our proxy
          const restrictedOrigins = [
            "anvod.pro",
            "uwucdn.top",
            "anivid.icu",
            "pahe.win",
            "bysewihe.com",
            "short.icu",
          ];
          const isRestricted = restrictedOrigins.some((origin) =>
            url.includes(origin),
          );

          if (isRestricted && !url.includes("/streaming/proxy")) {
            const proxyBase =
              "https://anime-pro-v1-backend-go.vercel.app/api/v1/streaming/proxy";
            const referer = url.includes("desidub")
              ? "https://www.desidubanime.me/"
              : url.includes("animehindidubbed")
                ? "https://animehindidubbed.in/"
                : "https://animelok.xyz/";

            const proxiedUrl = `${proxyBase}?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`;
            xhr.open("GET", proxiedUrl, true);
          }
        },
      });
      hls.loadSource(url);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement?.play().catch(() => {});

        // Apply Auto Skip Intro if enabled (approximate for now)
        if (autoSkip && videoElement && videoElement.currentTime < 5) {
          videoElement.currentTime = 85;
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              break;
          }
        }
      });
    } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
      videoElement.src = url;
      videoElement.addEventListener("loadedmetadata", () => {
        videoElement?.play().catch(() => {});
      });
    } else {
      videoElement.src = url;
    }
  }

  $effect(() => {
    if (selectedSource) {
      const isEmbed =
        selectedSource.isEmbed ||
        selectedSource.url.includes("embed") ||
        selectedSource.type === "iframe" ||
        !selectedSource.url.includes(".m3u8");
      if (!isEmbed && videoElement) {
        initPlayer(selectedSource.url);
      } else if (videoElement) {
        if (hls) hls.destroy();
        videoElement.pause();
        videoElement.src = "";
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    }
  });

  function changeEp(newEp: number) {
    ep = newEp;
    showResumePrompt = false;
    cancelCountdown();
    lastSavedTime = 0;
    goto(`/watch/${animeId}/${newEp}`, { replaceState: true });
    loadSources();
    checkResumeProgress();
  }

  function handleSourceChange(src: any) {
    selectedSource = src;
  }
</script>

<svelte:head>
  <title>{anime?.title || "Player"} — Episode {ep} — AnimePro</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="player-page">
  <!-- Cinematic Background Blur -->
  <div
    class="page-background"
    style="background-image: url({getProxiedImage(
      anime?.image || anime?.poster,
    )})"
  ></div>
  <div class="page-overlay"></div>

  <!-- Top Navigation Bar (Floating) -->
  <div class="top-nav container">
    <div class="nav-left">
      <button class="nav-back-btn" onclick={() => goto(`/anime/${animeId}`)}>
        <ChevronLeft size={20} />
      </button>
      <div
        class="top-logo"
        onclick={() => goto("/")}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === "Enter" && goto("/")}
      >
        <span class="logo-text">ANIME<span class="logo-accent">AP</span></span>
      </div>
    </div>
    <div class="top-nav-meta">
      <span class="watching-label">Now Watching</span>
      <h2 class="anime-mini-title">
        {typeof anime?.title === "object"
          ? anime.title.english ||
            anime.title.romaji ||
            anime.title.userPreferred
          : anime?.title || "Loading..."}
      </h2>
    </div>
  </div>

  <!-- Main Content Layout -->
  <div class="watch-layout container">
    <!-- Left Column: Video & Main Controls -->
    <div class="primary-section">
      <div class="player-wrapper" class:theater={theaterMode}>
        <div 
          class="video-container" 
          class:theater={theaterMode}
          class:is-rotated={isRotated}
        >
          {#if sourceLoading && sources.length === 0}
            <div class="overlay-state">
              <div class="spinner-premium"></div>
              <p>Scanning best available servers...</p>
            </div>
          {:else if error && sources.length === 0}
            <div class="overlay-state error">
              <AlertCircle size={48} />
              <p>{error}</p>
              <button class="btn-retry" onclick={loadSources}>Try Again</button>
            </div>
          {:else if selectedSource}
            {#if selectedSource.isEmbed || selectedSource.url.includes("embed") || selectedSource.type === "iframe"}
              <div class="iframe-box">
                <iframe
                  src={selectedSource.url}
                  allowfullscreen
                  title="Video Player"
                  class="video-frame"
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
                  referrerpolicy="no-referrer"
                ></iframe>
                <div class="iframe-nav-tip">
                  <p>
                    <AlertCircle size={14} /> Change server below if player is slow
                    ↓
                  </p>
                </div>
              </div>
            {:else}
              <video
                bind:this={videoElement}
                controls
                class="video-element"
                poster={getProxiedImage(anime?.banner || anime?.image)}
                onended={handleVideoEnded}
                ontimeupdate={saveProgress}
              >
                <track kind="captions" />
              </video>
            {/if}

            <!-- In-Player Overlays (Only for native video) -->
            {#if !isEmbedPlayer}
              {#if showResumePrompt}
                <div class="resume-popup glass">
                  <div class="resume-icon"><RotateCw size={24} /></div>
                  <div class="resume-text">
                    <p>
                      Resume from <strong>{formatTime(resumeTime)}</strong>?
                    </p>
                  </div>
                  <div class="resume-btns">
                    <button class="res-btn-p" onclick={resumePlayback}
                      >Resume</button
                    >
                    <button class="res-btn-s" onclick={dismissResume}
                      >Reset</button
                    >
                  </div>
                </div>
              {/if}

              {#if showCountdown}
                <div class="next-countdown glass">
                  <div class="countdown-circle">
                    <svg viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="28" class="bg" />
                      <circle
                        cx="30"
                        cy="30"
                        r="28"
                        class="progress"
                        style="--progress: {((5 - countdownSeconds) / 5) * 100}"
                      />
                    </svg>
                    <span class="val">{countdownSeconds}</span>
                  </div>
                  <div class="next-info">
                    <span class="label">Up Next</span>
                    <span class="ep">Episode {ep + 1}</span>
                  </div>
                  <button class="cancel-next" onclick={cancelCountdown}
                    >Cancel</button
                  >
                </div>
              {/if}

              <!-- Bottom Playback Overlays -->
              <div class="controls-overlay" class:visible={!theaterMode}></div>
            {/if}
            
            <!-- Global Utils (Needed for both but positioned carefully) -->
            <div class="top-controls-hub">
              <div class="controls-group">
                <button
                  class="ctrl-btn"
                  class:active={isRotated}
                  title="Rotate"
                  onclick={toggleRotation}
                >
                  <RotateCw size={18} />
                </button>
                <button
                  class="ctrl-btn"
                  title="Shortcuts"
                  onclick={() => (showShortcuts = !showShortcuts)}
                >
                  <Keyboard size={18} />
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Provider / Source TABS -->
      {#if Object.keys(groupedSources).length > 0}
        <div class="server-selection cards-glass">
          <div class="server-header">
            <h3><Server size={18} /> Select Server</h3>
            <div class="server-stats">
              <span>{sources.length} Sources Found</span>
            </div>
          </div>

          <div class="provider-grid">
            {#each Object.entries(groupedSources) as [provider, categories]}
              <div class="provider-card">
                <div class="prov-name">{provider}</div>
                <div class="quality-tabs">
                  {#each Object.entries(categories) as [category, categorySources]}
                    <div class="category-group">
                      <span class="cat-label">{category}</span>
                      <div class="source-chips">
                        {#each categorySources as src}
                          <button
                            class="source-chip"
                            class:active={selectedSource?.url === src.url}
                            onclick={() => handleSourceChange(src)}
                          >
                            {src.name || "Default"}
                            {#if src.quality}<span class="q">{src.quality}</span
                              >{/if}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Episodes Navigation -->
      <div class="episodes-section cards-glass mt-6">
        <div class="section-header">
          <div class="header-main">
            <h3><Play size={18} /> Episodes</h3>
            <span class="ep-count">{episodes.length} total</span>
          </div>

          {#if totalPages > 1}
            <div class="range-selector">
              <select
                class="range-select"
                value={currentEpPage}
                onchange={(e) => goToEpPage(parseInt(e.currentTarget.value))}
              >
                {#each epPageRanges as range}
                  <option value={range.index}>Batch: {range.label}</option>
                {/each}
              </select>
              <ChevronDown size={14} class="ptr-none" />
            </div>
          {/if}
        </div>

        <div class="episodes-grid">
          {#each displayedEpisodes as episode}
            <button
              class="episode-card"
              class:current={episode.number === ep}
              onclick={() => changeEp(episode.number)}
            >
              <div class="ep-thumb">
                <img
                  src={getProxiedImage(episode.image || anime?.poster)}
                  alt="Ep {episode.number}"
                  loading="lazy"
                />
                <div class="ep-hover">
                  <Play size={20} fill="white" />
                </div>
                {#if episode.number === ep}
                  <div class="playing-tag">PLAYING</div>
                {/if}
              </div>
              <div class="ep-meta">
                <div class="ep-num-row">
                  <span class="num">Episode {episode.number}</span>
                  {#if episode.isFiller}<span class="filler-tag">Filler</span
                    >{/if}
                </div>
                <p class="name line-clamp-1">
                  {episode.title || `Episode ${episode.number}`}
                </p>
                <div class="ep-progress-bar">
                  <div
                    class="progress-fill"
                    style="width: {episode.progressPercent || 0}%"
                  ></div>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div class="community-section mt-10" id="community">
        <CommentsSection {animeId} episode={ep} />
      </div>
    </div>

    <!-- Right Column: Metadata & Engagement -->
    <aside class="side-info-section">
      <div class="anime-quick-card glass">
        <div class="quick-header">
          <img
            src={anime?.image || anime?.poster}
            alt={anime?.title}
            class="quick-poster"
          />
          <div class="quick-titles">
            <h1 class="main-title">{anime?.title}</h1>
            <div class="quick-stats">
              <span>{anime?.type}</span>
              <span class="dot"></span>
              <span>{anime?.year}</span>
              <span class="dot"></span>
              <span class="status">{anime?.status}</span>
            </div>
          </div>
        </div>

        <div class="engagement-row">
          <ReactionsBar {animeId} episode={ep} />
        </div>

        <div class="quick-synopsis">
          <p>{anime?.synopsis?.slice(0, 180)}...</p>
          <a href="/anime/{animeId}" class="read-more">View Full Details</a>
        </div>
      </div>

      <div class="side-actions mt-6">
        <button
          class="nav-secondary-btn w-full"
          onclick={() =>
            document
              .getElementById("community")
              ?.scrollIntoView({ behavior: "smooth" })}
        >
          <MessageSquare size={16} /> Show Comments
        </button>
      </div>

      {#if recommendations.length > 0}
        <div class="side-recommendations mt-8">
          <h4 class="side-label">You Might Also Like</h4>
          <div class="side-recs-list">
            {#each recommendations.slice(0, 5) as rec}
              <a href="/anime/{rec.id}" class="side-rec-item">
                <img src={getProxiedImage(rec.image)} alt={rec.title} />
                <div class="rec-meta">
                  <span class="rec-title line-clamp-2">{rec.title}</span>
                  <span class="rec-type">{rec.type} • {rec.year}</span>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}
      <!-- Live Chat (Integrated for Desktop/TV) -->
      <div class="hidden md:block mt-8">
        <LiveChat {animeId} episode={ep} isInline={true} />
      </div>
    </aside>
  </div>

  <!-- Live Chat (Full Width for Mobile) -->
  <div class="md:hidden container mt-8 px-4">
    <LiveChat {animeId} episode={ep} isInline={false} />
  </div>

  <!-- Related Content (Bottom) -->
  <div class="container mt-12 pb-20">
    {#if anime?.relations?.length > 0}
      <div class="bottom-row">
        <Row title="Related Work" items={anime.relations} />
      </div>
    {/if}
  </div>

  <!-- Shortcuts Dialog -->
  {#if showShortcuts}
    <div
      class="shortcuts-overlay"
      onclick={() => (showShortcuts = false)}
      onkeydown={(e) => e.key === "Escape" && (showShortcuts = false)}
      role="button"
      tabindex="0"
      aria-label="Close shortcuts"
    >
      <div
        class="shortcuts-modal-clean"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="shortcuts-title"
        tabindex="-1"
      >
        <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
        <div class="key-list">
          <div class="key-item">
            <kbd>F</kbd> <span>Toggle Fullscreen</span>
          </div>
          <div class="key-item"><kbd>T</kbd> <span>Theater Mode</span></div>
          <div class="key-item"><kbd>N</kbd> <span>Next Episode</span></div>
          <div class="key-item"><kbd>P</kbd> <span>Previous Episode</span></div>
          <div class="key-item"><kbd>?</kbd> <span>Toggle Help</span></div>
        </div>
        <button class="close-modal-btn" onclick={() => (showShortcuts = false)}
          >GOT IT</button
        >
      </div>
    </div>
  {/if}
</div>

<!-- player-page -->

<style>
  /* --- Premium Design System Overrides --- */
  :root {
    --glass-bg: rgba(15, 15, 18, 0.7);
    --glass-border: rgba(255, 255, 255, 0.08);
    --accent-red: #e50914;
    --accent-glow: rgba(229, 9, 20, 0.3);
  }

  .player-page {
    position: relative;
    min-height: 100vh;
    background: #050505;
    color: #fff;
    overflow-x: hidden;
    padding-bottom: 5rem;
  }

  .page-background {
    position: fixed;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(80px) saturate(1.5) brightness(0.3);
    z-index: 0;
    transform: scale(1.1);
  }

  .page-overlay {
    position: fixed;
    inset: 0;
    background: radial-gradient(
        circle at top right,
        rgba(229, 9, 20, 0.05),
        transparent
      ),
      linear-gradient(to bottom, transparent, #050505);
    z-index: 1;
  }

  .top-nav {
    position: relative;
    z-index: 100;
    padding: 1.5rem 1rem;
    padding-top: max(1.5rem, env(safe-area-inset-top));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    display: flex;
    align-items: center;
    justify-content: space-between;
    animation: fadeInDown 0.8s ease;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .top-logo {
    cursor: pointer;
    transition: transform 0.3s;
  }
  .top-logo:hover {
    transform: scale(1.05);
  }

  .logo-text {
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: -1px;
    color: #fff;
  }
  .logo-accent {
    color: var(--accent-red);
    text-shadow: 0 0 15px var(--accent-glow);
  }

  .nav-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 45px;
    height: 45px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    transition: 0.3s;
    backdrop-filter: blur(10px);
  }

  .nav-back-btn:hover {
    background: var(--accent-red);
    border-color: var(--accent-red);
    transform: translateX(-5px) scale(1.1);
  }

  .top-nav-meta {
    text-align: right;
  }

  .watching-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--net-text-muted);
    margin-bottom: 4px;
    font-weight: 800;
  }

  .anime-mini-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: #fff;
  }

  /* Layout */
  .watch-layout {
    position: relative;
    z-index: 5;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 2.5rem;
    margin-top: 1rem;
  }

  .primary-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* Video & Player */
  .player-wrapper {
    width: 100%;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .player-wrapper.theater {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    background: #000;
  }

  .video-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: 20px;
    overflow: hidden;
    box-shadow:
      0 30px 60px rgba(0, 0, 0, 0.8),
      0 0 0 1px var(--glass-border);
    transition: border-radius 0.5s;
  }

  .video-container.theater {
    border-radius: 0;
    height: 100%;
    box-shadow: none;
  }

  /* Rotation Lock Styles */
  .video-container.is-rotated {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 5000;
    border-radius: 0;
    background: #000;
  }

  @media (orientation: portrait) {
    .video-container.is-rotated {
      width: 100vh;
      height: 100vw;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(90deg);
    }
  }

  .video-element,
  .video-frame,
  .iframe-box {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
  }

  .iframe-box {
    position: relative;
    overflow: hidden;
    background: #000;
  }

  .iframe-nav-tip {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--glass-border);
    pointer-events: none;
    opacity: 0;
    transition: 0.3s;
    z-index: 10;
  }
  .iframe-box:hover .iframe-nav-tip {
    opacity: 1;
  }
  .iframe-nav-tip p {
    margin: 0;
    font-size: 0.75rem;
    color: var(--net-text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* Overlay States */
  .overlay-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    gap: 1.5rem;
    z-index: 10;
  }

  .spinner-premium {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(229, 9, 20, 0.1);
    border-top: 3px solid var(--accent-red);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 20px var(--accent-glow);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Controls Overlay */
  .controls-overlay {
    position: absolute;
    bottom: 0px;
    left: 0;
    right: 0;
    padding: 4rem 2rem 1.5rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
    display: flex;
    justify-content: flex-end;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 100;
  }

  .video-container:hover .controls-overlay {
    opacity: 1;
    transform: translateY(0);
    /* Keep pointer-events none so it doesn't block iframe seekbars */
    pointer-events: none;
  }

  .controls-group {
    display: flex;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    padding: 0.5rem;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
  }

  .ctrl-btn {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: transparent;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: 0.2s;
  }

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--accent-red);
  }
  .ctrl-btn.active {
    background: var(--accent-red);
    color: #fff;
  }

  /* Sections */
  .cards-glass {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 2rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .header-main {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .header-main h3 {
    font-size: 1.5rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ep-count {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }

  /* Provider Card Design */
  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .provider-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 1.25rem;
  }

  .prov-name {
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--net-text-muted);
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--glass-border);
    padding-bottom: 0.5rem;
  }

  .category-group {
    margin-bottom: 1rem;
  }

  .cat-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--accent-red);
    margin-bottom: 0.75rem;
  }

  .source-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .source-chip {
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
    border-radius: 10px;
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.3s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .source-chip:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #fff;
  }

  .source-chip.active {
    background: var(--accent-red);
    border-color: var(--accent-red);
    box-shadow: 0 4px 15px var(--accent-glow);
  }

  .source-chip .q {
    font-size: 0.65rem;
    opacity: 0.6;
    background: rgba(0, 0, 0, 0.3);
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* Episode Cards Update */
  .episodes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .episode-card {
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: 0.3s;
  }

  .ep-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 0.75rem;
    border: 1px solid var(--glass-border);
  }

  .ep-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ep-hover {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
    backdrop-filter: blur(2px);
  }

  .episode-card:hover .ep-thumb img {
    transform: scale(1.1);
  }
  .episode-card:hover .ep-hover {
    opacity: 1;
  }

  .episode-card.current .ep-thumb {
    border: 2px solid var(--accent-red);
    box-shadow: 0 0 20px var(--accent-glow);
  }

  .playing-tag {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: var(--accent-red);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 4px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .ep-meta .num {
    display: block;
    font-size: 0.9rem;
    font-weight: 800;
    margin-bottom: 2px;
  }

  .ep-num-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .filler-tag {
    font-size: 0.6rem;
    background: rgba(255, 165, 0, 0.2);
    color: orange;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 800;
  }

  .ep-progress-bar {
    width: 100%;
    height: 3px;
    background: rgba(255, 255, 255, 0.1);
    margin-top: 8px;
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--accent-red);
  }

  .ep-meta .name {
    font-size: 0.8rem;
    color: var(--net-text-muted);
  }

  /* Side Info Header */
  .side-info-section {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .anime-quick-card {
    padding: 1.5rem;
    border-radius: 20px;
    border: 1px solid var(--glass-border);
  }

  .quick-header {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .quick-poster {
    width: 90px;
    aspect-ratio: 2/3;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
  }

  .main-title {
    font-size: 1.25rem;
    font-weight: 900;
    line-height: 1.2;
    margin-bottom: 8px;
  }

  .quick-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--net-text-muted);
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.3;
  }
  .status {
    color: #10b981;
    font-weight: 700;
  }

  .engagement-row {
    margin-bottom: 1.5rem;
    padding: 1rem 0;
    border-top: 1px solid var(--glass-border);
    border-bottom: 1px solid var(--glass-border);
  }

  .quick-synopsis p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--net-text-muted);
    margin-bottom: 1rem;
  }

  .read-more {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--accent-red);
    text-decoration: none;
  }

  /* Overlays UI */
  .resume-popup,
  .next-countdown {
    position: absolute;
    bottom: 2rem;
    left: 2rem;
    z-index: 50;
    padding: 1.5rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    max-width: 400px;
    animation: slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .resume-icon {
    color: var(--accent-red);
  }
  .res-btn-p {
    padding: 8px 20px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8px;
    font-weight: 800;
    cursor: pointer;
  }
  .res-btn-s {
    background: transparent;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 15px;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .countdown-circle {
    position: relative;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .countdown-circle svg {
    position: absolute;
    transform: rotate(-90deg);
    width: 100%;
    height: 100%;
  }
  .countdown-circle .bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 3;
  }
  .countdown-circle .progress {
    fill: none;
    stroke: var(--accent-red);
    stroke-width: 4;
    stroke-dasharray: 175.9;
    stroke-dashoffset: calc(175.9 - (175.9 * var(--progress)) / 100);
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear;
  }
  .countdown-circle .val {
    font-size: 1.25rem;
    font-weight: 900;
  }

  /* Misc */
  .range-selector {
    position: relative;
    display: flex;
    align-items: center;
  }
  .range-selector::after {
    content: "▼";
    font-size: 0.6rem;
    position: absolute;
    right: 12px;
    pointer-events: none;
    color: var(--net-text-muted);
    opacity: 0.7;
  }

  .range-select {
    appearance: none;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    padding: 8px 36px 8px 16px;
    border-radius: 10px;
    color: #fff;
    font-weight: 800;
    font-size: 0.8rem;
    cursor: pointer;
    transition: 0.3s;
    outline: none;
  }
  .range-select:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .range-select option {
    background: #111;
    color: #fff;
    padding: 10px;
  }

  /* TV Mode Enhancements */
  :global(.tv-mode) .watch-layout {
    grid-template-columns: 1fr;
  }
  :global(.tv-mode) .side-info-section {
    display: none;
  }
  :global(.tv-mode) .episode-card:focus-visible {
    transform: scale(1.1);
    background: var(--accent-red);
    box-shadow: 0 0 50px var(--accent-glow);
    z-index: 100;
  }
  :global(.tv-mode) .source-chip:focus-visible {
    background: #fff;
    color: #000;
    transform: scale(1.1);
  }

  @media (max-width: 1100px) {
    .watch-layout {
      grid-template-columns: 1fr;
    }
    .side-info-section {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .watch-layout {
      gap: 1.5rem;
    }
    .cards-glass {
      padding: 1.25rem;
      border-radius: 16px;
    }

    /* MOBILE LIST VIEW: Thumbnail on left, title on right */
    .episodes-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .episode-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      border: 1px solid transparent;
    }

    .episode-card.current {
      background: rgba(229, 9, 20, 0.1);
      border-color: rgba(229, 9, 20, 0.3);
    }

    .ep-thumb {
      width: 120px;
      flex-shrink: 0;
      margin-bottom: 0;
    }

    .ep-meta {
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @media (max-width: 480px) {
    .video-container {
      border-radius: 12px;
    }

    .resume-popup,
    .next-countdown {
      bottom: 1rem;
      left: 1rem;
      right: 1rem;
      max-width: calc(100% - 2rem);
      padding: 1rem;
    }
  }

  /* Shortcuts Modal */
  .shortcuts-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .shortcuts-modal-clean {
    background: #111;
    border: 1px solid var(--glass-border);
    padding: 2.5rem;
    border-radius: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  }

  .key-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .key-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .key-item kbd {
    background: #fff;
    color: #000;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 800;
    min-width: 35px;
    text-align: center;
    box-shadow: 0 4px 0 rgba(255, 255, 255, 0.2);
  }

  .close-modal-btn {
    width: 100%;
    margin-top: 2rem;
    padding: 1rem;
    background: var(--accent-red);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-weight: 800;
    cursor: pointer;
    transition: 0.3s;
  }
  .close-modal-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px var(--accent-glow);
  }

  /* Top Controls Hub */
  .top-controls-hub {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    z-index: 120;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    /* Hub container should not block clicks, only buttons should */
    pointer-events: none;
  }

  .video-container:hover .top-controls-hub {
    opacity: 1;
    transform: translateY(0);
    /* Allow interaction with hub buttons, but container remains transparent to clicks */
  }

  .top-controls-hub .controls-group {
    pointer-events: auto;
  }

  .controls-group {
    display: flex;
    gap: 0.75rem;
    padding: 0.6rem;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  /* Utilities */
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
  }
</style>
