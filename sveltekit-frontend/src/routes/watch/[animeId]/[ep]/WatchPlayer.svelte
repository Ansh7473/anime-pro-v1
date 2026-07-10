<script lang="ts">
  import { AlertCircle, RotateCw, Keyboard, X, Play } from "lucide-svelte";
  import VideoPlayer from "$lib/components/VideoPlayer.svelte";
  import { getProxiedImage } from "$lib/api";

  let {
    sourceLoading = false,
    sources = [],
    error = '',
    selectedSource = null,
    isEmbedPlayer = false,
    activeUrl = '',
    autoplay = true,
    videoElement = $bindable(null),
    anime = null,
    theaterMode = $bindable(false),
    isRotated = false,
    showResumePrompt = false,
    resumeTime = 0,
    showCountdown = false,
    countdownSeconds = 5,
    onLoadSources = () => {},
    onToggleRotation = () => {},
    onToggleShortcuts = () => {},
    onResumePlayback = () => {},
    onDismissResume = () => {},
    onCancelCountdown = () => {},
    onSaveProgress = () => {},
    onSaveProgressForce = () => {},
  }: {
    sourceLoading?: boolean;
    sources?: any[];
    error?: string;
    selectedSource?: any;
    isEmbedPlayer?: boolean;
    activeUrl?: string;
    autoplay?: boolean;
    videoElement?: HTMLVideoElement | null;
    anime?: any;
    theaterMode?: boolean;
    isRotated?: boolean;
    showResumePrompt?: boolean;
    resumeTime?: number;
    showCountdown?: boolean;
    countdownSeconds?: number;
    onLoadSources?: () => void;
    onToggleRotation?: () => void;
    onToggleShortcuts?: () => void;
    onResumePlayback?: () => void;
    onDismissResume?: () => void;
    onCancelCountdown?: () => void;
    onSaveProgress?: () => void;
    onSaveProgressForce?: () => void;
  } = $props();

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
</script>

