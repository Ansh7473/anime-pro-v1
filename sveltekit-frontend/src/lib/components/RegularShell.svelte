<script lang="ts">
  import Navbar from "$lib/components/Navbar.svelte";
  import MobileBottomNav from "$lib/components/MobileBottomNav.svelte";
  import PullToRefresh from "$lib/components/PullToRefresh.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { themeState } from "$lib/stores/theme";
  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { Download, X } from "lucide-svelte";
  import { onMount } from "svelte";
  import { BACKEND_URL } from "$lib/api";
  import StatusBanner from "$lib/components/StatusBanner.svelte";

  let { children } = $props();

  // Update check logic
  let showUpdatePopup = $state(false);
  let latestVersion = $state("");

  function isNewerVersion(latest: string, current: string): boolean {
    const lParts = latest.replace(/^v/, "").split('.').map(Number);
    const cParts = current.replace(/^v/, "").split('.').map(Number);
    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
      const l = lParts[i] || 0;
      const c = cParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }

  onMount(async () => {
    const win = window as any;
    const isElectron = !!win.electronAPI?.isElectron;
    const isCapacitor = win.Capacitor?.isNativePlatform?.();

    if (isElectron || isCapacitor) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/releases/latest`);
        const releases = await res.json();
        const platform = isElectron ? "windows" : "android";
        const latest = releases.find((r: any) => r.platform === platform);

        if (latest) {
          let currentVersion = "1.0.0";
          if (isElectron && win.electronAPI?.getAppVersion) {
            currentVersion = await win.electronAPI.getAppVersion();
          } else if (isCapacitor && win.AndroidApp?.getAppVersion) {
            currentVersion = win.AndroidApp.getAppVersion();
          }

          if (isNewerVersion(latest.version, currentVersion)) {
            latestVersion = latest.version;
            showUpdatePopup = true;
          }
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    }
  });

  // Scroll control (right-side up/down arrows, 25% per click, auto-hide when idle)
  let scrolling = $state(false);
  let atTop = $state(true);
  let atBottom = $state(false);
  let scrollIdleTimer: ReturnType<typeof setTimeout> | undefined;

  function refreshScrollState() {
    const y = window.scrollY;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    atTop = y <= 4;
    atBottom = range <= 4 || y >= range - 4;
  }

  function showScrollControl() {
    scrolling = true;
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => (scrolling = false), 1500);
  }

  function onScroll() {
    refreshScrollState();
    showScrollControl();
  }

  function scrollByQuarter(dir: 1 | -1) {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    if (range <= 0) return;
    window.scrollTo({ top: window.scrollY + dir * range * 0.25, behavior: "smooth" });
    showScrollControl();
  }

  onMount(() => {
    refreshScrollState();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  let isWatchPage = $derived(page.url.pathname.startsWith('/watch/'));
</script>

<div class="regular-shell"
     class:theme-{$themeState.current}={true}
     data-gradients={$themeState.gradients}
     data-effect={$themeState.effect}>
  {#if !isWatchPage}
    <div class="tactical-grid"></div>
    <Navbar />
    <StatusBanner />

    <div class="scroll-fab" class:visible={scrolling}>
      <button
        class="sf-btn"
        onclick={() => scrollByQuarter(-1)}
        disabled={atTop}
        aria-label="Scroll up"
      >↑</button>
      <button
        class="sf-btn"
        onclick={() => scrollByQuarter(1)}
        disabled={atBottom}
        aria-label="Scroll down"
      >↓</button>
    </div>

    <PullToRefresh>
      <main class="main-content" id="page-main">
        {#key page.url.pathname}
          <div class="page-fade">
            {@render children()}
          </div>
        {/key}
      </main>
      <Footer />
    </PullToRefresh>

    <MobileBottomNav />

    {#if showUpdatePopup}
      <div class="update-popup glass" transition:fly={{ y: 50, duration: 400 }}>
        <div class="update-accent"></div>
        <div class="update-header">
          <div class="update-title">
            <Download size={18} /> Update Available
          </div>
          <button
            onclick={() => showUpdatePopup = false}
            class="update-close"
            aria-label="Dismiss update"
          >
            <X size={18} />
          </button>
        </div>
        <p class="update-body">
          Version <span class="update-version">v{latestVersion}</span> is now ready.
        </p>
        <a href="/download" class="update-cta">
          Get Update
        </a>
      </div>
    {/if}
  {:else}
    <main class="watch-shell" id="page-main">
      {@render children()}
    </main>
  {/if}
</div>

<style>
  .regular-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
  }

  .main-content {
    /* Navbar height + notch safe area */
    padding-top: calc(64px + env(safe-area-inset-top, 0px));
    min-height: 100vh;
    min-height: 100dvh;
    flex: 1;
  }

  /* Lightweight page-enter fade. Replaces the old JS fly transition that gated
     every navigation behind a 200ms delay + 400ms animation (~600ms of the new
     page being invisible). This is a GPU-only opacity fade, 150ms, no delay, so
     content is visible immediately and navigation feels instant. */
  .page-fade {
    animation: page-fade-in 0.15s ease-out;
  }
  @keyframes page-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .page-fade { animation: none; }
  }

  .watch-shell {
    min-height: 100vh;
    min-height: 100dvh;
  }

  .scroll-fab {
    display: none;
  }

  /* Match Navbar mobile breakpoint (1024) so tablets with hamburger also get bottom nav space */
  @media (max-width: 1024px) {
    .main-content {
      padding-top: calc(56px + env(safe-area-inset-top, 0px));
      padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 12px);
    }

    .scroll-fab {
      display: flex;
      flex-direction: row;
      gap: 0.6rem;
      position: fixed;
      left: 50%;
      bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 0.85rem);
      z-index: 999;
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }
    .scroll-fab.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }
    .sf-btn {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
      background: rgba(18, 18, 20, 0.92);
      border: 1px solid rgba(245, 245, 245, 0.14);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      cursor: pointer;
      transition: background 0.2s, opacity 0.2s;
    }
    .sf-btn:hover {
      background: rgba(36, 36, 40, 0.95);
    }
    .sf-btn:disabled {
      opacity: 0.35;
      pointer-events: none;
    }
  }

  .update-popup {
    position: fixed;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    right: max(20px, env(safe-area-inset-right, 0px));
    width: 300px;
    padding: 1.25rem 1.35rem 1.35rem;
    z-index: 10000;
    border-radius: 16px;
    overflow: hidden;
    background: rgba(14, 14, 18, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  }

  .update-accent {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--net-red, #e50914);
  }

  .update-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    gap: 0.5rem;
  }

  .update-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--net-red, #e50914);
    font-weight: 700;
    font-size: 0.95rem;
  }

  .update-close {
    color: rgba(255, 255, 255, 0.45);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.15rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .update-close:hover {
    color: #fff;
  }

  .update-body {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .update-version {
    color: #fff;
    font-weight: 700;
  }

  .update-cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.7rem 1rem;
    background: var(--net-red, #e50914);
    color: #fff;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.875rem;
    text-decoration: none;
    box-shadow: 0 8px 20px rgba(229, 9, 20, 0.25);
    transition: background 0.2s, transform 0.2s;
  }
  .update-cta:hover {
    background: var(--net-red-hover, #f40612);
    transform: translateY(-1px);
  }

  @media (max-width: 1024px) {
    .update-popup {
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    }
  }

  @media (max-width: 480px) {
    .update-popup {
      left: max(10px, env(safe-area-inset-left, 0px));
      right: max(10px, env(safe-area-inset-right, 0px));
      width: auto;
    }
  }
</style>
