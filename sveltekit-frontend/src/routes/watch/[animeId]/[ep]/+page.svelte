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
  import WatchPlayer from "./WatchPlayer.svelte";
  import WatchControlDeck from "./WatchControlDeck.svelte";
  import WatchTitleBar from "./WatchTitleBar.svelte";
  import WatchInfoCard from "./WatchInfoCard.svelte";
  import WatchEngagement from "./WatchEngagement.svelte";
  // LiveChat & CommentsSection are lazy-loaded (below the fold) to keep
  // their ~28KB out of the initial watch chunk.

  let { data } = $props();
  const animeId = $derived(data.animeId);

  let tempEpUrl = $derived(data.ep);
  let ep = $state(0);
  let currentLoadId = 0;

  // ── Per-episode source cache ──────────────────────────────────────────
  // Collecting sources means fanning out to ~14 live provider endpoints, which
  // is the slowest part of loading an episode. Cache the merged result per
  // anime+episode for the session so back/forward, auto-next return, and
  // re-selecting the same episode are instant instead of re-scraping.
  const _sourceCache = new Map<string, any[]>();
  const sourceCacheKey = (a: string | number, e: number) => `${a}:${e}`;

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

  let anime: any = $state(data.ssrAnime ?? null);
  let posterColor = $state(""); // dominant poster color as "r, g, b"
  let recommendations: any[] = $state(data.ssrRecommendations ?? []);
  let relatedItems: any[] = $state([]);
  let sources: any[] = $state([]);
  let episodes: any[] = $state(data.ssrEpisodes ?? []);
  let selectedSource: any = $state(null);
  let userOverride = false; // set true when user manually picks a server

  // ── Last-server persistence ────────────────────────────────────────
  // The user's last manually-selected server is saved to localStorage
  // and reused as the default for every episode (incl. auto-next)
  // until they pick a different one.
  const SERVER_PREF_KEY = "watch_last_server";

  function saveServerPref(src: any) {
    if (!src) return;
    try {
      localStorage.setItem(
        SERVER_PREF_KEY,
        JSON.stringify({ provider: src.provider || "", name: src.name || "" }),
      );
    } catch {}
  }

  function loadServerPref(): { provider: string; name: string } | null {
    try {
      const raw = localStorage.getItem(SERVER_PREF_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function matchServerPref(
    s: any,
    pref: { provider: string; name: string } | null,
  ): boolean {
    if (!pref) return false;
    const prov = (s.provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const name = (s.name || "").toLowerCase();
    const prefProv = (pref.provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const prefName = (pref.name || "").toLowerCase();
    return (
      (prefProv === "" || prov.includes(prefProv)) &&
      (prefName === "" || name.includes(prefName))
    );
  }

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

  let showBookmarkAlert = $state(true);
  onMount(() => {
    if (localStorage.getItem("dismissed_bookmark_alert") === "true") {
      showBookmarkAlert = false;
    }
  });
  function dismissBookmarkAlert() {
    showBookmarkAlert = false;
    localStorage.setItem("dismissed_bookmark_alert", "true");
  }

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
    // Neutralize provider names so upstream source names are hidden from users
    const provRenameMap: Record<string, string> = {
      "HiAnime":             "P1",   // HiAnime
      "AniNeko":             "P2",   // AniNeko
      "VidSrc":              "P3",   // VidSrc
      "9anime":              "P4",   // 9anime
      "Animelok":            "P5",   // Animelok
      "DesiDubAnime":        "P6",   // DesiDub
      "DesiDub":             "P6",   // DesiDub
      "AnimeHindiDubbed":    "P7",   // AnimeHindiDubbed
      "AnimeHindiDubbed-WP": "P7",
      "Toonstream":          "P8",   // Toonstream
      "WatchAnimeWorld":     "P9",   // WatchAnimeWorld
      "Aniwaves":            "P10",  // Aniwaves
      "Animen":              "P11",  // Animen
      "AnimixStream":        "P12",  // AnimixStream
      "AnimePahe":           "P13",  // AnimePahe
      "Tatakai":             "P14",  // Tatakai
    };
    const rawProv = src.provider ? String(src.provider).split(/[\s(]/)[0] : "";
    const prov = provRenameMap[rawProv] || rawProv || "";
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

      // Map real provider names → neutral display names
      // Real names kept as comments so devs know the mapping
      const providerDisplayMap: Record<string, string> = {
        "HiAnime":              "Provider 1",  // HiAnime
        "AniNeko":              "Provider 2",  // AniNeko
        "VidSrc":               "Provider 3",  // VidSrc
        "9anime":               "Provider 4",  // 9anime
        "Animelok":             "Provider 5",  // Animelok
        "DesiDubAnime":         "Provider 6",  // DesiDub
        "DesiDub":              "Provider 6",  // DesiDub (alt key)
        "AnimeHindiDubbed":     "Provider 7",  // AnimeHindiDubbed
        "AnimeHindiDubbed-WP":  "Provider 7",  // AnimeHindiDubbed (alt key)
        "AHD (AnimeHindiDubbed)": "Provider 7", // AnimeHindiDubbed (legacy)
        "Toonstream":           "Provider 8",  // Toonstream
        "WatchAnimeWorld":      "Provider 9",  // WatchAnimeWorld
        "Aniwaves":             "Provider 10", // Aniwaves
        "Animen":               "Provider 11", // Animen
        "AnimixStream":         "Provider 12", // AnimixStream
        "AnimePahe":            "Provider 13", // AnimePahe
      };

      for (const src of sources) {
        let providerName = src.provider || "Unknown Provider";

        // Neutralize: map real name → "Provider N" (hide upstream source names)
        // If provider string contains a known key (e.g. "Miruro (kiwi)"), match prefix
        const directMatch = providerDisplayMap[providerName];
        if (directMatch) {
          providerName = directMatch;
        } else {
          // Check prefix match for compound names like "Miruro (kiwi)"
          const prefix = Object.keys(providerDisplayMap).find(k => providerName.startsWith(k));
          if (prefix) {
            providerName = providerDisplayMap[prefix];
          } else {
            // Fallback: generic neutral name
            providerName = "Provider";
          }
        }

      let cat = "Subbed";
      const lang = (src.language || "").toLowerCase();
      const type = (src.type || "").toLowerCase();
      const c = (src.category || "").toLowerCase();
      // Use original provider name (before rename) for category detection
      const rawProv = (src.provider || "").toLowerCase();

      if (
        lang.includes("hindi") ||
        c === "hindi" ||
        ((lang.includes("multi") || lang === "multi-audio") &&
          (rawProv.includes("desidub") || rawProv.includes("hindi")))
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
  let activeUrl: string = $state("");
    let hls: any = null;
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

  async function buildRelated() {
    const valid = (anime?.relations || []).filter(
      (r: any) => (r?.title || r?.name) && (r?.poster || r?.image),
    );
    relatedItems = valid;
    if (valid.length >= 6) return;

    const genres = (anime?.genres || [])
      .map((g: any) => (typeof g === "string" ? g : g?.name))
      .filter(Boolean);
    if (!genres.length) return;
    const genre = genres[Math.floor(Math.random() * genres.length)];

    try {
      const gRes = await api.getByGenre(genre, 1, 24);
      const pool = (gRes?.data || gRes?.results || gRes || []).filter(
        (a: any) =>
          String(a?.id || a?.mal_id) !== String(animeId) &&
          (a?.poster || a?.image) &&
          (a?.title || a?.name),
      );
      // Fisher-Yates shuffle for random fallback picks
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const seen = new Set(valid.map((r: any) => String(r.id || r.mal_id)));
      const extra = pool.filter((a: any) => !seen.has(String(a.id || a.mal_id)));
      relatedItems = [...valid, ...extra].slice(0, 12);
    } catch (e) {
      console.error("Related genre fallback failed:", e);
    }
  }

  onMount(async () => {
    // If SSR already provided anime/episodes/recs, skip the API calls.
    // Only fetch client-side if SSR failed or returned empty.
    const needFetch = !anime || episodes.length === 0;
    if (needFetch) {
      try {
        const [animeRes, metaRes, recsRes] = await Promise.all([
          api.getAnime(animeId),
          api.getEpisodeMetadata(animeId, 1, 2000),
          api.getRecommendations(animeId),
        ]);
        anime = animeRes;
        episodes = metaRes?.data?.episodes || [];
        recommendations = recsRes || [];
      } catch (e) {
        console.error(e);
      }
    }

    // Always run these client-side (need DOM / anime data)
    if (anime) extractPosterColor(getProxiedImage(anime?.image || anime?.poster));

    // Build the Related list: prefer real relations, but if they're missing or
    // junk (no title/poster), fall back to random genre-matched anime.
    await buildRelated();

    // Auto-select pagination page that contains the current episode
    if (ep > 0 && episodes.length > 0) {
      const pageIdx = Math.floor((ep - 1) / EPISODES_PER_PAGE);
      if (pageIdx >= 0 && pageIdx < totalPages) {
        currentEpPage = pageIdx;
      }
    }

    loading = false;
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

  // ── Server priority selection ─────────────────────────────────────
  // Picks the best source from a pool, in priority order.
  // For Sub/English/Multi audio: Vidnest Multi → Pahe → 9anime.
  // For Hindi audio: DesiDub Abyss → then sub priorities.
  // Hoisted to component scope so both loadSources() and the per-episode
  // source cache path can reuse it.
  function pickByPriority(pool: any[]): any | null {
    if (!pool || pool.length === 0) return null;

    // 0. Last-user-selected server (highest priority — persists across episodes)
    const saved = loadServerPref();
    if (saved) {
      const m = pool.find((s: any) => matchServerPref(s, saved));
      if (m) return m;
    }

    const preferredLang = ($auth.currentProfile?.language || "multi").toLowerCase();
    const isHindi = preferredLang === "hindi";

    const match = (s: any, provKey: string, nameKey: string) => {
      const prov = (s.provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const name = (s.name || "").toLowerCase();
      const provMatch = provKey === "" || prov.includes(provKey.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const nameMatch = nameKey === "" || name.includes(nameKey.toLowerCase());
      return provMatch && nameMatch;
    };

    const candidates = pool;
    if (isHindi) {
      const hindi = pool.filter((s: any) =>
        (s.language || "").toLowerCase().includes("hindi") ||
        (s.category || "").toLowerCase() === "hindi",
      );
      if (hindi.length > 0) {
        const abyss = hindi.find((s: any) =>
          match(s, "desidub", "abyss") || match(s, "desidubanime", "abyss")
        );
        if (abyss) return abyss;
        return hindi[0];
      }
    }

    const vidnest = candidates.find((s: any) => match(s, "tatakai", "vidnest"));
    if (vidnest) return vidnest;
    const pahe = candidates.find((s: any) => match(s, "tatakai", "pahe"));
    if (pahe) return pahe;
    const nineAnime = candidates.find((s: any) => {
      const prov = (s.provider || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      return prov.includes("9anime") || prov.includes("nineanime");
    });
    if (nineAnime) return nineAnime;
    const sub = candidates.filter((s: any) =>
      !(s.language || "").toLowerCase().includes("hindi") &&
      (s.category || "").toLowerCase() !== "hindi",
    );
    if (sub.length > 0) return sub[0];
    return candidates[0];
  }

  async function loadSources() {
    const loadId = ++currentLoadId;
    sourceLoading = true;
    error = "";
    sources = [];
    selectedSource = null;
    userOverride = false;
    cancelCountdown();

    if (hls) {
      hls.destroy();
      hls = null;
    }

    // Cache hit: reuse this episode's already-collected sources instead of
    // re-scraping all providers. Instant on back/forward and auto-next return.
    const cacheKey = sourceCacheKey(animeId, ep);
    const cachedSources = _sourceCache.get(cacheKey);
    if (cachedSources && cachedSources.length > 0) {
      sources = cachedSources;
      const best = pickByPriority(cachedSources) || cachedSources[0];
      selectedSource = best;
      sourceLoading = false;
      return;
    }

    const providerConfigs = [
          // Tatakai (self-hosted TatakaiAPI animeya) — default/first
          { name: "Provider 0", fetcher: api.getTatakaiSources },   // Tatakai
          // New AniPlay-sourced providers (highest priority — listed first)
          { name: "Provider 1", fetcher: api.getHiAnimeSources },    // HiAnime
          { name: "Provider 2", fetcher: api.getAniNekoSources },    // AniNeko
          { name: "Provider 3", fetcher: api.getVidSrcSources },     // VidSrc
          // Existing providers
          { name: "Provider 4", fetcher: api.getNineAnimeSources },  // 9anime
          { name: "Provider 5", fetcher: api.getAnimelokSources },   // Animelok
          { name: "Provider 6", fetcher: api.getDesiDubSources },    // DesiDub
          { name: "Provider 7", fetcher: api.getAHDSources },        // AnimeHindiDubbed
          { name: "Provider 8", fetcher: api.getToonstreamSources }, // Toonstream
          { name: "Provider 9", fetcher: api.getWatchAnimeWorldSources },  // WatchAnimeWorld
          { name: "Provider 10", fetcher: api.getAniwavesSources },  // Aniwaves
          { name: "Provider 11", fetcher: api.getAnimenSources },    // Animen
          { name: "Provider 12", fetcher: api.getAnimixStreamSources }, // AnimixStream
          { name: "Provider 13", fetcher: api.getAnimePaheSources }, // AnimePahe
        ];

    let autoStarted = false;
    let providersFinished = 0;

    // ── Server priority selection ─────────────────────────────────────
    // (pickByPriority is hoisted to component scope so the per-episode cache
    //  path can reuse it.)

    const choosePreferredSource = (providerSources: any[]) => {
      // Use priority picker on the new sources; falls back to null if none match
      // (caller will use first source as final fallback)
      return pickByPriority(providerSources);
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
          // Just set the source — the selectedSource $effect owns player init,
          // so playback starts exactly once (no double HLS load).
          selectedSource = candidate;
          autoStarted = true;
          sourceLoading = false;
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

    // After all providers finish, pick the best source ONLY if nothing has
    // started playing yet. We never yank an already-playing source out from
    // under the viewer just because a lower-priority provider replied later —
    // that used to restart playback mid-stream. Each provider batch already
    // runs through pickByPriority on arrival, so the first good match wins.
    if (!userOverride && !autoStarted && sources.length > 0) {
      const best = pickByPriority(sources);
      if (best) {
        console.log(`[Player] Selecting priority source: ${best.name}`);
        selectedSource = best;
      }
    }

    sourceLoading = false;
    if (sources.length === 0) {
      error = "No sources found for this episode on any provider.";
    } else {
      // Memoize this episode's sources so a return visit skips the provider
      // fan-out entirely (see the cache-hit short-circuit at the top).
      _sourceCache.set(sourceCacheKey(animeId, ep), sources);
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
      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
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

  // Single owner of player initialization: whenever the *active source URL*
  // changes (or the video element mounts), (re)initialize exactly once.
  // loadSources() no longer calls initPlayer directly — it only sets
  // selectedSource — so a source can never be initialized twice.
  let lastInitUrl = "";
  $effect(() => {
    const src = selectedSource;
    if (!src) {
      lastInitUrl = "";
      return;
    }
    const url = src.url;
    const isEmbed =
      src.isEmbed ||
      src.type === "iframe" ||
      url.includes("embed") ||
      !url.includes(".m3u8");

    untrack(() => {
      if (!videoElement) return;
      if (isEmbed) {
        if (hls) { hls.destroy(); hls = null; }
        videoElement.pause();
        videoElement.src = "";
        videoElement.removeAttribute("src");
        videoElement.load();
        lastInitUrl = "";
        return;
      }
      // Native/HLS source — only (re)init when the URL actually changed.
      if (url === lastInitUrl) return;
      lastInitUrl = url;
      initPlayer(url);
    });
  });

  function changeEp(newEp: number) {
    ep = newEp;
    showResumePrompt = false;
    cancelCountdown();
    lastSavedTime = 0;
    goto(`/watch/${animeId}/${newEp}`, { replaceState: true });
    loadSources();
    checkResumeProgress();
    document.querySelector('.theater-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSourceChange(src: any) {
    selectedSource = src;
  }

  // User manually selected a server — prevent priority auto-switching
  function userSelectSource(src: any) {
    userOverride = true;
    saveServerPref(src);
    handleSourceChange(src);
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
  <meta name="description" content={anime ? `Watch ${anime.title} Episode ${ep} online for free on WatchAnimez. Stream subbed and dubbed with multiple sources.` : `Watch anime Episode ${ep} online for free on WatchAnimez.`} />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
  class="player-page"
  style={posterColor ? `--poster-tint: ${posterColor};` : ""}
>

  {#if showBookmarkAlert}
    <div class="bookmark-alert">
      <div class="bookmark-alert-content">
        <AlertCircle size={15} class="bookmark-alert-icon" />
        <span>Bookmark WatchAnimez so you never lose us</span>
      </div>
      <div class="bookmark-alert-actions">
        <a href="https://watchanimez.me" target="_blank" class="bookmark-alert-btn">watchanimez.me</a>
        <button onclick={dismissBookmarkAlert} class="bookmark-alert-close" aria-label="Dismiss alert">
          <X size={15} />
        </button>
      </div>
    </div>
  {/if}

  <!-- Back Button -->
  <div class="top-nav watch-container">
    <button class="nav-back-btn" onclick={() => goto(`/anime/${animeId}`)} aria-label="Back to anime details">
      <ChevronLeft size={20} />
      <span class="back-label">Back</span>
    </button>
  </div>

  {#if theaterMode}
    <button class="lights-dim" aria-label="Turn lights on" onclick={() => (theaterMode = false)}></button>
  {/if}

  <!-- Theater Section: Player + Episode Sidebar -->
  {#if loading}
    <div class="theater-section watch-container">
      <div class="theater-main">
        <div class="loading-skeleton player-loading" role="status" aria-label="Loading player">
          <div class="spinner"></div>
          <span>Loading episode…</span>
        </div>
      </div>
      <aside class="theater-sidebar">
        <div class="loading-skeleton sidebar-loading" aria-hidden="true">
          {#each Array(7) as _, i (i)}<div class="sb-row"></div>{/each}
        </div>
      </aside>
    </div>
  {:else}
  <div class="theater-section watch-container">
    <div class="theater-main">
      <!-- Video Player -->
      <WatchPlayer
        {sourceLoading}
        {sources}
        {error}
        {selectedSource}
        {isEmbedPlayer}
        {activeUrl}
        {autoplay}
        bind:videoElement
        {anime}
        {theaterMode}
        {isRotated}
        {showResumePrompt}
        {resumeTime}
        {showCountdown}
        {countdownSeconds}
        onLoadSources={loadSources}
        onToggleRotation={toggleRotation}
        onToggleShortcuts={() => (showShortcuts = !showShortcuts)}
        onResumePlayback={resumePlayback}
        onDismissResume={dismissResume}
        onCancelCountdown={cancelCountdown}
        onSaveProgress={() => saveProgress()}
        onSaveProgressForce={() => saveProgress(true)}
      />

      <!-- Control Deck -->
      <WatchControlDeck
        {autoplay}
        {autoSkip}
        {autoNext}
        {theaterMode}
        {showShortcuts}
        {isEmbedPlayer}
        {ep}
        totalEpisodes={episodes.length}
        {sources}
        {selectedSource}
        {audioCategories}
        {selectedCategory}
        {serversInCategory}
        {sourceLabel}
        onSelectAudioCategory={selectAudioCategory}
        onSelectServerByUrl={selectServerByUrl}
        onToggleAutoplay={() => (autoplay = !autoplay)}
        onToggleAutoSkip={() => (autoSkip = !autoSkip)}
        onToggleAutoNext={() => (autoNext = !autoNext)}
        onToggleTheater={() => (theaterMode = !theaterMode)}
        onToggleShortcuts={() => (showShortcuts = !showShortcuts)}
      />
    </div>

    <!-- Episode Sidebar -->
    <aside class="theater-sidebar">
      <WatchSidebar
        {episodes}
        {ep}
        {currentEpPage}
        {anime}
        onChangeEp={changeEp}
        onGoToPage={goToEpPage}
      />
    </aside>
  </div>
  {/if}

  <!-- Detail Section: Two Columns -->
  <div class="detail-section watch-container">
    <div class="detail-primary">
      <!-- Title Bar -->
      <WatchTitleBar
        {ep}
        {currentEpisodeTitle}
        {anime}
        {animeId}
        onReport={reportEpisode}
        onDownload={downloadEpisode}
        onShare={shareEpisode}
        {shareLabel}
      />

      <!-- Info Card -->
      <WatchInfoCard {anime} {episodes} />

      <!-- Engagement Strip -->
      <WatchEngagement {animeId} {ep} />

      <!-- Collapsible LiveChat -->
      <div class="collapsible-section">
        <button
          class="section-toggle-btn"
          onclick={() => { showLiveChat = !showLiveChat; if (showLiveChat) { showServers = false; loadLiveChat(); } }}
          aria-expanded={showLiveChat}
        >
          <MessageSquare size={18} />
          <span>{showLiveChat ? 'Hide Live Chat' : 'Live Chat'}</span>
          <ChevronDown size={16} class={showLiveChat ? 'rotated' : ''} />
          {#if !showLiveChat}<span class="section-badge">Optional</span>{/if}
        </button>
        {#if showLiveChat && LiveChatComp}
          <div class="section-content">
            <LiveChatComp {animeId} episode={ep} isInline={true} onClose={() => showLiveChat = false} />
          </div>
        {/if}
      </div>

      <!-- Collapsible Server Selection -->
      <div class="collapsible-section">
        <button
          class="section-toggle-btn"
          onclick={() => (showServers = !showServers)}
          aria-expanded={showServers}
        >
          <Server size={18} />
          <span>{showServers ? 'Hide Servers' : 'Server Selection'}</span>
          <ChevronDown size={16} class={showServers ? 'rotated' : ''} />
          {#if !showServers}<span class="section-badge">{sources.length} Sources</span>{/if}
        </button>
        {#if showServers && Object.keys(groupedSources).length > 0}
          <div class="section-content">
            <WatchServers {sources} {groupedSources} {selectedSource} onSelect={userSelectSource} />
          </div>
        {/if}
      </div>

      <!-- Comments Section -->
      <div class="comments-container">
        <div class="community-section" id="community" bind:this={commentsEl}>
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
    </div>

    <!-- Recommendations / Related Column -->
    <div class="detail-secondary">
      {#if relatedItems?.length}
        <div class="rail-panel rail-section">
          <div class="rail-head"><span>Related</span></div>
          <div class="rail-list">
            {#each relatedItems.slice(0, 10) as item}
              <a class="rail-item animate-hover" href={`/anime/${item.id || item.mal_id}`}>
                <img
                  class="rail-thumb"
                  src={getProxiedImage(item.poster || item.image)}
                  alt={item.title || item.name}
                  loading="lazy"
                />
                <div class="rail-item-body">
                  <span class="rail-item-title line-clamp-2">{item.title || item.name}</span>
                  <span class="rail-item-meta">
                    {item.type || item.format || "Anime"}{item.episodes
                      ? ` · ${item.episodes} eps`
                      : ""}
                  </span>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      {#if recommendations.length}
        <div class="rail-panel rail-section">
          <div class="rail-head"><span>Recommendations</span></div>
          <div class="rail-list">
            {#each recommendations.slice(0, 12) as item}
              <a class="rail-item animate-hover" href={`/anime/${item.id || item.mal_id}`}>
                <img
                  class="rail-thumb"
                  src={getProxiedImage(item.poster || item.image)}
                  alt={item.title || item.name}
                  loading="lazy"
                />
                <div class="rail-item-body">
                  <span class="rail-item-title line-clamp-2">
                    <span class="blue-dot">•</span> {item.title || item.name}
                  </span>
                  <span class="rail-item-meta">
                    {item.type || item.format || "Anime"}{item.episodes
                      ? ` · ${item.episodes} eps`
                      : ""}{item.score || item.rating
                      ? ` · ★ ${item.score || item.rating}`
                      : ""}
                  </span>
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Shortcuts Dialog -->
  {#if showShortcuts}
    <div class="shortcuts-overlay" onclick={() => (showShortcuts = false)} role="button" tabindex="0" aria-label="Close shortcuts">
      <div class="shortcuts-modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="shortcuts-title" tabindex="-1">
        <h3 id="shortcuts-title">Keyboard Shortcuts</h3>
        <div class="key-list">
          <div class="key-item"><kbd>F</kbd> <span>Toggle Fullscreen</span></div>
          <div class="key-item"><kbd>T</kbd> <span>Theater Mode</span></div>
          <div class="key-item"><kbd>N</kbd> <span>Next Episode</span></div>
          <div class="key-item"><kbd>P</kbd> <span>Previous Episode</span></div>
          <div class="key-item"><kbd>?</kbd> <span>Toggle Help</span></div>
        </div>
        <button class="close-modal-btn" onclick={() => (showShortcuts = false)}>GOT IT</button>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Comments skeleton */
  .comments-skeleton { border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; background: rgba(14, 14, 20, 0.5); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 1.5rem; }
  .comments-skeleton .cs-title { width: 160px; height: 1.2rem; border-radius: 6px; margin-bottom: 1.5rem; }
  .comments-skeleton .cs-row { display: flex; gap: 0.85rem; margin-bottom: 1.5rem; }
  .comments-skeleton .cs-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
  .comments-skeleton .cs-body { flex: 1; }
  .comments-skeleton .cs-line { height: 0.8rem; border-radius: 4px; margin-bottom: 0.5rem; width: 100%; }
  .comments-skeleton .cs-line.short { width: 55%; }
  .comments-skeleton .shimmer {
    background: linear-gradient(100deg, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.05) 70%);
    background-size: 200% 100%; animation: cs-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes cs-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Loading skeleton (initial mount) */
  .loading-skeleton.player-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.85rem;
    aspect-ratio: 16 / 9; width: 100%;
    background: #0e0e0e; border-radius: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem; font-weight: 600;
  }
  .loading-skeleton.player-loading .spinner {
    width: 38px; height: 38px;
    border: 3px solid rgba(255, 255, 255, 0.12);
    border-top-color: var(--accent, #e50914);
    border-radius: 50%;
    animation: ls-spin 0.8s linear infinite;
  }
  @keyframes ls-spin { to { transform: rotate(360deg); } }
  .loading-skeleton.sidebar-loading {
    display: flex; flex-direction: column; gap: 0.5rem;
    padding: 0.75rem;
  }
  .loading-skeleton.sidebar-loading .sb-row {
    height: 56px; border-radius: 8px;
    background: linear-gradient(100deg, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.11) 50%, rgba(255,255,255,0.05) 70%);
    background-size: 200% 100%;
    animation: ls-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes ls-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  /* Page Shell */
  .player-page {
    --accent: #e50914; /* Brand red */
    --accent-hover: #f40612;
    --net-red: #e50914;
    --net-red-hover: #f40612;
    --net-bg: #09090c;
    --net-bg-lite: #121217;
    --net-card-bg: #181822;
    --net-card-hover: #232332;
    --poster-tint: 229, 9, 20; /* RGB for #e50914 (brand red) */
    position: relative;
    min-height: 100vh; /* fallback for older browsers */
    min-height: 100dvh;
    background: #09090c;
    color: #e4e4e7;
    overflow-x: hidden;
    padding-bottom: 5rem;
  }
  .watch-container { max-width: 1720px; margin: 0 auto; padding: 0 1rem; }

  /* Top Nav */
  .top-nav {
    position: sticky; top: 0; z-index: 100;
    background: var(--bg, #0a0a0a);
    padding: 1.25rem 1rem 0.25rem;
    padding-top: max(1.25rem, env(safe-area-inset-top));
  }
  .nav-back-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    height: 42px; padding: 0 1.1rem 0 0.85rem;
    background: #0e0e0e; border: 1px solid rgba(245,245,245,0.10);
    border-radius: 999px; color: var(--net-text, #e8e8e8);
    font-weight: 700; font-size: 0.9rem; cursor: pointer;
    transition: all 0.25s; backdrop-filter: blur(12px);
  }
  .nav-back-btn:hover {
    background: color-mix(in srgb, var(--accent) 16%, #0e0e0e);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(-3px);
  }

  /* Lights Off Overlay */
  .lights-dim {
    position: fixed; inset: 0; z-index: 30;
    background: rgba(0,0,0,0.86); border: none; cursor: pointer;
    animation: lightsFade 0.22s ease;
  }
  @keyframes lightsFade { from { opacity: 0; } to { opacity: 1; } }

  /* Theater Section — Player + Sidebar side by side */
  .theater-section {
    position: relative; z-index: 40;
    display: flex; gap: 0;
    margin-top: 1rem;
  }
  .theater-main {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
  }
  .theater-sidebar {
    width: 380px; flex-shrink: 0;
    max-height: calc(56.25vw - 2.5rem); /* match player aspect ratio */
    overflow-y: auto;
    border-left: 1px solid rgba(255,255,255,0.05);
    background: #09090d;
    border-radius: 0 10px 10px 0;
  }
  /* Constrain sidebar height to player height on large screens */
  @media (min-width: 1721px) {
    .theater-sidebar { max-height: 754px; } /* 1340 * 9/16 */
  }

  /* Detail Section — content below theater */
  .detail-section {
    position: relative; z-index: 5;
    margin-top: 1.5rem;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .detail-primary {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-width: 0;
  }
  .detail-secondary {
    width: 380px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Bookmark alert top bar */
  .bookmark-alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(217, 160, 28, 0.12);
    border: 1px solid rgba(217, 160, 28, 0.25);
    color: #e2b13c;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    font-weight: 700;
    z-index: 1000;
    border-radius: 0 0 10px 10px;
    margin: 0 auto 0.5rem;
    max-width: 1720px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  }
  .bookmark-alert-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.bookmark-alert-icon) {
    color: #d9a01c;
    flex-shrink: 0;
  }
  .bookmark-alert-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .bookmark-alert-btn {
    background: #d9a01c;
    color: #000;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    transition: all 0.2s;
  }
  .bookmark-alert-btn:hover {
    background: #e2b13c;
    transform: translateY(-1px);
  }
  .bookmark-alert-close {
    color: rgba(255, 255, 255, 0.5);
    display: inline-flex;
    cursor: pointer;
    transition: color 0.2s;
  }
  .bookmark-alert-close:hover {
    color: #fff;
  }

  /* Rail lists (moved from sidebar) */
  .rail-panel {
    background: rgba(14, 14, 20, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 1rem;
  }
  .rail-head {
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #fff;
    margin-bottom: 0.85rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .rail-head::before {
    content: "";
    width: 3px;
    height: 0.9em;
    border-radius: 999px;
    background: var(--accent, #e50914);
  }
  .rail-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .rail-item {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    transition: all 0.25s ease;
  }
  .rail-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.05);
    transform: translateX(4px);
  }
  .rail-thumb {
    width: 50px;
    height: 70px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.05);
  }
  .rail-item-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.3rem;
  }
  .rail-item-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: #e8e8e8;
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .rail-item-meta {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.4);
  }
  .blue-dot {
    color: #3b82f6;
    font-size: 1.1rem;
    line-height: 1;
  }

  /* Collapsible Sections */
  .collapsible-section { margin-top: 0; }
  .section-toggle-btn {
    display: flex; align-items: center; gap: 0.75rem;
    width: 100%; padding: 1.15rem 1.5rem;
    background: rgba(14, 14, 20, 0.5); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px; color: rgba(255,255,255,0.85);
    font-family: inherit; font-size: 0.95rem; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  .section-toggle-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .section-badge {
    margin-left: auto;
    padding: 0.15rem 0.5rem; border-radius: 6px;
    font-size: 0.65rem; font-weight: 700;
    background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.4);
  }
  .section-content {
    margin-top: 0.5rem;
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 16px;
    overflow: hidden;
    background: rgba(14, 14, 20, 0.35);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }
  :global(.section-toggle-btn .rotated) { transform: rotate(180deg); }

  /* Community / Comments */
  .community-section { margin-top: 0; }
  .comments-container {
    min-width: 0;
    margin-bottom: 1rem;
  }

  /* Shortcuts Modal */
  .shortcuts-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
  }
  .shortcuts-modal {
    background: #141414; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 1.5rem 2rem;
    min-width: 280px; max-width: 380px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .shortcuts-modal h3 {
    font-size: 1rem; font-weight: 800; margin: 0 0 1rem; color: #fff;
  }
  .key-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .key-item {
    display: flex; align-items: center; gap: 0.75rem;
    font-size: 0.82rem; color: rgba(255,255,255,0.7);
  }
  .key-item kbd {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 28px; height: 28px; padding: 0 0.4rem;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px; font-family: inherit; font-size: 0.78rem;
    font-weight: 700; color: #fff;
  }
  .close-modal-btn {
    margin-top: 1.25rem; width: 100%; padding: 0.6rem;
    background: var(--accent); color: #fff; border: none;
    border-radius: 10px; font-weight: 800; font-size: 0.82rem;
    cursor: pointer; font-family: inherit;
    letter-spacing: 0.05em;
  }

  /* Responsive */
  @media (max-width: 1100px) {
    .theater-section { flex-direction: column; }
    .theater-sidebar {
      width: 100%;
      max-height: 420px;
      border-left: none; border-top: 1px solid rgba(255,255,255,0.05);
      border-radius: 0 0 10px 10px;
    }
    .detail-section {
      display: flex;
      flex-direction: column;
    }
    .detail-primary {
      width: 100%;
      max-width: 100%;
    }
    .detail-secondary {
      width: 100%;
      order: 2;
      margin-top: 1rem;
      margin-bottom: 2rem;
    }
  }
  @media (max-width: 768px) {
    .watch-container { padding: 0 0.5rem; }
    .top-nav { padding: 0.75rem 0.5rem 0.25rem; }
    .back-label { display: none; }
    .nav-back-btn { padding: 0 0.7rem; }
    .bookmark-alert {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
      padding: 0.55rem 0.65rem;
      padding-top: max(0.65rem, env(safe-area-inset-top));
      font-size: 0.78rem;
      border-radius: 0;
      width: 100%;
    }
    .bookmark-alert-content {
      gap: 0.35rem;
      flex: 1;
      min-width: 0;
      line-height: 1.35;
    }
    .bookmark-alert-actions {
      gap: 0.45rem;
      flex-shrink: 0;
      align-items: center;
    }
    .bookmark-alert-btn {
      padding: 0.3rem 0.55rem;
      font-size: 0.72rem;
      border-radius: 6px;
      min-height: 32px;
    }
  }
  @media (max-width: 480px) {
    .theater-section { margin-top: 0.5rem; }
  }
</style>
