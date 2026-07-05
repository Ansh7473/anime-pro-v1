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
      <main class="main-content">
        {#key page.url.pathname}
          <div in:fly={{ y: 8, duration: 400, delay: 200 }} out:fly={{ y: -8, duration: 200 }}>
            {@render children()}
          </div>
        {/key}
      </main>
      <Footer />
    </PullToRefresh>

    <MobileBottomNav />

    {#if showUpdatePopup}
      <div class="update-popup glass" transition:fly={{ y: 50, duration: 400 }}>
        <div class="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-2 text-red-500 font-bold">
            <Download size={18} /> Update Available
          </div>
          <button onclick={() => showUpdatePopup = false} class="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <p class="text-sm text-gray-400 mb-4 font-medium">
          Version <span class="text-white">v{latestVersion}</span> is now ready.
        </p>
        <a href="/download" class="w-full py-2.5 bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-lg shadow-red-900/20">
          Get Update
        </a>
      </div>
    {/if}
  {:else}
    <main class="watch-shell">
      {@render children()}
    </main>
  {/if}
</div>

<style>
  .regular-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .main-content {
    padding-top: 64px;
    min-height: 100vh;
    flex: 1;
  }

  .watch-shell {
    min-height: 100vh;
  }

  .scroll-fab {
    display: none;
  }

  @media (max-width: 768px) {
    .main-content {
      padding-top: 56px;
      padding-bottom: 70px;
    }

    .scroll-fab {
      display: flex;
      flex-direction: row;
      gap: 0.6rem;
      position: fixed;
      left: 50%;
      bottom: calc(70px + env(safe-area-inset-bottom, 0px) + 0.85rem);
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
    bottom: 80px;
    right: 20px;
    width: 300px;
    padding: 1.5rem;
    z-index: 10000;
    border-radius: 16px;
  }

  @media (max-width: 480px) {
    .update-popup {
      left: 10px;
      right: 10px;
      width: auto;
      bottom: 70px;
    }
  }
</style>
