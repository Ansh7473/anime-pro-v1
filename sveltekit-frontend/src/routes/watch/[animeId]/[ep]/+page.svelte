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
  let ep = $state(1);

  $effect(() => {
    const dataEp = parseInt(tempEpUrl as string) || 1;
    if (ep !== dataEp) {
      ep = dataEp;
      loadSources();
    }
  });

  let anime: any = $state(null);
  let recommendations: any[] = $state([]);
  let sources: any[] = $state([]);
  let episodes: any[] = $state([]);
  let selectedSource: any = $state(null);

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
      if (!isRotated) {
        const player =
          document.querySelector(".video-wrapper") || document.documentElement;
        const isMobile = isMobileDevice();

        if (isMobile) {
          // Enter fullscreen first
          if (!document.fullscreenElement && player.requestFullscreen) {
            try {
              await player.requestFullscreen();
            } catch (e) {}
          }

          // Use native Android bridge if available (Capacitor app)
          if (hasNativeRotation()) {
            // @ts-ignore
            window.AndroidRotation.lockLandscape();
          } else {
            // Fallback: try web orientation API (works in mobile Chrome)
            await new Promise((r) => setTimeout(r, 300));
            // @ts-ignore
            if (screen.orientation && screen.orientation.lock) {
              try {
                // @ts-ignore
                await screen.orientation.lock("landscape");
              } catch (e) {
                console.warn("Orientation lock failed:", e);
              }
            }
          }
        } else {
          // DESKTOP: Just enter fullscreen (works as rotate/expand)
          if (!document.fullscreenElement && player.requestFullscreen) {
            try {
              await player.requestFullscreen();
            } catch (e) {}
          }
        }
        isRotated = true;
      } else {
        // EXIT: Unlock orientation, then exit fullscreen
        if (hasNativeRotation()) {
          // @ts-ignore
          window.AndroidRotation.unlock();
        } else {
          // @ts-ignore
          if (screen.orientation && screen.orientation.unlock) {
            // @ts-ignore
            try {
              screen.orientation.unlock();
            } catch (e) {}
          }
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch (e) {}
        }
        isRotated = false;
      }
    } catch (e) {
      console.warn("Screen rotation error", e);
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

    loadSources();
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
        if (res?.data?.sources) {
          const providerSources = res.data.sources.map((s: any) => ({
            ...s,
            provider: s.provider || config.name,
          }));

          // Add to global sources list reactively
          sources = [...sources, ...providerSources];

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
  <!-- Video Player Section -->
  <div class="player-section" class:theater={theaterMode}>
    <div class="player-container container" class:theater={theaterMode}>
      <div class="video-wrapper glass" class:theater={theaterMode}>
        {#if sourceLoading}
          <div class="overlay">
            <div class="spinner"></div>
            <p>Fetching best sources...</p>
          </div>
        {:else if error}
          <div class="overlay error">
            <AlertCircle size={48} color="#e50914" />
            <p>{error}</p>
            <button class="btn-secondary" onclick={loadSources}>Retry</button>
          </div>
        {:else if selectedSource}
          {#if selectedSource.isEmbed || selectedSource.url.includes("embed") || selectedSource.type === "iframe"}
            <div
              class="iframe-container"
              style="width: 100%; height: 100%; position: relative;"
            >
              <iframe
                src={selectedSource.url}
                allowfullscreen
                title="Video Player"
                class="video-frame"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
                referrerpolicy="no-referrer"
              ></iframe>
              <!-- Fallback explicit retry warning under iframe in case it gets Refused -->
              <div
                class="iframe-fallback"
                role="presentation"
                style="position: absolute; top: 10px; right: 10px; z-index: 50; opacity: 0.85; transition: opacity 0.2s;"
                onmouseenter={(e) => (e.currentTarget.style.opacity = "1")}
                onmouseleave={(e) => (e.currentTarget.style.opacity = "0.85")}
              >
                <button
                  class="btn-secondary"
                  style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"
                  onclick={(e) => {
                    e.preventDefault();
                    document
                      .querySelector(".grouped-sources")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <AlertCircle size={14} /> Video not loading? Try another server
                </button>
              </div>
            </div>
          {:else}
            <video
              bind:this={videoElement}
              controls
              class="video-element"
              poster={getProxiedImage(anime?.image || anime?.poster)}
              onended={handleVideoEnded}
              ontimeupdate={saveProgress}
            >
              <track kind="captions" />
            </video>
          {/if}

          <!-- Resume Prompt -->
          {#if showResumePrompt}
            <div class="resume-overlay">
              <div class="resume-card glass">
                <p>
                  Resume from <strong>{formatTime(resumeTime)}</strong>?
                </p>
                <div class="resume-actions">
                  <button class="resume-btn primary" onclick={resumePlayback}
                    >Resume</button
                  >
                  <button class="resume-btn" onclick={dismissResume}
                    >Start Over</button
                  >
                </div>
              </div>
            </div>
          {/if}

          <!-- Auto-Next Countdown Overlay -->
          {#if showCountdown}
            <div class="countdown-overlay">
              <div class="countdown-card glass">
                <div class="countdown-ring">
                  <svg viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="26" class="ring-bg" />
                    <circle
                      cx="30"
                      cy="30"
                      r="26"
                      class="ring-progress"
                      style="--progress: {((5 - countdownSeconds) / 5) * 100}"
                    />
                  </svg>
                  <span class="countdown-num">{countdownSeconds}</span>
                </div>
                <div class="countdown-info">
                  <p class="countdown-label">Next Episode</p>
                  <p class="countdown-ep">Episode {ep + 1}</p>
                </div>
                <button class="countdown-cancel" onclick={cancelCountdown}
                  >Cancel</button
                >
              </div>
            </div>
          {/if}

          <div class="player-controls-overlay">
            <button
              class="control-btn hide-desktop"
              class:active={isRotated}
              title="Rotate Screen"
              onclick={toggleRotation}
            >
              <RotateCw size={18} />
            </button>
            <button
              class="control-btn"
              title="Theater Mode (T)"
              onclick={() => (theaterMode = !theaterMode)}
            >
              <Maximize size={18} />
            </button>
            <button
              class="control-btn"
              title="Picture in Picture"
              onclick={togglePiP}
            >
              <Monitor size={18} />
            </button>
            <button
              class="control-btn"
              class:active={autoNext}
              title="Auto Next (N)"
              onclick={() => (autoNext = !autoNext)}
            >
              <SkipForward size={18} />
            </button>
            <button
              class="control-btn"
              title="Shortcuts (?)"
              onclick={() => (showShortcuts = !showShortcuts)}
            >
              <Keyboard size={18} />
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Shortcuts Modal -->
  {#if showShortcuts}
    <div
      class="shortcuts-backdrop"
      onclick={() => (showShortcuts = false)}
      onkeydown={(e) => e.key === "Escape" && (showShortcuts = false)}
      role="presentation"
      tabindex="-1"
    >
      <div
        class="shortcuts-modal glass"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="-1"
        aria-label="Keyboard shortcuts"
      >
        <h3>⌨️ Keyboard Shortcuts</h3>
        <div class="shortcut-grid">
          <kbd>F</kbd><span>Toggle Fullscreen</span>
          <kbd>T</kbd><span>Toggle Theater Mode</span>
          <kbd>N</kbd><span>Next Episode</span>
          <kbd>P</kbd><span>Previous Episode</span>
          <kbd>?</kbd><span>Show Shortcuts</span>
          <kbd>Esc</kbd><span>Close / Cancel</span>
        </div>
        <button class="btn-secondary" onclick={() => (showShortcuts = false)}
          >Close</button
        >
      </div>
    </div>
  {/if}

  <div class="player-info container">
    <div class="info-grid">
      <!-- Main Content -->
      <div class="main-info">
        <div class="ep-header">
          <div class="title-box">
            <h1 class="anime-title">{anime?.title || "Loading..."}</h1>
            <div class="meta-row">
              <div class="ep-badge">Episode {ep}</div>
              <ReactionsBar {animeId} episode={ep} />
              <button
                class="nav-secondary-btn"
                onclick={() =>
                  document
                    .querySelector("#community")
                    ?.scrollIntoView({ behavior: "smooth" })}
              >
                <MessageSquare size={16} /> Community
              </button>
            </div>
          </div>
          <div class="ep-nav">
            <button
              class="nav-btn"
              onclick={() => changeEp(ep - 1)}
              disabled={ep <= 1}
            >
              <ChevronLeft size={20} />
            </button>
            <button class="nav-btn" onclick={() => changeEp(ep + 1)}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <!-- Source Selector -->
        {#if Object.keys(groupedSources).length > 0}
          <div class="section-box">
            <h3 class="section-label">
              <Server size={14} /> Streaming Providers
            </h3>
            
            <div class="provider-dropdowns-grid">
              {#each Object.entries(groupedSources) as [provider, categories]}
                <div class="provider-dropdown-box">
                  <div class="dropdown-label">
                     <Monitor size={12} /> {provider}
                  </div>
                  <div class="custom-select-wrapper">
                    <select 
                      class="premium-select glass"
                      onchange={(e) => {
                         const url = e.currentTarget.value;
                         const allSources = sources;
                         const src = allSources.find(s => s.url === url);
                         if (src) handleSourceChange(src);
                      }}
                      value={Object.values(categories).flat().some(s => s.url === selectedSource?.url) ? selectedSource?.url : ""}
                    >
                      <option value="" disabled selected>Select Server...</option>
                      {#each Object.entries(categories) as [category, categorySources]}
                        <optgroup label={category}>
                          {#each categorySources as src}
                            <option value={src.url}>
                              {src.name || "Default"} {src.quality ? `(${src.quality})` : ""}
                            </option>
                          {/each}
                        </optgroup>
                      {/each}
                    </select>
                    <div class="dropdown-arrow">
                       <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Episode Selection -->
        <div class="section-box mt">
          <h3 class="section-label">
            <Play size={14} /> Episodes ({episodes.length})
          </h3>

          <!-- Episode Range Dropdown Selector -->
          {#if totalPages > 1}
            <div class="ep-selector-row">
              <div class="ep-range-select-wrapper">
                <span class="range-label">Select Range:</span>
                <select 
                  class="ep-range-select glass" 
                  value={currentEpPage}
                  onchange={(e) => goToEpPage(parseInt(e.currentTarget.value))}
                >
                  {#each epPageRanges as range}
                    <option value={range.index}>{range.label}</option>
                  {/each}
                </select>
                <div class="dropdown-arrow-mini">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          {/if}

          <div class="ep-grid">
            {#each displayedEpisodes as episode}
              <button
                class="ep-card"
                class:active={episode.number === ep}
                onclick={() => changeEp(episode.number)}
              >
                <div class="ep-img-box">
                  <img
                    src={getProxiedImage(episode.image || anime?.poster)}
                    alt="Ep {episode.number}"
                    loading="lazy"
                  />
                  <div class="ep-play-overlay">
                    <Play size={18} fill="white" />
                  </div>
                </div>
                <div class="ep-details">
                  <span class="ep-num">Episode {episode.number}</span>
                  <span class="ep-name line-clamp-1"
                    >{episode.title || `Episode ${episode.number}`}</span
                  >
                </div>
              </button>
            {/each}
          </div>
          <!-- ep-grid -->
        </div>
        <!-- section-box -->

        <div id="community" class="comments-wrapper mt-5">
          <CommentsSection {animeId} episode={ep} />
        </div>
      </div>
      <!-- main-info -->

      <!-- Sidebar (About the series) -->
      <aside class="sidebar">
        <div class="anime-meta-card glass">
          <img
            src={anime?.poster || anime?.image}
            alt={anime?.title}
            class="side-poster"
          />
          <div class="side-info">
            <h4>About the series</h4>
            <div class="tags">
              <span class="tag">{anime?.type}</span>
              <span class="tag">{anime?.status}</span>
              <span class="tag">{anime?.year}</span>
            </div>
            <p class="side-desc">{anime?.synopsis?.slice(0, 150)}...</p>
            <a href="/anime/{animeId}" class="link-btn">Show Details</a>
          </div>
        </div>
      </aside>
    </div>
    <!-- info-grid -->
  </div>
  <!-- player-info container -->

  <!-- Related & Recommendations -->
  <div class="container pb-10">
    {#if anime?.relations?.length > 0}
      <div class="mt-8">
        <Row title="Related Seasons & Prequels" items={anime.relations} />
      </div>
    {/if}

    {#if recommendations.length > 0}
      <div class="mt-8">
        <Row title="You Might Also Like" items={recommendations} />
      </div>
    {/if}
  </div>

  <LiveChat {animeId} episode={ep} />
</div>

<!-- player-page -->

<style>
  .player-page {
    background: #080808;
    min-height: 100vh;
    padding-bottom: 4rem;
    overflow-x: hidden;
  }

  /* Fallback CSS Rotation for Mobile WebView */
  :global(.video-wrapper.css-rotated) {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    width: 100vh !important;
    height: 100vw !important;
    transform: translate(-50%, -50%) rotate(90deg) !important;
    transform-origin: center center !important;
    z-index: 9999 !important;
    background: black !important;
    border-radius: 0 !important;
    max-width: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  :global(.video-wrapper.css-rotated video),
  :global(.video-wrapper.css-rotated iframe) {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    border-radius: 0 !important;
  }

  :global(.css-rotated .player-controls-overlay) {
    z-index: 10000 !important;
  }

  .player-section {
    background: #000;
    padding: 2rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: padding 0.3s ease;
    position: relative;
    z-index: 5;
  }
  .player-section.theater {
    padding: 0;
  }
  .player-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  .player-container.theater {
    max-width: 100% !important;
    padding: 0 !important;
    width: 100%;
  }
  .video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    transition: border-radius 0.3s ease;
  }
  .video-wrapper.theater {
    border-radius: 0;
    aspect-ratio: 21/9;
    max-height: 85vh;
  }
  .video-element,
  .video-frame {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border: none;
  }

  .player-controls-overlay {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 20;
  }
  .video-wrapper:hover .player-controls-overlay {
    opacity: 1;
  }
  .control-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s;
  }
  .control-btn:hover {
    background: var(--net-red);
    border-color: var(--net-red);
  }
  .control-btn.active {
    color: var(--net-red);
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: var(--net-text-muted);
    background: rgba(0, 0, 0, 0.9);
    z-index: 10;
  }
  .overlay.error {
    color: #f87171;
  }

  /* Resume Prompt */
  .resume-overlay {
    position: absolute;
    bottom: 5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  .resume-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem 1.2rem;
    border-radius: 12px;
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .resume-card p {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .resume-card strong {
    color: white;
  }
  .resume-actions {
    display: flex;
    gap: 0.5rem;
  }
  .resume-btn {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    background: rgba(255, 255, 255, 0.06);
  }
  .resume-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .resume-btn.primary {
    background: var(--net-red);
    border-color: var(--net-red);
  }
  .resume-btn.primary:hover {
    background: #ff1e2b;
  }

  /* Auto-Next Countdown */
  .countdown-overlay {
    position: absolute;
    inset: 0;
    z-index: 30;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
  }
  .countdown-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem 2rem;
    border-radius: 16px;
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }
  .countdown-ring {
    position: relative;
    width: 60px;
    height: 60px;
  }
  .countdown-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 3;
  }
  .ring-progress {
    fill: none;
    stroke: var(--net-red);
    stroke-width: 3;
    stroke-dasharray: 163.36;
    stroke-dashoffset: calc(163.36 - (163.36 * var(--progress)) / 100);
    stroke-linecap: round;
    transition: stroke-dashoffset 1s linear;
  }
  .countdown-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
  }
  .countdown-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .countdown-label {
    font-size: 0.8rem;
    color: var(--net-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .countdown-ep {
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
  }
  .countdown-cancel {
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    transition: 0.2s;
    margin-left: 0.5rem;
  }
  .countdown-cancel:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  /* Shortcuts Modal */
  .shortcuts-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .shortcuts-modal {
    padding: 2rem;
    border-radius: 16px;
    min-width: 320px;
    background: rgba(20, 20, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  .shortcuts-modal h3 {
    margin-bottom: 1.5rem;
    font-size: 1.2rem;
  }
  .shortcut-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem 1.5rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 30px;
    padding: 0 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.85rem;
    color: white;
    font-weight: 600;
  }
  .shortcut-grid span {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }

  .player-info {
    margin-top: 2.5rem;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2.5rem;
  }

  .ep-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 2rem;
  }
  .title-box {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .meta-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .anime-title {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .ep-badge {
    display: inline-block;
    padding: 6px 16px;
    background: rgba(229, 9, 20, 0.15);
    color: var(--net-red);
    border-radius: 50px;
    font-weight: 800;
    font-size: 0.9rem;
    border: 1px solid rgba(229, 9, 20, 0.1);
  }
  .ep-nav {
    display: flex;
    gap: 0.5rem;
  }
  .nav-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--net-card-bg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s;
  }
  .nav-btn:hover:not(:disabled) {
    background: var(--net-red);
    border-color: var(--net-red);
  }
  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .nav-secondary-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--net-text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s;
  }
  .nav-secondary-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .section-box {
    margin-bottom: 2rem;
  }
  .section-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--net-text-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .grouped-sources {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .provider-dropdowns-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-top: 1rem;
  }
  .provider-dropdown-box {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .dropdown-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--net-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 6px;
    padding-left: 4px;
  }
  .custom-select-wrapper {
    position: relative;
    width: 100%;
  }
  .premium-select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding: 12px 16px;
    padding-right: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }
  .premium-select:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--net-red);
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.15);
  }
  .premium-select:focus {
    border-color: var(--net-red);
    box-shadow: 0 0 25px rgba(229, 9, 20, 0.2);
  }
  .premium-select option, .premium-select optgroup {
    background: #0f0f12;
    color: white;
    padding: 12px;
  }
  .premium-select optgroup {
    font-weight: 800;
    color: var(--net-red);
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
  }
  .dropdown-arrow {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--net-text-muted);
    transition: 0.3s;
  }
  .premium-select:focus + .dropdown-arrow {
    transform: translateY(-50%) rotate(180deg);
    color: var(--net-red);
  }
  .dropdown-arrow {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--net-text-muted);
    transition: 0.3s;
  }
  .premium-select:focus + .dropdown-arrow {
    transform: translateY(-50%) rotate(180deg);
    color: var(--net-red);
  }

  .ep-selector-row {
     display: flex;
     justify-content: flex-end;
     margin-bottom: 1.5rem;
  }
  .ep-range-select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.03);
    padding: 6px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .range-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--net-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .ep-range-select {
    appearance: none;
    background: none;
    border: none;
    color: white;
    font-weight: 800;
    font-size: 0.9rem;
    padding-right: 24px;
    cursor: pointer;
    outline: none;
  }
  .ep-range-select option {
    background: #0f0f12;
    color: white;
  }
  .dropdown-arrow-mini {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--net-red);
  }

  .ep-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1.25rem;
    max-height: 600px;
    overflow-y: auto;
    padding: 0.5rem;
    padding-right: 0.75rem;
    scrollbar-width: thin;
  }
  .ep-grid::-webkit-scrollbar {
    width: 5px;
  }
  .ep-grid::-webkit-scrollbar-thumb {
    background: var(--net-red);
    border-radius: 10px;
  }
  .ep-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 6px;
    border-radius: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ep-card:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-4px);
    border-color: rgba(229, 9, 20, 0.2);
  }
  .ep-img-box {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    overflow: hidden;
  }
  .ep-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: 0.5s;
  }
  .ep-play-overlay {
    position: absolute;
    inset: 0;
    background: rgba(229, 9, 20, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.3s;
  }
  .ep-card:hover .ep-play-overlay,
  .ep-card.active .ep-play-overlay {
    opacity: 1;
  }
  .ep-card.active {
    background: rgba(229, 9, 20, 0.1);
    border-color: var(--net-red);
  }
  .ep-details {
    padding: 0 4px 4px;
  }
  .ep-num {
    font-size: 0.85rem;
    font-weight: 850;
    color: white;
    display: block;
    margin-bottom: 2px;
  }
  .ep-name {
    font-size: 0.75rem;
    color: var(--net-text-muted);
  }

  .sidebar {
    position: sticky;
    top: 100px;
    height: fit-content;
  }
  .anime-meta-card {
    padding: 1.5rem;
    border-radius: var(--radius-xl);
  }
  .side-poster {
    width: 100%;
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }
  .side-info h4 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }
  .tags {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .tag {
    font-size: 0.7rem;
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--net-text-muted);
  }
  .side-desc {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    line-height: 1.5;
    margin-bottom: 1.5rem;
  }
  .link-btn {
    display: block;
    text-align: center;
    padding: 10px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: 0.2s;
  }
  .link-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  @media (max-width: 1024px) {
    .info-grid {
      grid-template-columns: 1fr;
    }
    .sidebar {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .player-section {
      padding: 1rem 0;
    }
    .player-container {
      padding: 0 1rem;
    }
    .video-wrapper {
      border-radius: var(--radius-lg);
    }
    .player-controls-overlay {
      top: 0.5rem;
      right: 0.5rem;
    }
    .control-btn {
      width: 32px;
      height: 32px;
    }

    .resume-overlay {
      bottom: 4rem;
    }
    .resume-card {
      padding: 0.6rem 1rem;
    }
    .resume-card p {
      font-size: 0.8rem;
    }
    .resume-btn {
      padding: 0.4rem 0.8rem;
      font-size: 0.75rem;
    }

    .countdown-card {
      padding: 1rem 1.5rem;
      gap: 1rem;
    }
    .countdown-ring {
      width: 50px;
      height: 50px;
    }
    .countdown-num {
      font-size: 1.2rem;
    }
    .countdown-label {
      font-size: 0.7rem;
    }
    .countdown-ep {
      font-size: 0.95rem;
    }
    .countdown-cancel {
      padding: 0.4rem 1rem;
      font-size: 0.75rem;
    }

    .shortcuts-modal {
      padding: 1.5rem;
      min-width: 280px;
    }
    .shortcuts-modal h3 {
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    .shortcut-grid {
      gap: 0.5rem 1rem;
    }
    kbd {
      min-width: 32px;
      height: 28px;
      font-size: 0.8rem;
    }
    .shortcut-grid span {
      font-size: 0.85rem;
    }

    .player-info {
      margin-top: 1.5rem;
    }
    .ep-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .ep-nav {
      width: 100%;
      justify-content: space-between;
    }
    .anime-title {
      font-size: 1.5rem;
    }
    .ep-badge {
      font-size: 0.8rem;
      padding: 4px 12px;
    }
    .meta-row {
      gap: 1rem;
    }

    .section-box {
      margin-bottom: 1.5rem;
    }
    .section-label {
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }

    .provider-dropdowns-grid {
       grid-template-columns: 1fr;
    }

    .ep-selector-row {
       justify-content: center;
    }
    .ep-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
      max-height: 450px;
    }
    .ep-num {
      font-size: 0.75rem;
    }
    .ep-name {
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .player-section {
      padding: 0.5rem 0;
    }
    .player-container {
      padding: 0 0.5rem;
    }
    .video-wrapper {
      border-radius: var(--radius-md);
    }

    .resume-overlay {
      bottom: 3rem;
    }
    .resume-card {
      padding: 0.5rem 0.75rem;
      gap: 0.75rem;
    }
    .resume-card p {
      font-size: 0.75rem;
    }
    .resume-btn {
      padding: 0.35rem 0.7rem;
      font-size: 0.7rem;
    }

    .countdown-card {
      padding: 0.75rem 1rem;
      flex-direction: column;
      text-align: center;
    }
    .countdown-ring {
      width: 45px;
      height: 45px;
    }
    .countdown-num {
      font-size: 1rem;
    }
    .countdown-info {
      align-items: center;
    }
    .countdown-cancel {
      margin-left: 0;
      margin-top: 0.5rem;
      width: 100%;
    }

    .shortcuts-modal {
      padding: 1rem;
      min-width: 260px;
    }
    .shortcuts-modal h3 {
      font-size: 0.95rem;
    }
    .shortcut-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    kbd {
      width: 100%;
    }

    .anime-title {
      font-size: 1.25rem;
    }
    .ep-badge {
      font-size: 0.75rem;
      padding: 3px 10px;
    }
    .nav-btn {
      width: 40px;
      height: 40px;
    }

    .premium-select {
       padding: 10px 14px;
       font-size: 0.85rem;
    }

    .ep-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.75rem;
    }
    .ep-num {
      font-size: 0.7rem;
    }
    .ep-name {
      font-size: 0.65rem;
    }
  }
</style>