<div class="player-wrapper" class:theater={theaterMode}>
  {#if theaterMode}
    <button class="theater-exit" onclick={() => (theaterMode = false)} aria-label="Exit theater mode">
      <X size={15} aria-hidden="true" /> Lights On
    </button>
  {/if}
  <div class="video-container" class:theater={theaterMode} class:is-rotated={isRotated}>
    {#if sourceLoading && sources.length === 0}
      <div class="overlay-state">
        <div class="spinner-premium"></div>
        <p>Scanning best available servers...</p>
      </div>
    {:else if error && sources.length === 0}
      <div class="overlay-state error">
        <AlertCircle size={48} aria-hidden="true" />
        <p>{error}</p>
        <button class="btn-retry" onclick={onLoadSources}>Try Again</button>
      </div>
    {:else if selectedSource}
      {#if isEmbedPlayer}
        <div class="iframe-box">
          <iframe
            src={selectedSource.url}
            title="Video Player"
            class="video-frame"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
            referrerpolicy="no-referrer"
          ></iframe>
          <div class="iframe-nav-tip">
            <p><AlertCircle size={14} aria-hidden="true" /> Change server below if player is slow ↓</p>
          </div>
        </div>
      {:else}
        <VideoPlayer
          src={activeUrl}
          type={activeUrl?.includes('.m3u8') ? 'hls' : 'mp4'}
          poster=""
          {autoplay}
          bind:videoElement
          onprogress={onSaveProgress}
          onended={onSaveProgressForce}
        />
      {/if}

      {#if !isEmbedPlayer}
        {#if showResumePrompt}
          <div class="resume-popup glass">
            <div class="resume-icon"><RotateCw size={24} aria-hidden="true" /></div>
            <div class="resume-text"><p>Resume from <strong>{formatTime(resumeTime)}</strong>?</p></div>
            <div class="resume-btns">
              <button class="res-btn-p" onclick={onResumePlayback}>Resume</button>
              <button class="res-btn-s" onclick={onDismissResume}>Reset</button>
            </div>
          </div>
        {/if}
        {#if showCountdown}
          <div class="next-countdown glass">
            <div class="countdown-circle">
              <svg viewBox="0 0 60 60" aria-hidden="true">
                <circle cx="30" cy="30" r="28" class="bg" />
                <circle cx="30" cy="30" r="28" class="progress" style="--progress: {((5 - countdownSeconds) / 5) * 100}" />
              </svg>
              <span class="val">{countdownSeconds}</span>
            </div>
            <div class="next-info">
              <span class="label">Up Next</span>
              <span class="ep-label">Episode next</span>
            </div>
            <button class="cancel-next" onclick={onCancelCountdown}>Cancel</button>
          </div>
        {/if}
        <div class="controls-overlay" class:visible={!theaterMode}></div>
      {/if}

      <div class="top-controls-hub">
        <div class="controls-group">
          <button class="ctrl-btn" class:active={isRotated} title="Rotate" aria-label="Rotate" onclick={onToggleRotation}>
            <RotateCw size={16} aria-hidden="true" />
          </button>
          <button class="ctrl-btn" title="Shortcuts" aria-label="Keyboard shortcuts" onclick={onToggleShortcuts}>
            <Keyboard size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .player-wrapper {
    position: relative;
    width: 100%;
    flex: 1;
    min-width: 0;
  }
  .player-wrapper::before {
    content: "";
    position: absolute;
    inset: -6% -3% -10%;
    z-index: 0;
    border-radius: 48px;
    background: radial-gradient(60% 65% at 50% 45%, rgba(var(--poster-tint, 229, 9, 20), 0.24), transparent 72%),
                radial-gradient(80% 90% at 50% 60%, rgba(var(--poster-tint, 229, 9, 20), 0.10), transparent 78%);
    filter: blur(72px) saturate(1.2);
    opacity: 0.35;
    pointer-events: none;
    transition: opacity 0.6s ease;
  }
  .player-wrapper:hover::before { opacity: 0.5; }
  .player-wrapper.theater { position: relative; z-index: 40; }

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
    transition: background 0.2s;
  }
  .theater-exit:hover { background: rgba(255, 255, 255, 0.22); }

  .video-container {
    position: relative;
    z-index: 1;
    width: 100%;
    aspect-ratio: 16/9;
    max-height: 72dvh;
    background: #000;
    border-radius: 10px 10px 0 0;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(245, 245, 245, 0.10);
  }
  .video-container.theater {
    box-shadow: 0 0 0 1px rgba(245, 245, 245, 0.10), 0 0 40px rgba(0, 0, 0, 0.6);
  }
  .video-container.is-rotated {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    width: 100dvw;
    height: 100dvh;
    z-index: 5000;
    border-radius: 0;
  }
  @media (orientation: portrait) {
    .video-container.is-rotated {
      width: 100vh; height: 100vw;
      width: 100dvh; height: 100dvw;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(90deg);
    }
  }

  .video-frame, .iframe-box { width: 100%; height: 100%; border: none; display: block; }
  .iframe-box { position: relative; overflow: hidden; background: #000; }
  .iframe-nav-tip {
    position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
    padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(245,245,245,0.10);
    pointer-events: none; opacity: 0; transition: 0.3s; z-index: 10;
  }
  .iframe-box:hover .iframe-nav-tip { opacity: 1; }
  .iframe-nav-tip p {
    margin: 0; font-size: 0.75rem; color: #a8a8a8;
    display: flex; align-items: center; gap: 6px;
  }

  .overlay-state {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.9); gap: 1.5rem; z-index: 10;
  }
  .overlay-state p { font-size: 0.85rem; color: #a8a8a8; text-align: center; max-width: 320px; }
  .btn-retry {
    padding: 0.5rem 1.2rem; background: var(--accent, #e50914); color: #fff;
    border: none; border-radius: 8px; font-weight: 700; font-size: 0.82rem;
    cursor: pointer; font-family: inherit;
  }

  .spinner-premium {
    width: 50px; height: 50px;
    border: 3px solid rgba(229, 9, 20, 0.12);
    border-top: 3px solid var(--accent, #e50914);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .controls-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 4rem 2rem 1.5rem;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    display: flex; justify-content: flex-end;
    opacity: 0; transform: translateY(20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none; z-index: 100;
  }
  .video-container:hover .controls-overlay,
  .video-container:focus-within .controls-overlay { opacity: 1; transform: translateY(0); pointer-events: auto; }

  .top-controls-hub {
    position: absolute; top: 12px; right: 12px; z-index: 50;
    opacity: 0; transition: opacity 0.3s;
  }
  .video-container:hover .top-controls-hub,
  .video-container:focus-within .top-controls-hub { opacity: 1; }
  .controls-group {
    display: flex; gap: 0.5rem;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(10px);
    padding: 0.35rem; border-radius: 10px; border: 1px solid rgba(245,245,245,0.10);
  }
  .ctrl-btn {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; background: transparent;
    border: 1px solid transparent; border-radius: 8px;
    color: rgba(255,255,255,0.7); cursor: pointer; transition: all 0.2s;
  }
  .ctrl-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .ctrl-btn.active { color: var(--accent, #e50914); }
  @media (pointer: coarse) {
    .ctrl-btn { width: 44px; height: 44px; min-width: 44px; min-height: 44px; }
    .top-controls-hub,
    .controls-overlay {
      opacity: 1;
      transform: none;
      pointer-events: auto;
    }
  }

  /* Resume & Countdown */
  .resume-popup, .next-countdown {
    position: absolute; z-index: 200;
    background: rgba(14,14,14,0.92); backdrop-filter: blur(16px);
    border: 1px solid rgba(245,245,245,0.12); border-radius: 12px;
    padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.85rem;
    animation: fadeInUp 0.3s ease;
  }
  .resume-popup { bottom: 80px; left: 50%; transform: translateX(-50%); }
  .next-countdown { bottom: 80px; right: 20px; }
  .resume-icon { color: var(--accent, #e50914); }
  .resume-text p { margin: 0; font-size: 0.85rem; color: #e8e8e8; }
  .resume-btns { display: flex; gap: 0.4rem; }
  .res-btn-p {
    padding: 0.35rem 0.85rem; background: var(--accent, #e50914); color: #fff;
    border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem;
    cursor: pointer; font-family: inherit;
  }
  .res-btn-s {
    padding: 0.35rem 0.85rem; background: rgba(255,255,255,0.08); color: #a8a8a8;
    border: 1px solid rgba(245,245,245,0.10); border-radius: 6px;
    font-weight: 600; font-size: 0.78rem; cursor: pointer; font-family: inherit;
  }

  .countdown-circle { position: relative; width: 48px; height: 48px; }
  .countdown-circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .countdown-circle .bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 3; }
  .countdown-circle .progress {
    fill: none; stroke: var(--accent, #e50914); stroke-width: 3;
    stroke-linecap: round; stroke-dasharray: 175.9;
    stroke-dashoffset: calc(175.9 - (175.9 * var(--progress, 0) / 100));
    transition: stroke-dashoffset 0.3s ease;
  }
  .countdown-circle .val {
    position: absolute; inset: 0; display: flex; align-items: center;
    justify-content: center; font-size: 1.1rem; font-weight: 800; color: #fff;
  }
  .next-info { display: flex; flex-direction: column; gap: 0.15rem; }
  .next-info .label { font-size: 0.7rem; color: #696969; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .next-info .ep-label { font-size: 0.85rem; color: #e8e8e8; font-weight: 700; }
  .cancel-next {
    padding: 0.35rem 0.75rem; background: rgba(255,255,255,0.08);
    border: 1px solid rgba(245,245,245,0.10); border-radius: 6px;
    color: #a8a8a8; font-size: 0.78rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  @media (max-width: 768px) {
    .video-container { border-radius: 0; }
    .top-controls-hub {
      opacity: 1;
      top: max(8px, env(safe-area-inset-top, 0px));
      right: max(8px, env(safe-area-inset-right, 0px));
    }
    .controls-overlay {
      opacity: 1;
      transform: none;
      pointer-events: auto;
      padding: 3rem 0.75rem 1rem;
    }
    .controls-group {
      padding: 0.25rem;
      gap: 0.3rem;
      border-radius: 8px;
    }
    .ctrl-btn {
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
    }
    .resume-popup {
      left: 50%;
      right: auto;
      width: calc(100% - 1.5rem);
      max-width: 360px;
      bottom: max(64px, env(safe-area-inset-bottom, 0px) + 48px);
      flex-wrap: wrap;
      justify-content: center;
    }
    .next-countdown {
      right: 0.75rem;
      left: 0.75rem;
      bottom: max(64px, env(safe-area-inset-bottom, 0px) + 48px);
      flex-wrap: wrap;
    }
  }
</style>
