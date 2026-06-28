<script lang="ts">
  import { api, getProxiedImage, getProxiedUrl, BACKEND_URL } from "$lib/api";
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
    LayoutGrid,
    List,
    Share2,
    Download,
    Flag,
    X,
  } from "lucide-svelte";
  import Hls from "hls.js";
  import ReactionsBar from "$lib/components/ReactionsBar.svelte";
  import WatchServers from "./WatchServers.svelte";
  import WatchSidebar from "./WatchSidebar.svelte";
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

  // Derived values for pagination (totalPages drives current-page sync below;
  // the range list & slicing now live inside <WatchSidebar />).
  let totalPages = $derived(Math.ceil(episodes.length / EPISODES_PER_PAGE));

  function goToEpPage(pageIndex: number) {
    currentEpPage = pageIndex;
  }

  // --- Miruro-style UI helpers ---
  // Lightweight "Autoplay" toggle (cosmetic gate for auto-starting playback).
  let autoplay = $state(true);

  // Classify a source into an audio category (Sub / English Dub / Hindi Dub / Raw)
  function catOf(src: any): string {
    if (!src) return "Sub";
    const lang = (src.language || "").toLowerCase();
    const type = (src.type || "").toLowerCase();
    const c = (src.category || "").toLowerCase();
    const prov = (src.provider || "").toLowerCase();
    if (
      lang.includes("hindi") ||
      c === "hindi" ||
      ((lang.includes("multi") || lang === "multi-audio") &&
        (prov.includes("desidub") || prov.includes("hindi")))
    )
      return "Hindi Dub";
    if (lang.includes("english") || c === "dub" || type === "dub")
      return "English Dub";
    if (c === "raw" || type === "raw") return "Raw";
    return "Sub";
  }

  let audioCategories = $derived.by(() => {
    const set = new Set<string>();
    for (const s of sources) set.add(catOf(s));
    return [...set];
  });
  let selectedCategory = $state("Sub");
  // Keep the audio dropdown in sync when the active source changes.
  $effect(() => {
    if (selectedSource) {
      const c = catOf(selectedSource);
      untrack(() => {
        selectedCategory = c;
      });
    }
  });
  let serversInCategory = $derived(
    sources.filter((s: any) => catOf(s) === selectedCategory),
  );
  let currentEpisodeTitle = $derived.by(() => {
    const e = episodes.find((x: any) => x.number === ep);
    return e?.title || `Episode ${ep}`;
  });

  function selectAudioCategory(cat: string) {
    selectedCategory = cat;
    const first = sources.find((s: any) => catOf(s) === cat);
    if (first) handleSourceChange(first);
  }

  function selectServerByUrl(url: string) {
    const src = sources.find((s: any) => s.url === url);
    if (src) handleSourceChange(src);
  }

  function sourceLabel(src: any, index = 0): string {
    const prov = src.provider ? String(src.provider).split(/[\s(]/)[0] : "";
    const name = src.name ? String(src.name).trim() : "";
    const q = src.quality ? String(src.quality).trim() : "";
    // Prefer the real source name (e.g. "bato Soft Sub", "Hindi Abyess") with
    // its provider for context; fall back to provider + quality.
    if (name) {
      const withQ =
        q && !name.toLowerCase().includes(q.toLowerCase())
          ? `${name} · ${q}`
          : name;
      return prov ? `${prov} · ${withQ}` : withQ;
    }
    // Nameless mirror servers (e.g. Toonstream) — number them so each is
    // distinguishable instead of repeating "Provider · Auto".
    const label = q && q.toLowerCase() !== "auto" ? q : `Server ${index + 1}`;
    return `${prov || "Server"} · ${label}`;
  }

  // Title-bar Audio/Server custom dropdowns (hover-open on hover devices,
  // tap/click on touch devices).
  let audioOpen = $state(false);
  let serverOpen = $state(false);
  onMount(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t || !t.closest || !t.closest(".etb-dd")) {
        audioOpen = false;
        serverOpen = false;
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  });

  // --- Episode actions: Report / Download / Share (miruro-style) ---
  const REPORT_DISCORD_URL = "https://discord.gg/7v6ZzkJpXV";
  let shareLabel = $state("Share");

  function reportEpisode() {
    // Redirect users to the community Discord to report a broken episode/source.
    if (typeof window !== "undefined")
      window.open(REPORT_DISCORD_URL, "_blank", "noopener,noreferrer");
  }

  function downloadEpisode() {
    // Open the current playable source in a new tab (direct file downloads,
    // embeds open their host). Falls back to the app's download page.
    if (selectedSource?.url) {
      window.open(selectedSource.url, "_blank", "noopener,noreferrer");
    } else {
      goto("/download");
    }
  }

  async function shareEpisode() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${anime?.title || "Anime"} — Episode ${ep} · WatchAnimez`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {
        return; // user dismissed the native share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      shareLabel = "Copied!";
    } catch {
      shareLabel = "Copy failed";
    }
    setTimeout(() => (shareLabel = "Share"), 1800);
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

  // Collapsible Server Selection state (collapsed by default — the inline
  // Audio/Server switcher in the title bar is the primary control now).
  let showServers = $state(false);

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
        theaterMode = false;
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
        if (autoplay) videoElement?.play().catch(() => {});

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
        {#if theaterMode}
          <button
            class="theater-exit"
            onclick={() => (theaterMode = false)}
            aria-label="Turn lights on"
          >
            <X size={15} /> Lights On
          </button>
        {/if}
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

      <!-- Player options bar (miruro-style lightweight toggles) -->
      <div class="player-options-bar">
        <div class="opt-toggles">
          <button
            class="opt-toggle"
            class:on={autoplay}
            onclick={() => (autoplay = !autoplay)}
          >
            <span class="opt-dot"></span> Autoplay
          </button>
          <button
            class="opt-toggle"
            class:on={autoSkip}
            onclick={() => (autoSkip = !autoSkip)}
          >
            <SkipForward size={13} /> Auto Skip
          </button>
          <button
            class="opt-toggle"
            class:on={autoNext}
            onclick={() => (autoNext = !autoNext)}
          >
            <ChevronRight size={13} /> Auto Next
          </button>
          <button
            class="opt-toggle"
            class:on={showShortcuts}
            onclick={() => (showShortcuts = !showShortcuts)}
          >
            <Keyboard size={13} /> Shortcuts
          </button>
          <button
            class="opt-toggle"
            class:on={theaterMode}
            onclick={() => (theaterMode = !theaterMode)}
          >
            <Monitor size={13} /> Lights Off
          </button>
        </div>
        <div class="opt-nav">
          <button
            class="opt-nav-btn"
            disabled={ep <= 1}
            onclick={() => ep > 1 && changeEp(ep - 1)}
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            class="opt-nav-btn"
            disabled={ep >= episodes.length}
            onclick={() => ep < episodes.length && changeEp(ep + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <!-- Episode title + audio/server quick switch (miruro-style) -->
      <div class="episode-title-bar">
        <div class="etb-head">
          <h1 class="etb-title">
            <span class="etb-num">{ep}.</span>
            {currentEpisodeTitle}
          </h1>
          {#if sources.length > 0}
            <div class="etb-selectors">
              {#if audioCategories.length > 1}
                <div class="etb-dd" class:open={audioOpen}>
                  <button
                    class="etb-dd-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={audioOpen}
                    onclick={() => {
                      audioOpen = !audioOpen;
                      serverOpen = false;
                    }}
                  >
                    <span class="etb-select-label">Audio</span>
                    <span class="etb-dd-value">
                      <span class="etb-dd-text">{selectedCategory}</span>
                      <ChevronDown size={13} class="etb-dd-caret" />
                    </span>
                  </button>
                  <div class="etb-dd-menu" role="listbox">
                    {#each audioCategories as cat}
                      <button
                        type="button"
                        class="etb-dd-opt"
                        class:sel={cat === selectedCategory}
                        role="option"
                        aria-selected={cat === selectedCategory}
                        onclick={() => {
                          selectAudioCategory(cat);
                          audioOpen = false;
                        }}>{cat}</button
                      >
                    {/each}
                  </div>
                </div>
              {/if}
              <div class="etb-dd etb-dd-server" class:open={serverOpen}>
                <button
                  class="etb-dd-trigger"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={serverOpen}
                  onclick={() => {
                    serverOpen = !serverOpen;
                    audioOpen = false;
                  }}
                >
                  <span class="etb-select-label">Server · {serversInCategory.length}</span>
                  <span class="etb-dd-value">
                    <span class="etb-dd-text"
                      >{selectedSource ? sourceLabel(selectedSource) : "Select"}</span
                    >
                    <ChevronDown size={13} class="etb-dd-caret" />
                  </span>
                </button>
                <div class="etb-dd-menu" role="listbox">
                  {#each serversInCategory as src, i}
                    <button
                      type="button"
                      class="etb-dd-opt"
                      class:sel={selectedSource?.url === src.url}
                      role="option"
                      aria-selected={selectedSource?.url === src.url}
                      onclick={() => {
                        selectServerByUrl(src.url);
                        serverOpen = false;
                      }}>{sourceLabel(src, i)}</button
                    >
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
        <div class="etb-meta">
          <div class="etb-pills">
            {#if anime?.releaseDate || anime?.year}
              <span class="etb-pill">{anime?.releaseDate || anime?.year}</span>
            {/if}
            {#if episodes.length}
              <span class="etb-pill">{episodes.length} episodes</span>
            {/if}
            {#if anime?.status}
              <span class="etb-pill etb-pill-status">{anime.status}</span>
            {/if}
            {#if anime?.duration}
              <span class="etb-pill">{anime.duration} min</span>
            {/if}
          </div>
          <div class="etb-actions">
            <button
              class="etb-action"
              onclick={reportEpisode}
              title="Report a broken episode on Discord"
            >
              <Flag size={14} /> Report
            </button>
            <button
              class="etb-action"
              onclick={downloadEpisode}
              title="Download / open the current source"
            >
              <Download size={14} /> Download
            </button>
            <button
              class="etb-action"
              onclick={shareEpisode}
              title="Share this episode"
            >
              <Share2 size={14} /> {shareLabel}
            </button>
          </div>
        </div>
      </div>

      <!-- Anime info detail card (miruro-style) -->
      {#if anime}
        <div class="anime-detail-card cards-glass">
          <img
            class="adc-poster"
            src={getProxiedImage(anime?.image || anime?.poster)}
            alt={anime?.title}
            loading="lazy"
          />
          <div class="adc-body">
            <h2 class="adc-title">{anime?.title}</h2>
            {#if anime?.genres?.length}
              <div class="adc-genres">
                {#each anime.genres.slice(0, 6) as g}
                  <span class="adc-genre">{g}</span>
                {/each}
              </div>
            {/if}
            {#if anime?.description}
              <p class="adc-desc line-clamp-3">
                {@html anime.description}
              </p>
            {/if}
            <div class="adc-meta-grid">
              {#if anime?.type}<div class="adc-meta"><span>Format</span><strong>{anime.type}</strong></div>{/if}
              {#if anime?.status}<div class="adc-meta"><span>Status</span><strong>{anime.status}</strong></div>{/if}
              {#if episodes.length}<div class="adc-meta"><span>Episodes</span><strong>{episodes.length}</strong></div>{/if}
              {#if anime?.rating}<div class="adc-meta"><span>Rating</span><strong>{anime.rating}</strong></div>{/if}
              {#if anime?.releaseDate || anime?.year}<div class="adc-meta"><span>Released</span><strong>{anime?.releaseDate || anime?.year}</strong></div>{/if}
              {#if anime?.duration}<div class="adc-meta"><span>Duration</span><strong>{anime.duration} min</strong></div>{/if}
            </div>
          </div>
        </div>
      {/if}

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
            <WatchServers
              {sources}
              {groupedSources}
              {selectedSource}
              onSelect={handleSourceChange}
            />
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
    </div>

    <!-- Right Column: Episodes / Related / Recommendations -->
    <aside class="side-info-section">
      <WatchSidebar
        {episodes}
        {ep}
        {currentEpPage}
        {recommendations}
        relations={anime?.relations || []}
        onChangeEp={changeEp}
        onGoToPage={goToEpPage}
      />
    </aside>

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

  /* --- Watch Page Design System — Miruro-inspired flat/lightweight --- */
  /* VARIATION: adopts miruro.tv's flat panel system, compact spacing and
     hairline borders, but keeps the WatchAnimez brand RED accent (instead of
     miruro's violet) and the Outfit typeface for brand consistency. */
  .player-page {
    --accent: var(--net-red, #e50914);
    --accent-red: var(--net-red, #e50914);
    --accent-soft: color-mix(in srgb, var(--net-red, #e50914) 14%, transparent);
    --accent-glow: color-mix(in srgb, var(--net-red, #e50914) 22%, transparent);
    /* Poster-driven tint — overridden inline once the poster colour is read.
       Kept very subtle so the page reads light & flat like miruro. */
    --poster-tint: 229, 9, 20;
    --tint-soft: rgba(var(--poster-tint), 0.10);
    --tint-strong: rgba(var(--poster-tint), 0.16);
    --tint-glow: rgba(var(--poster-tint), 0.24);
    /* Flat surfaces (miruro tokens) */
    --surface-1: #0e0e0e;
    --surface-2: #141414;
    --surface-card: #181818;
    --surface-btn: #202020;
    --surface-btn-hover: #292929;
    --hairline: rgba(245, 245, 245, 0.10);
    --hairline-strong: rgba(245, 245, 245, 0.16);
    --glass-bg: var(--surface-1);
    --glass-border: var(--hairline);
    --txt: var(--net-text, #e8e8e8);
    --txt-muted: var(--net-text-muted, #a8a8a8);
    --txt-dim: #696969;
    --radius-card: 10px;
    --radius-inner: 8px;
    --gap-section: 1rem;

    position: relative;
    min-height: 100vh;
    background: var(--net-bg, #080808);
    color: var(--txt);
    overflow-x: hidden;
    padding-bottom: 5rem;
  }

  .page-background {
    position: fixed;
    inset: 0;
    background-size: cover;
    background-position: center 20%;
    filter: blur(6px) saturate(1.2) brightness(0.35);
    z-index: 0;
    transform: scale(1.12);
    opacity: 0.7;
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
    filter: blur(72px) saturate(1.2);
    opacity: 0.35;
    pointer-events: none;
    transition: opacity 0.6s ease, background 0.8s ease;
  }

  .player-wrapper:hover::before {
    opacity: 0.5;
  }

  .player-wrapper.theater {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.94);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(8px, 4vw, 56px);
  }

  .player-wrapper.theater::before {
    display: none;
  }

  .theater-exit {
    position: fixed;
    top: clamp(10px, 3vw, 22px);
    right: clamp(10px, 3vw, 22px);
    z-index: 1001;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.85rem;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    transition: background 0.2s;
  }
  .theater-exit:hover {
    background: rgba(255, 255, 255, 0.22);
  }

  .video-container {
    position: relative;
    z-index: 1;
    width: 100%;
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius-card);
    overflow: hidden;
    box-shadow: 0 0 0 1px var(--hairline);
    transition: border-radius 0.4s ease;
  }

  .video-container.theater {
    border-radius: 8px;
    width: min(100%, calc((100dvh - 2 * clamp(8px, 4vw, 56px)) * 16 / 9));
    height: auto;
    max-height: 100%;
    aspect-ratio: 16 / 9;
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

  /* Sections — flat miruro panel */
  .cards-glass {
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 0.85rem;
    box-shadow: none;
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

  /* TV Mode Enhancements */
  :global(.tv-mode) .watch-layout {
    grid-template-columns: 1fr;
  }
  :global(.tv-mode) .side-info-section {
    display: none;
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
  }

  @media (max-width: 768px) {
    .watch-layout {
      gap: 1.5rem;
    }

    .cards-glass {
      padding: 1.25rem;
      border-radius: 16px;
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

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }

  /* ============================================================= */
  /* === Miruro-inspired lightweight components (brand variant) === */
  /* ============================================================= */

  /* Player options bar */
  .player-options-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0.65rem;
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
  }
  .opt-toggles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  .opt-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.34rem 0.6rem;
    border-radius: var(--radius-inner);
    background: transparent;
    color: var(--txt-dim);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .opt-toggle:hover {
    background: var(--surface-btn);
    color: var(--txt);
  }
  .opt-toggle.on {
    color: var(--accent);
  }
  .opt-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid currentColor;
    box-sizing: border-box;
  }
  .opt-toggle.on .opt-dot {
    background: currentColor;
  }
  .opt-nav {
    display: flex;
    gap: 0.35rem;
  }
  .opt-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.34rem 0.7rem;
    border-radius: var(--radius-inner);
    background: var(--surface-btn);
    color: var(--txt);
    font-size: 0.78rem;
    font-weight: 600;
    transition: background 0.18s ease;
  }
  .opt-nav-btn:hover:not(:disabled) {
    background: var(--surface-btn-hover);
  }
  .opt-nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Episode title + audio/server bar */
  .episode-title-bar {
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-card);
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .etb-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .etb-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--txt);
    margin: 0;
    line-height: 1.3;
    min-width: 0;
  }
  .etb-num {
    color: var(--accent);
    margin-right: 0.15rem;
  }
  .etb-selectors {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .etb-select-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--txt-dim);
    font-weight: 700;
    padding-left: 2px;
  }

  /* Custom Audio/Server dropdown (hover-open on hover devices, tap on touch) */
  .etb-dd {
    position: relative;
  }
  .etb-dd-trigger {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    background: var(--surface-btn);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    padding: 0.34rem 0.65rem;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .etb-dd-trigger:hover {
    background: var(--surface-btn-hover);
    border-color: var(--hairline-strong);
  }
  .etb-dd-value {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--txt);
    max-width: 100%;
  }
  .etb-dd-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }
  .etb-dd-trigger :global(.etb-dd-caret) {
    flex-shrink: 0;
    color: var(--txt-dim);
    transition: transform 0.18s ease;
  }
  .etb-dd.open .etb-dd-trigger :global(.etb-dd-caret) {
    transform: rotate(180deg);
  }
  .etb-dd-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 100%;
    width: max-content;
    max-width: min(340px, 86vw);
    background: #141414;
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    padding: 0.3rem;
    z-index: 60;
    max-height: 300px;
    overflow-y: auto;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-6px);
    transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s ease;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  }
  /* The rightmost (Server) menu opens flush to the right to avoid overflow */
  .etb-dd-server .etb-dd-menu {
    left: auto;
    right: 0;
  }
  .etb-dd.open .etb-dd-menu {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
  /* Hover-capable devices (desktop): open on hover, no click needed */
  @media (hover: hover) and (pointer: fine) {
    .etb-dd:hover .etb-dd-menu {
      opacity: 1;
      visibility: visible;
      transform: none;
    }
    .etb-dd:hover .etb-dd-trigger :global(.etb-dd-caret) {
      transform: rotate(180deg);
    }
  }
  .etb-dd-opt {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.42rem 0.55rem;
    border-radius: 6px;
    background: none;
    border: none;
    color: var(--txt-muted);
    font-size: 0.8rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .etb-dd-opt:hover {
    background: var(--surface-btn);
    color: var(--txt);
  }
  .etb-dd-opt.sel {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }
  .etb-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .etb-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .etb-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .etb-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.34rem 0.7rem;
    border-radius: var(--radius-inner);
    background: var(--surface-btn);
    border: 1px solid var(--hairline);
    color: var(--txt-muted);
    font-size: 0.74rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .etb-action:hover {
    background: var(--surface-btn-hover);
    color: var(--txt);
    border-color: var(--hairline-strong);
  }
  .etb-pill {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--txt-muted);
    background: var(--surface-2);
    border: 1px solid var(--hairline);
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
  }
  .etb-pill-status {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    text-transform: capitalize;
  }

  /* Anime info detail card */
  .anime-detail-card {
    display: flex;
    gap: 0.85rem;
    padding: 0.85rem;
    margin-top: 1rem;
  }
  .adc-poster {
    width: 92px;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: var(--radius-inner);
    flex-shrink: 0;
  }
  .adc-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .adc-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--txt);
    margin: 0;
    line-height: 1.25;
  }
  .adc-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .adc-genre {
    font-size: 0.66rem;
    font-weight: 600;
    color: #3a2615;
    background: #e49335;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }
  .adc-desc {
    font-size: 0.8rem;
    color: var(--txt-muted);
    line-height: 1.5;
    margin: 0;
  }
  .adc-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 1.5rem;
    margin-top: 0.2rem;
  }
  .adc-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.74rem;
    border-bottom: 1px solid var(--hairline);
    padding: 0.28rem 0;
  }
  .adc-meta span {
    color: var(--txt-dim);
  }
  .adc-meta strong {
    color: var(--txt);
    font-weight: 600;
    text-align: right;
  }

  @media (max-width: 768px) {
    .player-options-bar {
      padding: 0.45rem;
    }
    .opt-toggle {
      font-size: 0.72rem;
      padding: 0.3rem 0.45rem;
    }
    .opt-nav-btn {
      font-size: 0.72rem;
      padding: 0.3rem 0.55rem;
    }
    .etb-title {
      font-size: 0.95rem;
    }
    .etb-selectors {
      width: 100%;
    }
    .etb-dd {
      flex: 1;
      min-width: 0;
    }
    .adc-poster {
      width: 76px;
    }
  }

  @media (max-width: 560px) {
    .adc-meta-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

  /* === Flatten legacy heavy components to match miruro look === */
  .chat-toggle-btn,
  .server-toggle-btn,
  .show-chat-btn,
  .show-servers-btn {
    background: var(--surface-1) !important;
    border: 1px solid var(--hairline) !important;
    border-radius: var(--radius-card) !important;
    padding: 0.7rem 0.9rem !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    font-size: 0.9rem;
  }
  .chat-toggle-btn:hover,
  .server-toggle-btn:hover,
  .show-chat-btn:hover,
  .show-servers-btn:hover {
    background: var(--surface-2) !important;
    border-color: var(--hairline-strong) !important;
    transform: none !important;
    box-shadow: none !important;
  }
  .chat-badge,
  .server-badge {
    background: var(--surface-btn) !important;
    border: 1px solid var(--hairline) !important;
    box-shadow: none !important;
    color: var(--txt-muted) !important;
    border-radius: 999px !important;
  }

  /* Flatten engagement strip accents */
  .watch-engagement-strip {
    border-radius: var(--radius-card);
  }
  .engagement-kicker {
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .comment-jump-btn {
    background: var(--surface-btn);
    border: 1px solid var(--hairline);
    border-radius: var(--radius-inner);
    color: var(--txt);
  }
  .comment-jump-btn:hover {
    background: var(--surface-btn-hover);
  }

  /* Flatten back button */
  .nav-back-btn {
    background: var(--surface-1);
    border: 1px solid var(--hairline);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-radius: var(--radius-inner);
  }

  /* ===================================================== */
  /* === Dense single-screen layout (miruro round 2)   === */
  /* ===================================================== */

  /* Tighten the overall grid + rail */
  /* Use much more of the screen like miruro (content ~1740px at 1920 vs the
     global 1400px cap), with a wider rail and breathing room between columns. */
  .player-page .container {
    max-width: 1800px;
  }
  @media (min-width: 1400px) {
    .player-page .container {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  }
  .watch-layout {
    grid-template-columns: minmax(0, 1fr) 380px;
    gap: 1.5rem;
    margin-top: 0.85rem;
  }
  /* Desktop placement: player (col1/row1), rail spans the full height on the
     right (col2), comments sit under the player in col1/row2. */
  .primary-section {
    grid-column: 1;
    grid-row: 1;
    gap: 0.85rem;
  }
  .side-info-section {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .community-section {
    grid-column: 1;
    grid-row: 2;
  }
  /* Let the whole rail flow naturally (stack episodes + detail + related + recs) */
  .side-info-section {
    position: static;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  /* --- Responsive: rail drops below the player --- */
  @media (max-width: 1100px) {
    .watch-layout {
      grid-template-columns: 1fr;
    }
    /* Stack in a clear order on mobile/tablet:
       player → episodes/related/recommendations → comments. */
    .primary-section,
    .side-info-section,
    .community-section {
      grid-column: auto;
      grid-row: auto;
    }
    .primary-section {
      order: 1;
    }
    .side-info-section {
      order: 2;
      flex-direction: column;
    }
    .community-section {
      order: 3;
    }
  }

  @media (max-width: 400px) {
    .watch-layout {
      gap: 0.85rem;
    }
  }
</style>
