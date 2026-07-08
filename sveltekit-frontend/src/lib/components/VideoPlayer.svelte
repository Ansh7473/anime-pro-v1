<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import Hls from "hls.js";
  import { BACKEND_URL } from "$lib/api";
  import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    Settings,
    SkipForward,
    RotateCcw,
    RotateCw,
    Subtitles,
    Loader2,
  } from "lucide-svelte";

  // ── Props ──────────────────────────────────────────────
  interface VideoSubtitle {
    url: string;
    lang?: string;
    label?: string;
  }
  interface SkipRange {
    intro?: [number, number];
    outro?: [number, number];
  }

  let {
    src,
    type = "",
    poster = "",
    autoplay = true,
    subtitles = [] as VideoSubtitle[],
    skipTimes = undefined as SkipRange | undefined,
    onprogress = undefined as ((pos: number, dur: number) => void) | undefined,
    onended = undefined as (() => void) | undefined,
    videoElement = $bindable(null) as HTMLVideoElement | null,
  }: {
    src: string;
    type?: string;
    poster?: string;
    autoplay?: boolean;
    subtitles?: VideoSubtitle[];
    skipTimes?: SkipRange;
    onprogress?: (pos: number, dur: number) => void;
    onended?: () => void;
    videoElement?: HTMLVideoElement | null;
  } = $props();

  // ── Refs ───────────────────────────────────────────────
  let containerEl: HTMLDivElement | null = $state(null);
  let videoEl: HTMLVideoElement | null = $state(null);
  let hlsInstance: Hls | null = null;

  // Sync internal ref → bindable prop so parent can access <video>
  $effect(() => { videoElement = videoEl; });
  let endedFired = false;

  // ── Player state ───────────────────────────────────────
  let playing = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(1);
  let muted = $state(false);
  let isFullscreen = $state(false);
  let speed = $state(1);
  let loading = $state(true);
  let showControls = $state(true);
  let showSettings = $state(false);
  let currentTrack = $state(-1); // -1 = off
  let skipHint: "intro" | "outro" | null = $state(null);

  // Subtitle style prefs (stored in component; ponytail: lift to a store when multi-page)
  let subFontSize = $state(100);
  let subColor = $state("#ffffff");
  let subBgOpacity = $state(0.5);

  // Double-click ripple
  let ripple: { type: "forward" | "backward"; x: number; y: number } | null = $state(null);
  let rippleTimer: ReturnType<typeof setTimeout> | null = null;

  // Controls auto-hide
  let controlsTimer: ReturnType<typeof setTimeout> | null = null;

  function resetControlsTimer() {
    showControls = true;
    if (controlsTimer) clearTimeout(controlsTimer);
    controlsTimer = setTimeout(() => {
      if (playing) {
        showControls = false;
        showSettings = false;
      }
    }, 3000);
  }

  // ── Lang normalization ─────────────────────────────────
  const LANG_MAP: Record<string, string> = {
    english: "en", japanese: "ja", spanish: "es", french: "fr", german: "de",
    portuguese: "pt", italian: "it", russian: "ru", korean: "ko", chinese: "zh",
    arabic: "ar", hindi: "hi", thai: "th", vietnamese: "vi", indonesian: "id",
  };
  function normLang(lang?: string): string {
    if (!lang) return "en";
    const l = lang.toLowerCase().trim();
    return LANG_MAP[l] || (l.length <= 3 ? l : "en");
  }

  // ── Subtitle blob proxying (CORS bypass) ───────────────
  let blobSubs: VideoSubtitle[] = $state([]);
  let blobUrls: string[] = [];

  $effect(() => {
    // Clean up old blobs
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
    blobUrls = [];

    if (!subtitles?.length) {
      blobSubs = [];
      return;
    }

    Promise.all(
      subtitles.map(async (s) => {
        try {
          const res = await fetch(s.url);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          blobUrls.push(blobUrl);
          return { ...s, url: blobUrl };
        } catch {
          return s;
        }
      }),
    ).then((result) => {
      blobSubs = result;
    });
  });

  // ── HLS / source mounting ──────────────────────────────
  $effect(() => {
    const video = videoEl;
    if (!video || !src) return;

    endedFired = false;
    loading = true;
    hlsInstance?.destroy();
    hlsInstance = null;

    const isHls = type === "hls" || src.includes(".m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true,
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        xhrSetup: (xhr: XMLHttpRequest, segUrl: string) => {
          const restrictedOrigins = [
            "anvod.pro", "uwucdn.top", "anivid.icu",
            "pahe.win", "bysewihe.com", "short.icu",
          ];
          const isRestricted = restrictedOrigins.some((o) => segUrl.includes(o));
          if (isRestricted && !segUrl.includes("/streaming/proxy")) {
            const proxyBase = `${BACKEND_URL}/api/v1/streaming/proxy`;
            const referer = segUrl.includes("desidub")
              ? "https://www.desidubanime.me/"
              : segUrl.includes("animehindidubbed")
                ? "https://animehindidubbed.in/"
                : "https://animelok.xyz/";
            xhr.open("GET", `${proxyBase}?url=${encodeURIComponent(segUrl)}&referer=${encodeURIComponent(referer)}`, true);
          }
        },
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoplay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else hls.destroy();
      });
      hlsInstance = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      hlsInstance?.destroy();
      hlsInstance = null;
    };
  });

  // ── Video event wiring ─────────────────────────────────
  onMount(() => {
    const video = videoEl;
    if (!video) return;

    const onLoadedMeta = () => {
      duration = video.duration;
      // Activate first subtitle track
      if (video.textTracks.length > 0 && currentTrack === -1) {
        currentTrack = 0;
        video.textTracks[0].mode = "showing";
      }
    };
    const onCanPlay = () => {
      loading = false;
      if (autoplay) video.play().catch(() => {});
    };
    const onPlay = () => { playing = true; endedFired = false; };
    const onPause = () => { playing = false; };
    const onWaiting = () => { loading = true; };
    const onPlaying = () => { loading = false; };
    const onEnded = () => {
      if (!endedFired) { endedFired = true; onended?.(); }
    };

    let lastReport = 0;
    const onTimeUpdate = () => {
      if (!isFinite(video.duration)) return;
      const t = video.currentTime;
      currentTime = t;

      // Progress callback (throttled ~8s)
      if (onprogress && t - lastReport > 8) {
        lastReport = t;
        onprogress(t, video.duration);
      }

      // Skip logic
      const intro = skipTimes?.intro;
      const outro = skipTimes?.outro;
      if (intro && t >= intro[0] && t < intro[1]) skipHint = "intro";
      else if (outro && t >= outro[0] && t < outro[1]) skipHint = "outro";
      else skipHint = null;

      // Near-end fallback trigger
      if (video.duration > 0 && video.duration - t < 0.3 && !video.seeking) {
        if (!endedFired) { endedFired = true; onended?.(); }
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);
    video.addEventListener("timeupdate", onTimeUpdate);

    // Fullscreen sync
    const onFsChange = () => { isFullscreen = !!document.fullscreenElement; };
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMeta);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  });

  onDestroy(() => {
    hlsInstance?.destroy();
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
    if (controlsTimer) clearTimeout(controlsTimer);
    if (rippleTimer) clearTimeout(rippleTimer);
  });

  // ── Controls ───────────────────────────────────────────
  function togglePlay() {
    if (!videoEl) return;
    if (playing) videoEl.pause();
    else videoEl.play().catch(() => {});
    resetControlsTimer();
  }

  function seekDelta(secs: number) {
    if (!videoEl) return;
    videoEl.currentTime = Math.max(0, Math.min(videoEl.duration || 0, videoEl.currentTime + secs));
    resetControlsTimer();
  }

  function adjustVolume(delta: number) {
    if (!videoEl) return;
    const v = Math.max(0, Math.min(1, videoEl.volume + delta));
    videoEl.volume = v;
    volume = v;
    muted = v === 0;
    resetControlsTimer();
  }

  function handleVolumeInput(e: Event) {
    if (!videoEl) return;
    const val = parseFloat((e.target as HTMLInputElement).value);
    videoEl.volume = val;
    volume = val;
    muted = val === 0;
    resetControlsTimer();
  }

  function toggleMute() {
    if (!videoEl) return;
    const m = !muted;
    videoEl.muted = m;
    muted = m;
    resetControlsTimer();
  }

  function handleSeek(e: Event) {
    if (!videoEl) return;
    const pct = parseFloat((e.target as HTMLInputElement).value);
    const t = (pct / 100) * (videoEl.duration || 0);
    videoEl.currentTime = t;
    currentTime = t;
    resetControlsTimer();
  }

  function selectSub(idx: number) {
    if (!videoEl) return;
    for (let i = 0; i < videoEl.textTracks.length; i++) {
      videoEl.textTracks[i].mode = i === idx ? "showing" : "disabled";
    }
    currentTrack = idx;
    resetControlsTimer();
  }

  function changeSpeed(rate: number) {
    if (!videoEl) return;
    videoEl.playbackRate = rate;
    speed = rate;
    resetControlsTimer();
  }

  function toggleFullscreen() {
    if (!containerEl) return;
    if (!document.fullscreenElement) {
      containerEl.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function doSkip() {
    if (!videoEl || !skipHint) return;
    const range = skipHint === "intro" ? skipTimes?.intro : skipTimes?.outro;
    if (!range) return;
    videoEl.currentTime = range[1] + 0.1;
    skipHint = null;
  }

  // Click = play/pause, double click = seek ±10s
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleVideoClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("button, input, .settings-panel")) return;
    if (clickTimeout) { clearTimeout(clickTimeout); clickTimeout = null; return; } // double-click caught
    clickTimeout = setTimeout(() => { clickTimeout = null; togglePlay(); }, 250);
  }

  function handleVideoDblClick(e: MouseEvent) {
    if (clickTimeout) { clearTimeout(clickTimeout); clickTimeout = null; }
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRight = x > rect.width / 2;
    seekDelta(isRight ? 10 : -10);
    ripple = { type: isRight ? "forward" : "backward", x, y: e.clientY - rect.top };
    if (rippleTimer) clearTimeout(rippleTimer);
    rippleTimer = setTimeout(() => { ripple = null; }, 600);
  }

  // Keyboard
  function handleKeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;
    switch (e.key) {
      case " ": e.preventDefault(); togglePlay(); break;
      case "ArrowRight": e.preventDefault(); seekDelta(10); break;
      case "ArrowLeft": e.preventDefault(); seekDelta(-10); break;
      case "ArrowUp": e.preventDefault(); adjustVolume(0.1); break;
      case "ArrowDown": e.preventDefault(); adjustVolume(-0.1); break;
      case "m": case "M": e.preventDefault(); toggleMute(); break;
      case "f": case "F": e.preventDefault(); toggleFullscreen(); break;
    }
  }

  function fmt(s: number): string {
    if (!isFinite(s)) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  const seekPct = $derived(duration ? (currentTime / duration) * 100 : 0);
  const tracks = $derived.by(() => {
    if (!videoEl) return [];
    const t: { label: string; idx: number }[] = [];
    for (let i = 0; i < (videoEl.textTracks?.length || 0); i++) {
      t.push({ label: videoEl.textTracks[i].label || `Track ${i + 1}`, idx: i });
    }
    return t;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- ponytail: subtitle ::cue styling; upgrade to a global CSS custom-property store when needed -->
<svelte:head>
  <style>
    video.vp-video::cue {
      background-color: rgba(0, 0, 0, var(--vp-sub-bg, 0.5)) !important;
      font-size: calc(var(--vp-sub-size, 100) * 1%) !important;
      text-shadow: 0 1px 2px rgba(0,0,0,.9), 0 2px 4px rgba(0,0,0,.9) !important;
    }
  </style>
</svelte:head>

<div
  bind:this={containerEl}
  class="vp-container"
  role="region"
  aria-label="Video player"
  onmousemove={resetControlsTimer}
  onpointerdown={resetControlsTimer}
  onmouseleave={() => playing && (showControls = false)}
  style="--vp-sub-color:{subColor};--vp-sub-bg:{subBgOpacity};--vp-sub-size:{subFontSize}"
>
  <!-- Video element -->
  <video
    bind:this={videoEl}
    playsinline
    preload="metadata"
    poster={poster || undefined}
    crossorigin="anonymous"
    class="vp-video"
    onclick={handleVideoClick}
    ondblclick={handleVideoDblClick}
  >
    {#each blobSubs as sub, i (sub.url)}
      <track
        kind="subtitles"
        src={sub.url}
        srclang={normLang(sub.lang)}
        label={sub.label || sub.lang || `Track ${i + 1}`}
      />
    {/each}
  </video>

  <!-- Double-click seek ripple -->
  {#if ripple}
    <div class="vp-ripple" style="left:{ripple.x}px;top:{ripple.y}px">
      {#if ripple.type === "forward"}
        <RotateCw size={24} aria-hidden="true" />
        <span>+10s</span>
      {:else}
        <RotateCcw size={24} aria-hidden="true" />
        <span>-10s</span>
      {/if}
    </div>
  {/if}

  <!-- Center play button (paused & not loading) -->
  {#if !playing && !loading}
    <button class="vp-center-play" onclick={togglePlay} aria-label="Play video">
      <Play size={28} aria-hidden="true" />
    </button>
  {/if}

  <!-- Loading spinner -->
  {#if loading}
    <div class="vp-loader">
      <Loader2 size={48} class="vp-spin" aria-hidden="true" />
    </div>
  {/if}

  <!-- Skip intro/outro -->
  {#if skipHint}
    <button class="vp-skip-btn" onclick={doSkip} aria-label="Skip {skipHint}">
      <SkipForward size={14} aria-hidden="true" /> Skip {skipHint}
    </button>
  {/if}

  <!-- Controls overlay -->
  <div class="vp-controls-overlay" class:visible={showControls}>
    <!-- Seek bar -->
    <div class="vp-seek-row">
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={seekPct}
        oninput={handleSeek}
        class="vp-seek"
        style="--pct:{seekPct}%"
        aria-label="Seek"
      />
    </div>

    <!-- Time -->
    <div class="vp-time-row">
      <span class="vp-time-current">{fmt(currentTime)}</span>
      <span class="vp-time-sep">/</span>
      <span class="vp-time-dur">{fmt(duration)}</span>
      {#if skipHint}
        <span class="vp-skip-label">{skipHint === "intro" ? "Intro" : "Outro"} Section</span>
      {/if}
    </div>

    <!-- Bottom bar -->
    <div class="vp-bottom-bar">
      <!-- Left controls -->
      <div class="vp-bar-left">
        <button class="vp-btn" onclick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
          {#if playing}<Pause size={20} aria-hidden="true" />{:else}<Play size={20} aria-hidden="true" />{/if}
        </button>
        <button class="vp-btn" onclick={() => seekDelta(-10)} aria-label="Back 10s">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <button class="vp-btn" onclick={() => seekDelta(10)} aria-label="Forward 10s">
          <RotateCw size={18} aria-hidden="true" />
        </button>
        <div class="vp-vol-group">
          <button class="vp-btn" onclick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {#if muted}<VolumeX size={18} aria-hidden="true" />{:else}<Volume2 size={18} aria-hidden="true" />{/if}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            oninput={handleVolumeInput}
            class="vp-vol-slider"
            aria-label="Volume"
          />
        </div>
      </div>

      <!-- Right controls -->
      <div class="vp-bar-right">
        {#if tracks.length > 0}
          <button
            class="vp-btn"
            class:active={currentTrack !== -1}
            onclick={() => selectSub(currentTrack === -1 ? 0 : -1)}
            aria-label="Toggle subtitles"
          >
            <Subtitles size={18} aria-hidden="true" />
          </button>
        {/if}

        <div class="vp-settings-wrap">
          <button
            class="vp-btn"
            class:active={showSettings}
            onclick={() => { showSettings = !showSettings; resetControlsTimer(); }}
            aria-label="Settings"
          >
            <Settings size={18} aria-hidden="true" />
          </button>

          {#if showSettings}
            <div class="settings-panel">
              <!-- Speed -->
              <div class="sp-section">
                <span class="sp-label">Speed</span>
                <div class="sp-speed-grid">
                  {#each [0.5, 1, 1.25, 1.5, 2] as rate}
                    <button
                      class="sp-speed-btn"
                      class:active={speed === rate}
                      onclick={() => changeSpeed(rate)}
                    >{rate}x</button>
                  {/each}
                </div>
              </div>

              <!-- Subtitle tracks -->
              {#if tracks.length > 0}
                <div class="sp-section">
                  <span class="sp-label">Subtitles</span>
                  <div class="sp-sub-list">
                    <button
                      class="sp-sub-btn"
                      class:active={currentTrack === -1}
                      onclick={() => selectSub(-1)}
                    >Off</button>
                    {#each tracks as tr}
                      <button
                        class="sp-sub-btn"
                        class:active={currentTrack === tr.idx}
                        onclick={() => selectSub(tr.idx)}
                      >{tr.label}</button>
                    {/each}
                  </div>
                </div>

                <!-- Subtitle style (only when a track is active) -->
                {#if currentTrack !== -1}
                  <div class="sp-section sp-sub-style">
                    <span class="sp-label">Subtitle Style</span>
                    <div class="sp-row">
                      <span class="sp-tiny">Size {subFontSize}%</span>
                      <input type="range" min="75" max="175" step="5" bind:value={subFontSize} class="sp-range" />
                    </div>
                    <div class="sp-row">
                      <span class="sp-tiny">Color</span>
                      <div class="sp-colors">
                        {#each ["#ffffff", "#ffcc00", "#00ffcc", "#ff99ff", "#00ff66"] as c}
                          <button
                            class="sp-color-dot"
                            class:active={subColor === c}
                            style="background:{c}"
                            onclick={() => (subColor = c)}
                            aria-label="Subtitle color {c}"
                          ></button>
                        {/each}
                      </div>
                    </div>
                    <div class="sp-row">
                      <span class="sp-tiny">BG {Math.round(subBgOpacity * 100)}%</span>
                      <input type="range" min="0" max="1" step="0.1" bind:value={subBgOpacity} class="sp-range" />
                    </div>
                  </div>
                {/if}
              {/if}
            </div>
          {/if}
        </div>

        <button class="vp-btn" onclick={toggleFullscreen} aria-label="Fullscreen">
          {#if isFullscreen}<Minimize size={18} aria-hidden="true" />{:else}<Maximize size={18} aria-hidden="true" />{/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Container ────────────────────────────────── */
  .vp-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
    user-select: none;
    color: #fff;
  }
  .vp-video {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  /* ── Center play ──────────────────────────────── */
  .vp-center-play {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(229, 62, 62, 0.9);
    border: none;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 0 30px rgba(229, 62, 62, 0.5);
    transition: transform 0.15s;
    z-index: 20;
  }
  .vp-center-play:hover { transform: scale(1.1); }
  .vp-center-play:active { transform: scale(0.95); }
  .vp-center-play :global(svg) { fill: #fff; margin-left: 3px; }

  /* ── Loader ───────────────────────────────────── */
  .vp-loader {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    pointer-events: none;
    color: rgba(229, 62, 62, 0.9);
  }
  :global(.vp-spin) { animation: vp-spin 1s linear infinite; }
  @keyframes vp-spin { to { transform: rotate(360deg); } }

  /* ── Ripple ───────────────────────────────────── */
  .vp-ripple {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(229, 62, 62, 0.15);
    border: 1px solid rgba(229, 62, 62, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    animation: vp-ping 0.6s ease-out forwards;
    z-index: 25;
    color: #fff;
  }
  .vp-ripple span { font-size: 10px; font-weight: 900; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  @keyframes vp-ping {
    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
  }

  /* ── Skip button ──────────────────────────────── */
  .vp-skip-btn {
    position: absolute;
    bottom: 80px;
    right: 16px;
    z-index: 30;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 12px;
    border: 1px solid rgba(229, 62, 62, 0.35);
    background: rgba(0, 0, 0, 0.85);
    color: rgba(229, 62, 62, 1);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    backdrop-filter: blur(8px);
    box-shadow: 0 0 20px rgba(229, 62, 62, 0.25);
    transition: transform 0.15s;
  }
  .vp-skip-btn:hover { transform: scale(1.05); }
  .vp-skip-btn:active { transform: scale(0.95); }

  /* ── Controls overlay ─────────────────────────── */
  .vp-controls-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 35%, transparent 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 0 16px 12px;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.3s, transform 0.3s;
    pointer-events: none;
    z-index: 15;
  }
  .vp-controls-overlay.visible {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  /* ── Seek bar ─────────────────────────────────── */
  .vp-seek-row { padding: 0 0 4px; }
  .vp-seek {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 4px;
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    background: linear-gradient(to right, #e8e8ea var(--pct), rgba(255,255,255,0.2) var(--pct));
    transition: height 0.15s;
  }
  .vp-seek:hover { height: 6px; }
  .vp-seek::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 0 6px rgba(0,0,0,0.5);
    cursor: pointer;
  }
  .vp-seek::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 0 6px rgba(0,0,0,0.5);
    cursor: pointer;
  }

  /* ── Time row ─────────────────────────────────── */
  .vp-time-row {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding-bottom: 6px;
  }
  .vp-time-current { color: #fff; }
  .vp-time-sep { color: rgba(255,255,255,0.4); }
  .vp-time-dur { color: rgba(255,255,255,0.7); }
  .vp-skip-label {
    margin-left: auto;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(229, 62, 62, 0.8);
    font-weight: 900;
    animation: vp-pulse 1.5s infinite;
  }
  @keyframes vp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* ── Bottom bar ───────────────────────────────── */
  .vp-bottom-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .vp-bar-left, .vp-bar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* ── Buttons ──────────────────────────────────── */
  .vp-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.85);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, transform 0.15s;
    border-radius: 4px;
  }
  .vp-btn:hover { color: #fff; }
  .vp-btn:active { transform: scale(0.9); }
  .vp-btn.active { color: rgba(229, 62, 62, 1); }

  /* ── Volume group ─────────────────────────────── */
  .vp-vol-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .vp-vol-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 0;
    height: 3px;
    border-radius: 3px;
    background: rgba(255,255,255,0.2);
    outline: none;
    cursor: pointer;
    transition: width 0.3s;
    accent-color: #fff;
  }
  .vp-vol-group:hover .vp-vol-slider { width: 70px; }
  .vp-vol-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    border: none;
  }
  .vp-vol-slider::-moz-range-thumb {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #fff;
    border: none;
  }

  /* ── Settings panel ───────────────────────────── */
  .vp-settings-wrap { position: relative; }
  .settings-panel {
    position: absolute;
    bottom: 36px;
    right: 0;
    z-index: 40;
    background: rgba(9, 9, 14, 0.96);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 14px;
    width: 210px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: vp-fade-in 0.2s ease;
  }
  @keyframes vp-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .sp-section { display: flex; flex-direction: column; gap: 6px; }
  .sp-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.4); }

  .sp-speed-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 3px;
    background: rgba(255,255,255,0.04);
    padding: 3px;
    border-radius: 8px;
  }
  .sp-speed-btn {
    padding: 4px 0;
    border-radius: 5px;
    border: none;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    text-align: center;
    background: transparent;
    color: rgba(255,255,255,0.6);
    transition: all 0.15s;
  }
  .sp-speed-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .sp-speed-btn.active { background: rgba(229, 62, 62, 1); color: #0a0a0e; }

  .sp-sub-list { display: flex; flex-direction: column; gap: 2px; max-height: 100px; overflow-y: auto; }
  .sp-sub-btn {
    width: 100%;
    text-align: left;
    padding: 4px 8px;
    border-radius: 5px;
    border: none;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    background: transparent;
    color: rgba(255,255,255,0.7);
    transition: all 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sp-sub-btn:hover { background: rgba(255,255,255,0.05); }
  .sp-sub-btn.active { background: rgba(229, 62, 62, 0.12); color: rgba(229, 62, 62, 1); font-weight: 700; }

  .sp-sub-style { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; }
  .sp-row { display: flex; align-items: center; gap: 8px; }
  .sp-tiny { font-size: 10px; color: rgba(255,255,255,0.5); white-space: nowrap; min-width: 60px; }
  .sp-range {
    -webkit-appearance: none;
    appearance: none;
    flex: 1;
    height: 3px;
    border-radius: 3px;
    background: rgba(255,255,255,0.1);
    outline: none;
    cursor: pointer;
    accent-color: #fff;
  }
  .sp-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 10px; height: 10px; border-radius: 50%; background: #fff; border: none;
  }
  .sp-range::-moz-range-thumb {
    width: 10px; height: 10px; border-radius: 50%; background: #fff; border: none;
  }
  .sp-colors { display: flex; gap: 5px; }
  .sp-color-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
  }
  .sp-color-dot.active { border-color: rgba(229, 62, 62, 1); transform: scale(1.15); }

  /* ── Mobile responsive ────────────────────────── */
  @media (max-width: 640px) {
    .vp-controls-overlay { padding: 0 8px 8px; }
    .vp-bar-left, .vp-bar-right { gap: 6px; }
    .vp-center-play { width: 48px; height: 48px; }
    .vp-skip-btn { bottom: 60px; right: 8px; padding: 6px 12px; font-size: 10px; }
    .settings-panel { width: 180px; padding: 10px; right: -40px; }
  }

  /* ── Touch / coarse pointer ──────────────────── */
  @media (pointer: coarse) {
    .vp-vol-slider { width: 60px; }
    .vp-seek::-webkit-slider-thumb { width: 20px; height: 20px; }
    .vp-seek::-moz-range-thumb { width: 20px; height: 20px; }
  }
</style>
