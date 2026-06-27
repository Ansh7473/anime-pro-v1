<script lang="ts">
  import { api, getProxiedImage, getProxiedUrl, BACKEND_URL } from "$lib/api";
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
  // LiveChat & CommentsSection are lazy-loaded (below the fold) to keep
  // their ~28KB out of the initial watch chunk.

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
  let posterColor = $state(""); // dominant poster color as "r, g, b"
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

  // HEURISTIC TRACKING (For Iframes/Embeds)
  let timeSpentInEpisode = $state(0);
  let sessionStartTime = Date.now();
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Auto-next countdown
  let showCountdown = $state(false);
  let countdownSeconds = $state(5);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Resume prompt
  let showResumePrompt = $state(false);
  let resumeTime = $state(0);

  // Keyboard shortcuts tooltip
  let showShortcuts = $state(false);

  // Collapsible LiveChat state
  let showLiveChat = $state(false);
  // Lazy-loaded heavy components (kept out of the initial watch chunk)
  let LiveChatComp: any = $state(null);
  let CommentsComp: any = $state(null);
  let commentsEl: HTMLElement | null = $state(null);
  function loadLiveChat() {
    if (!LiveChatComp)
      import("$lib/components/LiveChat.svelte").then((m) => (LiveChatComp = m.default));
  }
  // Mount comments only when scrolled near (below the fold).
  onMount(() => {
    if (!commentsEl) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          import("$lib/components/CommentsSection.svelte").then(
            (m) => (CommentsComp = m.default),
          );
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(commentsEl);
    return () => io.disconnect();
  });

  // Collapsible Server Selection state
  let showServers = $state(true);
  let openProvider = $state<string | null>(null);

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

  async function saveProgress(force = false) {
    const isEmbed = isEmbedPlayer;
    const token = $auth.token;
    if (!token) return;

    let currentPos = 0;
    let totalDur = 0;
    let isCompleted = false;

    if (!isEmbed && videoElement) {
      if (!videoElement.currentTime) return;
      currentPos = videoElement.currentTime;
      totalDur = videoElement.duration || 1440;
      isCompleted = videoElement.ended || (currentPos / totalDur > 0.9);

      // Throttling for native video
      if (!force && !videoElement.ended && currentPos - lastSavedTime < 30) return;
    } else if (isEmbed) {
      // Heuristic tracking for embeds
      currentPos = timeSpentInEpisode;
      totalDur = 1440; // Estimated 24 mins
      isCompleted = currentPos > 1200; // Completed after 20 mins of active watching

      // Throttling for embeds
      if (!force && !isCompleted && currentPos - lastSavedTime < 60) return;
    } else {
      return;
    }

    try {
      await api.updateHistory(token, {
        animeId: String(animeId),
        animeTitle: anime?.title || "",
        animePoster: anime?.image || anime?.poster || "",
        episodeNumber: ep,
        progress: currentPos,
        duration: totalDur,
        completed: isCompleted,
        profileId: $auth.currentProfile?.id ? String($auth.currentProfile.id) : undefined,
      });
      lastSavedTime = currentPos;
      console.log(`[Monitor] Progress synced: ${currentPos}s / ${totalDur}s (Completed: ${isCompleted})`);
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
            h.animeId === String(animeId) &&
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
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  onMount(async () => {
    try {
      const [animeRes, metaRes, recsRes] = await Promise.all([
        api.getAnime(animeId),
        api.getEpisodeMetadata(animeId, 1, 2000), // Increase to load all episodes
        api.getRecommendations(animeId),
      ]);
      anime = animeRes;
      extractPosterColor(getProxiedImage(anime?.image || anime?.poster));
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
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    cancelCountdown();
  });

  // Extract the dominant/vibrant color from the anime poster so the whole
  // watch screen background can adopt the colour of the exact anime.
  // Uses the proxied URL because the backend proxy sends CORS headers
  // (AniList's CDN does not), which keeps the canvas readable.
  function extractPosterColor(src: string) {
    if (!src || typeof window === "undefined") return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = 64;
        const h = 64;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        // Vibrant accumulator (saturated mid-tones)
        let vr = 0,
          vg = 0,
          vb = 0,
          vcount = 0;

        for (let i = 0; i < data.length; i += 4) {
          const cr = data[i];
          const cg = data[i + 1];
          const cb = data[i + 2];
          const ca = data[i + 3];
          if (ca < 125) continue;

          const max = Math.max(cr, cg, cb);
          const min = Math.min(cr, cg, cb);
          const lum = (max + min) / 2;
          const sat =
            max === min
              ? 0
              : lum > 127
                ? (max - min) / (510 - max - min)
                : (max - min) / (max + min);

          r += cr;
          g += cg;
          b += cb;
          count++;

          if (sat > 0.35 && lum > 40 && lum < 220) {
            vr += cr;
            vg += cg;
            vb += cb;
            vcount++;
          }
        }

        if (vcount > count * 0.02) {
          posterColor = `${Math.round(vr / vcount)}, ${Math.round(vg / vcount)}, ${Math.round(vb / vcount)}`;
        } else if (count > 0) {
          posterColor = `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
        }
      } catch (e) {
        // Tainted canvas or read error — keep the theme accent fallback.
        console.warn("Poster colour extraction failed:", e);
      }
    };
    img.onerror = () => {};
    img.src = src;
  }

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
      { name: "WatchAnimeWorld", fetcher: api.getWatchAnimeWorldSources },
      { name: "Aniwaves", fetcher: api.getAniwavesSources },
      { name: "Animen", fetcher: api.getAnimenSources },
      { name: "AnimixStream", fetcher: api.getAnimixStreamSources },
      { name: "AnimePahe", fetcher: api.getAnimePaheSources },
    ];

    let autoStarted = false;
    let providersFinished = 0;

    const choosePreferredSource = (providerSources: any[]) => {
      const preferredLang = ($auth.currentProfile?.language || "multi").toLowerCase();

      if (preferredLang === "hindi") {
        return providerSources.find(
          (s: any) =>
            (s.language || "").toLowerCase().includes("hindi") ||
            (s.category || "").toLowerCase() === "hindi",
        );
      }

      if (preferredLang === "english" || preferredLang === "dub") {
        return providerSources.find(
          (s: any) =>
            (s.language || "").toLowerCase().includes("english") ||
            (s.type || "").toLowerCase() === "dub",
        );
      }

      return null;
    };

    const addProviderSources = (config: (typeof providerConfigs)[number], res: any) => {
      if (loadId !== currentLoadId || !res?.data?.sources) return;

      const providerSources = res.data.sources.map((s: any) => ({
        ...s,
        provider: s.provider || config.name,
      }));

      console.log(`[Player] ${config.name} returned ${providerSources.length} sources`);

      const uniqueNewSources = providerSources.filter(
        (ns: any) => ns.url && !sources.some((s) => s.url === ns.url),
      );

      if (uniqueNewSources.length === 0) return;

      sources = [...sources, ...uniqueNewSources];

      if (!autoStarted) {
        const candidate = choosePreferredSource(uniqueNewSources) || uniqueNewSources[0];
        if (candidate) {
          selectedSource = candidate;
          autoStarted = true;
          sourceLoading = false;

          const isEmbed =
            selectedSource.isEmbed ||
            selectedSource.type === "iframe" ||
            selectedSource.url.includes("embed") ||
            !selectedSource.url.includes(".m3u8");

          if (!isEmbed) {
            initPlayer(selectedSource.url);
          } else if (videoElement) {
            videoElement.pause();
            videoElement.src = "";
          }
        }
      }
    };

    await Promise.allSettled(
      providerConfigs.map(async (config) => {
        try {
          console.log(`[Player] Fetching sources from ${config.name}...`);
          const res = await config.fetcher(animeId, ep);
          addProviderSources(config, res);
        } catch (err) {
          console.warn(`[Player] Provider ${config.name} failed:`, err);
        } finally {
          providersFinished++;
        }
      }),
    );

    if (loadId !== currentLoadId) return;

    sourceLoading = false;
    if (sources.length === 0) {
      error = "No sources found for this episode on any provider.";
    }
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
              `${BACKEND_URL}/api/v1/streaming/proxy`;
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

  // Tactical Monitoring Heartbeat
  $effect(() => {
    if (selectedSource && isEmbedPlayer) {
      console.log("[Monitor] Activating Heuristic Monitoring for embed.");
      // Start heartbeat
      heartbeatInterval = setInterval(() => {
        // Only count if window is focused to be "professional"
        if (document.hasFocus()) {
          timeSpentInEpisode += 1;
          saveProgress();
        }
      }, 1000);
    } else {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
  });
</script>

<svelte:head>
  <title>{anime?.title || "Player"} — Episode {ep} — WatchAnimez</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
  class="player-page"
  style={posterColor ? `--poster-tint: ${posterColor};` : ""}
>
  <!-- Cinematic Background Blur -->
  <div
    class="page-background"
    style="background-image: url({getProxiedImage(
      anime?.image || anime?.poster,
    )})"
  ></div>
  <div class="page-overlay"></div>

  <!-- Floating Back Button -->
  <div class="top-nav container">
    <button
      class="nav-back-btn"
      onclick={() => goto(`/anime/${animeId}`)}
      aria-label="Back to anime details"
    >
      <ChevronLeft size={20} />
      <span class="back-label">Back</span>
    </button>
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
                onended={() => saveProgress(true)}
                ontimeupdate={() => saveProgress()}
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
                  <RotateCw size={16} />
                </button>
                <button
                  class="ctrl-btn"
                  title="Shortcuts"
                  onclick={() => (showShortcuts = !showShortcuts)}
                >
                  <Keyboard size={16} />
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="watch-engagement-strip cards-glass">
        <div class="engagement-copy">
          <span class="engagement-kicker">Episode pulse</span>
          <strong>React while you watch</strong>
        </div>
        <div class="engagement-actions">
          <ReactionsBar {animeId} episode={ep} />
          <button
            class="nav-secondary-btn comment-jump-btn"
            onclick={() =>
              document
                .getElementById("community")
                ?.scrollIntoView({ behavior: "smooth" })}
          >
            <MessageSquare size={16} /> Show Comments
          </button>
        </div>
      </div>

      <!-- Collapsible LiveChat Section -->
      <div class="collapsible-chat-wrapper mt-6">
        <!-- Chat Toggle Button -->
        <button
          class="chat-toggle-btn"
          onclick={() => {
            showLiveChat = !showLiveChat;
            if (showLiveChat) { showServers = false; loadLiveChat(); }
          }}
          aria-expanded={showLiveChat}
          aria-controls="live-chat-section"
        >
          <div class="toggle-content">
            <MessageSquare size={18} />
            <span class="toggle-text">{showLiveChat ? 'Hide Live Chat' : 'Live Chat'}</span>
            <ChevronDown
              size={16}
              class={`toggle-icon ${showLiveChat ? 'rotated' : ''}`}
            />
          </div>
          {#if !showLiveChat}
            <span class="chat-badge">Optional</span>
          {/if}
        </button>

        <!-- Collapsible Chat Container -->
        <div
          id="live-chat-section"
          class="collapsible-chat-container"
          class:expanded={showLiveChat}
        >
          {#if showLiveChat && LiveChatComp}
            <LiveChatComp {animeId} episode={ep} isInline={true} onClose={() => showLiveChat = false} />
          {/if}
        </div>
      </div>

      <!-- Show Server Selection Button (when chat is open) -->
      {#if showLiveChat && Object.keys(groupedSources).length > 0}
        <button
          class="show-servers-btn mt-6"
          onclick={() => {
            showServers = true;
            showLiveChat = false;
          }}
        >
          <Server size={18} />
          <span>Show Server Selection</span>
        </button>
      {/if}

      <!-- Collapsible Server Selection Section -->
      <div class="collapsible-server-wrapper mt-6">
        <!-- Server Toggle Button -->
        <button
          class="server-toggle-btn"
          onclick={() => showServers = !showServers}
          aria-expanded={showServers}
          aria-controls="server-selection-section"
        >
          <div class="toggle-content">
            <Server size={18} />
            <span class="toggle-text">{showServers ? 'Hide Servers' : 'Server Selection'}</span>
            <ChevronDown
              size={16}
              class={`toggle-icon ${showServers ? 'rotated' : ''}`}
            />
          </div>
          {#if !showServers}
            <span class="server-badge">{sources.length} Sources</span>
          {/if}
        </button>

        <!-- Collapsible Server Container -->
        <div
          id="server-selection-section"
          class="collapsible-server-container"
          class:expanded={showServers}
        >
          <!-- Provider / Source TABS -->
          {#if Object.keys(groupedSources).length > 0}
            <div class="server-selection cards-glass">
          <div class="server-header">
            <div class="server-title-group">
              <div class="server-icon-wrapper">
                <Server size={20} class="server-icon" />
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
            {#each Object.entries(groupedSources) as [provider, categories]}
              <div class="provider-card" class:open={openProvider === provider}>
                <button
                  class="provider-toggle"
                  onclick={() => openProvider = openProvider === provider ? null : provider}
                  aria-expanded={openProvider === provider}
                >
                  <span class="prov-name">{provider}</span>
                  <span class="provider-summary">
                    {Object.values(categories).reduce((sum, list) => sum + list.length, 0)} sources
                    <ChevronDown
                      size={15}
                      class={`provider-chevron ${openProvider === provider ? 'rotated' : ''}`}
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
              </div>
            {/each}
          </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Show Live Chat Button (when servers are open) -->
      {#if showServers && Object.keys(groupedSources).length > 0}
        <button
          class="show-chat-btn mt-6"
          onclick={() => {
            showLiveChat = true;
            showServers = false;
          }}
        >
          <MessageSquare size={18} />
          <span>Show Live Chat</span>
        </button>
      {/if}

      <div class="community-section mt-10" id="community" bind:this={commentsEl}>
        {#if CommentsComp}
          <CommentsComp {animeId} episode={ep} />
        {:else}
          <div class="comments-skeleton" aria-hidden="true">
            <div class="cs-title shimmer"></div>
            {#each Array(3) as _, i (i)}
              <div class="cs-row">
                <div class="cs-avatar shimmer"></div>
                <div class="cs-body">
                  <div class="cs-line shimmer"></div>
                  <div class="cs-line short shimmer"></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Column: Episodes -->
    <aside class="side-info-section">
      <!-- Episodes Navigation -->
      <div class="episodes-section side-episodes cards-glass">
        <div class="section-header">
          <div class="header-main">
            <div class="section-icon-wrapper">
              <Play size={20} class="section-icon" />
            </div>
            <div>
              <h3>Episodes</h3>
              <p class="section-subtitle">{episodes.length} episodes available</p>
            </div>
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
    </aside>
  </div>

  <!-- Related Content (Bottom) -->
  <div class="container watch-bottom-rail mt-12 pb-20">
    {#if recommendations.length > 0}
      <div class="bottom-row">
        <Row title="You Might Also Like" items={recommendations} />
      </div>
    {/if}

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
  .comments-skeleton {
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    background: var(--surface-1);
    padding: 1.5rem;
  }
  .comments-skeleton .cs-title {
    width: 160px;
    height: 1.2rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
  }
  .comments-skeleton .cs-row {
    display: flex;
    gap: 0.85rem;
    margin-bottom: 1.5rem;
  }
  .comments-skeleton .cs-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .comments-skeleton .cs-body {
    flex: 1;
  }
  .comments-skeleton .cs-line {
    height: 0.8rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    width: 100%;
  }
  .comments-skeleton .cs-line.short {
    width: 55%;
  }
  .comments-skeleton .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.05) 30%,
      rgba(255, 255, 255, 0.11) 50%,
      rgba(255, 255, 255, 0.05) 70%
    );
    background-size: 200% 100%;
    animation: cs-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes cs-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .comments-skeleton .shimmer { animation: none; }
  }

  .watch-bottom-rail {
    position: relative;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .bottom-row {
    position: relative;
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 1.25rem 0.75rem 1.4rem;
    background: var(--surface-1);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 18px 44px rgba(0, 0, 0, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .bottom-row :global(.row-section) {
    position: relative;
    margin-bottom: 0;
  }

  .bottom-row :global(.row-title) {
    color: var(--txt);
    font-size: clamp(1.15rem, 2vw, 1.5rem);
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .bottom-row :global(.row-title)::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 1.05em;
    margin-right: 12px;
    border-radius: 999px;
    background: var(--accent);
    box-shadow: 0 0 14px var(--accent-glow);
    vertical-align: -0.18em;
  }

  .bottom-row :global(.row-scroll) {
    padding-top: 0.85rem;
    padding-bottom: 0.9rem;
  }

  .bottom-row :global(.row-scroll > *) {
    filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45));
  }

  @media (max-width: 768px) {
    .watch-bottom-rail {
      gap: 1.35rem;
    }

    .bottom-row {
      margin-inline: -0.25rem;
      border-radius: 18px;
      padding: 1rem 0.25rem;
    }
  }

  /* --- Watch Page Design System (theme-aware) --- */
  .player-page {
    /* Local tokens mapped to the global theme so the player follows the
       active theme like the rest of the site instead of hardcoded red. */
    --accent: var(--net-red, #e50914);
    --accent-red: var(--net-red, #e50914);
    --accent-soft: color-mix(in srgb, var(--net-red, #e50914) 16%, transparent);
    --accent-glow: color-mix(in srgb, var(--net-red, #e50914) 28%, transparent);
    /* Poster-driven tint — overridden inline once the poster colour is read,
       so the whole screen adopts the colour of the exact anime. */
    --poster-tint: 229, 9, 20;
    --tint-soft: rgba(var(--poster-tint), 0.16);
    --tint-strong: rgba(var(--poster-tint), 0.32);
    --tint-glow: rgba(var(--poster-tint), 0.42);
    --surface-1: color-mix(in srgb, var(--net-bg, #0a0a0a) 78%, #ffffff 4%);
    --surface-2: color-mix(in srgb, var(--net-bg, #0a0a0a) 70%, #ffffff 6%);
    --hairline: rgba(255, 255, 255, 0.08);
    --hairline-strong: rgba(255, 255, 255, 0.14);
    --glass-bg: var(--surface-1);
    --glass-border: var(--hairline);
    --txt: var(--net-text, #fff);
    --txt-muted: var(--net-text-muted, #9ca3af);
    --radius-card: 20px;
    --radius-inner: 14px;
    --gap-section: 1.75rem;

    position: relative;
    min-height: 100vh;
    background: var(--net-bg, #050505);
    color: var(--txt);
    overflow-x: hidden;
    padding-bottom: 5rem;
  }

  .page-background {
    position: fixed;
    inset: 0;
    background-size: cover;
    background-position: center 20%;
    filter: blur(3px) saturate(1.5) brightness(0.55);
    z-index: 0;
    transform: scale(1.12);
    opacity: 1;
  }

  .page-overlay {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(
        120% 80% at 80% -10%,
        var(--tint-strong),
        transparent 50%
      ),
      radial-gradient(
        100% 60% at 15% 0%,
        var(--tint-soft),
        transparent 55%
      ),
      linear-gradient(
        to bottom,
        transparent 0%,
        transparent 45%,
        color-mix(in srgb, var(--net-bg, #050505) 60%, transparent) 72%,
        var(--net-bg, #050505) 96%
      );
    z-index: 1;
    transition: background 0.8s ease;
  }

  .top-nav {
    position: relative;
    z-index: 100;
    padding: 1.25rem 1rem 0.25rem;
    padding-top: max(1.25rem, env(safe-area-inset-top));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
    display: flex;
    align-items: center;
    justify-content: flex-start;
    animation: fadeInDown 0.6s ease;
  }

  .nav-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    height: 42px;
    padding: 0 1.1rem 0 0.85rem;
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: 999px;
    color: var(--txt);
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .nav-back-btn:hover {
    background: color-mix(in srgb, var(--accent) 16%, var(--surface-1));
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(-3px);
  }

  .back-label {
    line-height: 1;
  }

  /* Layout */
  .watch-layout {
    position: relative;
    z-index: 5;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 2rem;
    margin-top: 1.25rem;
    align-items: start;
  }

  .primary-section {
    display: flex;
    flex-direction: column;
    gap: var(--gap-section);
    min-width: 0;
  }

  /* Video & Player */
  .player-wrapper {
    position: relative;
    width: 100%;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Ambient theme glow ("ambilight") radiating from behind the player */
  .player-wrapper::before {
    content: "";
    position: absolute;
    inset: -6% -3% -10%;
    z-index: 0;
    border-radius: 48px;
    background:
      radial-gradient(60% 65% at 50% 45%, var(--tint-glow), transparent 72%),
      radial-gradient(80% 90% at 50% 60%, var(--tint-soft), transparent 78%);
    filter: blur(72px) saturate(1.35);
    opacity: 0.9;
    pointer-events: none;
    transition: opacity 0.6s ease, background 0.8s ease;
  }

  .player-wrapper:hover::before {
    opacity: 1;
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

  .player-wrapper.theater::before {
    display: none;
  }

  .video-container {
    position: relative;
    z-index: 1;
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius-card);
    overflow: hidden;
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.65),
      0 0 0 1px var(--hairline);
    transition: border-radius 0.4s ease;
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
    border: 3px solid color-mix(in srgb, var(--accent) 12%, transparent);
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

  .watch-engagement-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 18px;
  }

  .engagement-copy {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .engagement-kicker {
    color: var(--accent-red);
    font-size: 0.68rem;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .engagement-copy strong {
    color: #fff;
    font-size: 0.95rem;
  }

  .watch-engagement-strip :global(.reactions-container) {
    width: auto;
    justify-content: flex-end;
  }

  .engagement-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.9rem;
    flex-wrap: wrap;
  }

  .comment-jump-btn {
    width: auto;
    min-height: 42px;
    padding: 0.7rem 1rem;
    border-radius: 12px;
    white-space: nowrap;
  }

  /* Collapsible Chat & Server Styles */
  .chat-toggle-btn,
  .server-toggle-btn {
    width: 100%;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, rgba(18, 18, 24, 0.82), rgba(8, 8, 12, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    color: #fff;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .chat-toggle-btn:hover,
  .server-toggle-btn:hover {
    background: linear-gradient(135deg, rgba(28, 28, 34, 0.9), rgba(18, 18, 22, 0.95));
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 0 24px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  .toggle-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
  }

  .toggle-icon {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toggle-icon.rotated {
    transform: rotate(180deg);
  }

  .chat-badge,
  .server-badge {
    padding: 0.4rem 1rem;
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .collapsible-chat-container,
  .collapsible-server-container {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    opacity: 0;
  }

  .collapsible-chat-container.expanded {
    max-height: 800px;
    opacity: 1;
  }

  .collapsible-server-container.expanded {
    max-height: 1200px;
    opacity: 1;
    margin-top: 1rem;
  }

  .show-chat-btn,
  .show-servers-btn {
    width: 100%;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, rgba(18, 18, 24, 0.82), rgba(8, 8, 12, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    color: #fff;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .show-chat-btn:hover,
  .show-servers-btn:hover {
    background: linear-gradient(135deg, rgba(28, 28, 34, 0.9), rgba(18, 18, 22, 0.95));
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4), 0 0 24px color-mix(in srgb, var(--accent) 15%, transparent);
  }

  /* Collapsible LiveChat Styles */
  .collapsible-chat-wrapper {
    width: 100%;
    margin-top: 1.5rem;
  }

  .chat-toggle-btn {
    width: 100%;
    background: linear-gradient(135deg, rgba(15, 15, 18, 0.8) 0%, rgba(20, 20, 25, 0.7) 100%);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 1rem 1.5rem;
    color: rgba(255, 255, 255, 0.9);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .chat-toggle-btn:hover {
    background: linear-gradient(135deg, rgba(20, 20, 25, 0.9) 0%, rgba(25, 25, 30, 0.8) 100%);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .chat-toggle-btn:active {
    transform: translateY(0);
  }

  .toggle-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .toggle-text {
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .toggle-icon {
    transition: transform 0.3s ease;
    opacity: 0.7;
  }

  .toggle-icon.rotated {
    transform: rotate(180deg);
  }

  .chat-badge {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent) 0%, color-mix(in srgb, var(--accent) 10%, transparent) 100%);
    color: color-mix(in srgb, var(--accent) 55%, #fff);
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .collapsible-chat-container {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.4s ease, opacity 0.3s ease, margin-top 0.3s ease;
    margin-top: 0;
  }

  .collapsible-chat-container.expanded {
    max-height: 800px;
    opacity: 1;
    margin-top: 1rem;
  }

  .show-servers-btn {
    width: 100%;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 100%);
    backdrop-filter: blur(12px);
    border: 1.5px solid color-mix(in srgb, var(--accent) 32%, transparent);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    color: rgba(255, 255, 255, 0.95);
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .show-servers-btn:hover {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 26%, transparent) 0%, color-mix(in srgb, var(--accent) 15%, transparent) 100%);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .show-servers-btn:active {
    transform: translateY(0);
  }

  /* Utility classes for spacing */
  .mt-6 {
    margin-top: 1.5rem;
  }

  .mt-8 {
    margin-top: 2rem;
  }

  .mt-10 {
    margin-top: 2.5rem;
  }

  .mt-12 {
    margin-top: 3rem;
  }

  .pb-20 {
    padding-bottom: 5rem;
  }

  /* Responsive adjustments for collapsible chat */
  @media (max-width: 768px) {
    .chat-toggle-btn {
      padding: 0.875rem 1.25rem;
      font-size: 0.95rem;
      border-radius: 14px;
    }

    .collapsible-chat-container.expanded {
      max-height: 600px;
    }

    .show-servers-btn {
      padding: 1rem 1.25rem;
      font-size: 0.95rem;
      border-radius: 14px;
    }

    .chat-badge {
      padding: 0.2rem 0.6rem;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .collapsible-chat-wrapper {
      margin-top: 1rem;
    }

    .chat-toggle-btn {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      border-radius: 12px;
    }

    .toggle-content {
      gap: 0.5rem;
    }

    .collapsible-chat-container.expanded {
      max-height: 500px;
      margin-top: 0.75rem;
    }

    .show-servers-btn {
      padding: 0.875rem 1rem;
      font-size: 0.9rem;
      border-radius: 12px;
    }
  }

  /* Enhanced Server Header */
  .server-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .server-title-group {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .server-icon-wrapper {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 72%, #000) 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px var(--accent-glow);
    flex-shrink: 0;
  }

  .server-icon {
    color: #fff;
  }

  .server-title-group h3 {
    font-size: 1.5rem;
    font-weight: 900;
    margin: 0 0 4px 0;
    color: #fff;
  }

  .server-subtitle {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
    font-weight: 500;
  }

  .server-stats {
    display: flex;
    gap: 1rem;
  }

  .stat-badge {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 80px;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 900;
    color: var(--accent-red);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
  }

  /* Provider Card Design */
  .provider-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .provider-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 1.5rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .provider-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent-red), transparent);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .provider-card:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }

  .provider-card:hover::before {
    opacity: 1;
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

  .provider-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: rgba(255, 255, 255, 0.55);
    font-size: 0.78rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .provider-chevron {
    transition: transform 0.25s ease;
  }

  .provider-chevron.rotated {
    transform: rotate(180deg);
  }

  .provider-sources {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.35s ease, opacity 0.25s ease, margin-top 0.25s ease;
  }

  .provider-sources.expanded {
    max-height: 900px;
    opacity: 1;
    margin-top: 1rem;
  }

  .provider-card.open {
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 24px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .prov-name {
    font-size: 0.85rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #fff;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .prov-name::before {
    content: '▶';
    color: var(--accent-red);
    font-size: 0.7rem;
  }

  .category-group {
    margin-bottom: 1.25rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .category-group:last-child {
    margin-bottom: 0;
  }

  .cat-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.85rem;
    padding: 4px 10px;
    border-radius: 6px;
  }

  /* Color-coded category labels */
  .cat-label:has(+ .source-chips .source-chip:nth-child(1)) {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: color-mix(in srgb, var(--accent) 70%, #fff);
  }

  .cat-label::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
  }

  .source-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .source-chip {
    padding: 10px 18px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #fff;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
  }

  .source-chip::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), transparent);
    opacity: 0;
    transition: opacity 0.25s;
  }

  .source-chip:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .source-chip:active {
    transform: translateY(0);
  }

  .source-chip.active {
    background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 72%, #000) 100%);
    border-color: var(--accent-red);
    box-shadow: 0 6px 20px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  .source-chip.active::before {
    opacity: 1;
  }

  .source-chip.active::after {
    content: '✓';
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 900;
  }

  /* Enhanced quality badges with color coding */
  .source-chip .q {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    position: relative;
    z-index: 1;
    background: rgba(0, 0, 0, 0.4);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Quality-specific styling via data attributes or inline styles will be added in the HTML */

  /* Enhanced Episode Cards */
  .episodes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1.75rem;
  }

  .episode-card {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    padding: 0.85rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .episode-card:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  }

  .episode-card.current {
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, transparent) 0%, color-mix(in srgb, var(--accent) 4%, transparent) 100%);
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    box-shadow: 0 8px 24px var(--accent-glow);
  }

  .ep-thumb {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .ep-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ep-hover {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--accent) 32%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
    backdrop-filter: blur(4px);
  }

  .episode-card:hover .ep-thumb img {
    transform: scale(1.12);
  }

  .episode-card:hover .ep-hover {
    opacity: 1;
  }

  .episode-card.current .ep-thumb {
    border: 2px solid var(--accent-red);
    box-shadow: 0 0 24px var(--accent-glow);
  }

  .playing-tag {
    position: absolute;
    top: 8px;
    right: 8px;
    background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 72%, #000) 100%);
    color: #fff;
    font-size: 0.7rem;
    font-weight: 900;
    padding: 5px 10px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 12px var(--accent-glow);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .playing-tag::before {
    content: '▶';
    font-size: 0.6rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .ep-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ep-meta .num {
    font-size: 0.92rem;
    font-weight: 900;
    color: #fff;
    margin-bottom: 2px;
  }

  .ep-num-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .filler-tag {
    font-size: 0.65rem;
    font-weight: 800;
    background: linear-gradient(135deg, rgba(255, 165, 0, 0.25) 0%, rgba(255, 140, 0, 0.15) 100%);
    color: #ffa500;
    padding: 3px 8px;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border: 1px solid rgba(255, 165, 0, 0.3);
  }

  .ep-progress-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    margin-top: 10px;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, #fff) 100%);
    border-radius: 3px;
    transition: width 0.3s ease;
    position: relative;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background: rgba(255, 255, 255, 0.4);
    filter: blur(2px);
  }

  .ep-meta .name {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
    font-weight: 500;
  }

  /* Sections */
  .cards-glass {
    background: var(--surface-1);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 1.75rem;
    box-shadow:
      0 16px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  /* Enhanced Section Headers */
  .section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .header-main {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .section-icon-wrapper {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent) 5%, transparent) 100%);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .section-icon {
    color: var(--accent-red);
  }

  .header-main h3 {
    font-size: 1.5rem;
    font-weight: 900;
    margin: 0 0 4px 0;
    color: #fff;
  }

  .section-subtitle {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
    font-weight: 500;
  }

  .ep-count {
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
  }

  .side-episodes {
    padding: 1.1rem;
    max-height: calc(100vh - 8rem);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .side-episodes .section-header {
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 0.9rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .side-episodes .header-main {
    align-items: center;
    gap: 0.65rem;
  }

  .side-episodes .section-icon-wrapper {
    width: 34px;
    height: 34px;
    border-radius: 9px;
  }

  .side-episodes .header-main h3 {
    font-size: 1.05rem;
  }

  .side-episodes .section-subtitle {
    font-size: 0.72rem;
  }

  .side-episodes .range-select {
    max-width: 150px;
    padding: 8px 34px 8px 12px;
    font-size: 0.75rem;
  }

  .side-episodes .episodes-grid {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .side-episodes .episode-card {
    display: grid;
    grid-template-columns: 86px minmax(0, 1fr);
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem;
    border-radius: 12px;
  }

  .side-episodes .episode-card:hover {
    transform: translateY(-1px);
  }

  .side-episodes .ep-thumb {
    width: 86px;
    margin-bottom: 0;
    border-radius: 8px;
  }

  .side-episodes .playing-tag {
    top: 5px;
    right: 5px;
    padding: 3px 6px;
    font-size: 0.55rem;
  }

  .side-episodes .ep-meta .num {
    font-size: 0.78rem;
  }

  .side-episodes .ep-meta .name {
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .side-episodes .ep-progress-bar {
    height: 3px;
    margin-top: 7px;
  }

  /* Enhanced Side Info Header */
  .side-info-section {
    position: sticky;
    top: 2rem;
    height: fit-content;
  }

  .anime-quick-card {
    padding: 1.75rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(135deg, rgba(15, 15, 18, 0.8) 0%, rgba(15, 15, 18, 0.7) 100%);
    backdrop-filter: blur(20px);
    box-shadow:
      0 16px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .quick-header {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .quick-poster {
    width: 95px;
    aspect-ratio: 2/3;
    object-fit: cover;
    border-radius: 12px;
    box-shadow:
      0 12px 24px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: transform 0.3s;
  }

  .quick-poster:hover {
    transform: scale(1.05);
  }

  .main-title {
    font-size: 1.3rem;
    font-weight: 900;
    line-height: 1.25;
    margin-bottom: 10px;
    color: #fff;
  }

  .quick-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
  }

  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.4;
  }

  .status {
    color: #10b981;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 0.72rem;
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

  /* Enhanced Range Selector */
  .range-selector {
    position: relative;
    display: flex;
    align-items: center;
  }

  .range-select {
    appearance: none;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.55) 100%);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 10px 40px 10px 18px;
    border-radius: 11px;
    color: #fff;
    font-weight: 800;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }

  .range-select:hover {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%);
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  .range-select:focus {
    border-color: var(--accent-red);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .range-select option {
    background: #111;
    color: #fff;
    padding: 12px;
    font-weight: 600;
  }

  .range-selector :global(.ptr-none) {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: rgba(255, 255, 255, 0.6);
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
      display: block;
      position: relative;
      top: auto;
    }

    .side-episodes {
      max-height: none;
      overflow: visible;
    }

    .side-episodes .episodes-grid {
      max-height: 520px;
      overflow-y: auto;
    }

    /* Adjust server header for tablet */
    .server-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .server-stats {
      width: 100%;
      justify-content: flex-start;
    }

    .stat-badge {
      flex: 1;
      max-width: 120px;
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

    /* Mobile Server Header */
    .server-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
    }

    .server-title-group {
      gap: 0.75rem;
    }

    .server-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }

    .server-icon {
      width: 18px;
      height: 18px;
    }

    .server-title-group h3 {
      font-size: 1.25rem;
    }

    .server-subtitle {
      font-size: 0.78rem;
    }

    .server-stats {
      gap: 0.75rem;
    }

    .stat-badge {
      padding: 10px 12px;
      min-width: 70px;
    }

    .stat-number {
      font-size: 1.25rem;
    }

    .stat-label {
      font-size: 0.65rem;
    }

    /* Mobile Provider Cards */
    .provider-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .provider-card {
      padding: 1.25rem;
      border-radius: 14px;
    }

    .prov-name {
      font-size: 0.8rem;
      margin-bottom: 1rem;
      padding-bottom: 0.6rem;
    }

    .category-group {
      padding: 0.65rem;
      margin-bottom: 1rem;
    }

    .cat-label {
      font-size: 0.68rem;
      padding: 3px 8px;
      margin-bottom: 0.75rem;
    }

    /* Mobile Source Chips - Larger touch targets */
    .source-chips {
      gap: 0.5rem;
    }

    .source-chip {
      padding: 9px 14px;
      font-size: 0.82rem;
      border-radius: 10px;
      min-height: 40px;
    }

    .source-chip .q {
      font-size: 0.65rem;
      padding: 2px 6px;
    }

    .watch-engagement-strip {
      align-items: stretch;
      flex-direction: column;
      padding: 1rem;
    }

    .watch-engagement-strip :global(.reactions-container) {
      width: 100%;
      justify-content: space-between;
    }

    .engagement-actions {
      width: 100%;
      align-items: stretch;
      flex-direction: column;
    }

    .comment-jump-btn {
      width: 100%;
      justify-content: center;
    }

    .side-episodes .episodes-grid,
    .episodes-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: none;
      overflow: visible;
    }

    .side-episodes .episode-card,
    .episode-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .episode-card:hover {
      transform: translateY(0);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }

    .episode-card.current {
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent) 0%, color-mix(in srgb, var(--accent) 5%, transparent) 100%);
      border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    }

    .side-episodes .ep-thumb,
    .ep-thumb {
      width: 130px;
      flex-shrink: 0;
      margin-bottom: 0;
    }

    .ep-meta {
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      flex: 1;
    }

    .ep-meta .num {
      font-size: 0.88rem;
    }

    .ep-meta .name {
      font-size: 0.78rem;
    }

    .playing-tag {
      font-size: 0.65rem;
      padding: 4px 8px;
      top: 6px;
      right: 6px;
    }

    /* Mobile Section Headers */
    .section-icon-wrapper {
      width: 38px;
      height: 38px;
      border-radius: 10px;
    }

    .section-icon {
      width: 18px;
      height: 18px;
    }

    .header-main h3 {
      font-size: 1.25rem;
    }

    .section-subtitle {
      font-size: 0.78rem;
    }

    /* Mobile Range Selector */
    .range-select {
      padding: 9px 36px 9px 14px;
      font-size: 0.8rem;
    }

    /* Scale down HUD controls on mobile to prevent blocking stream */
    .top-controls-hub {
      top: 0.25rem;
      left: 0.25rem;
    }

    .top-controls-hub .controls-group {
      gap: 0;
      padding: 0.2rem;
      border-radius: 6px;
    }

    .top-controls-hub .ctrl-btn {
      width: 24px;
      height: 24px;
      min-width: 24px;
      min-height: 24px;
      border-radius: 4px;
    }

    .top-controls-hub .ctrl-btn[title="Shortcuts"] {
      display: none;
    }

    .top-controls-hub .ctrl-btn :global(svg) {
      width: 10px;
      height: 10px;
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

    .cards-glass {
      padding: 1rem;
      border-radius: 14px;
    }

    /* Small Mobile Server Header */
    .server-icon-wrapper {
      width: 36px;
      height: 36px;
    }

    .server-icon {
      width: 16px;
      height: 16px;
    }

    .server-title-group h3 {
      font-size: 1.1rem;
    }

    .server-subtitle {
      font-size: 0.72rem;
    }

    .stat-badge {
      padding: 8px 10px;
      min-width: 60px;
    }

    .stat-number {
      font-size: 1.1rem;
    }

    .stat-label {
      font-size: 0.6rem;
    }

    /* Small Mobile Provider Cards */
    .provider-card {
      padding: 1rem;
    }

    .prov-name {
      font-size: 0.75rem;
    }

    .category-group {
      padding: 0.6rem;
    }

    .cat-label {
      font-size: 0.65rem;
    }

    /* Small Mobile Source Chips */
    .source-chip {
      padding: 8px 12px;
      font-size: 0.78rem;
      min-height: 38px;
    }

    .source-chip .q {
      font-size: 0.6rem;
      padding: 2px 5px;
    }

    /* Small Mobile Episode List */
    .episode-card {
      padding: 8px;
      gap: 12px;
    }

    .side-episodes .ep-thumb,
    .ep-thumb {
      width: 110px;
    }

    .ep-meta .num {
      font-size: 0.82rem;
    }

    .ep-meta .name {
      font-size: 0.72rem;
    }

    .playing-tag {
      font-size: 0.6rem;
      padding: 3px 6px;
    }

    /* Small Mobile Section Headers */
    .section-icon-wrapper {
      width: 34px;
      height: 34px;
    }

    .section-icon {
      width: 16px;
      height: 16px;
    }

    .header-main h3 {
      font-size: 1.1rem;
    }

    .section-subtitle {
      font-size: 0.72rem;
    }

    /* Small Mobile Range Selector */
    .range-select {
      padding: 8px 32px 8px 12px;
      font-size: 0.75rem;
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
