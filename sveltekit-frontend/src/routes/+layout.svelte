<script lang="ts">
  import "../app.css";
  import PullToRefresh from "$lib/components/PullToRefresh.svelte";
  import Navbar from "$lib/components/Navbar.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import MobileBottomNav from "$lib/components/MobileBottomNav.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { Download, X } from "lucide-svelte";
  import { isTV } from "$lib/stores/device";

  let { children } = $props();

  // Check if we can go back (not on home page)
  let canGoBack = $derived(page.url.pathname !== "/");

  // Update check logic
  let showUpdatePopup = $state(false);
  let latestVersion = $state("");
  const CURRENT_VERSION = "1.0.0"; // Increment this for new builds
  const BACKEND_URL = 'https://anime-pro-v1-backend-go.vercel.app'; // 'http://localhost:3001';

  onMount(async () => {
    // Check for updates on Native Platforms
    const userAgent = window.navigator.userAgent;
    const isElectron = !!(window as any).electronAPI?.isElectron;
    // @ts-ignore
    const isCapacitor = window.Capacitor?.isNativePlatform?.();

    if (isElectron || isCapacitor) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/releases/latest`);
        const releases = await res.json();
        const platform = isElectron ? "windows" : "android";
        const latest = releases.find((r: any) => r.platform === platform);

        if (latest && latest.version !== CURRENT_VERSION) {
          latestVersion = latest.version;
          showUpdatePopup = true;
        }
      } catch (e) {
        console.error("Update check failed:", e);
      }
    }
  });

  // TV Mode Redirection Logic
  $effect(() => {
    const p = page.url.pathname as string;
    if ($isTV) {
      // Redirect web navigation routes to TV Hub, but allow /anime, /watch, and /explore
      if ((p !== '/tv' && !p.startsWith('/tv/')) && !p.startsWith('/anime') && !p.startsWith('/watch') && !p.startsWith('/explore')) {
        goto('/tv');
      }
    }
  });

  let isTvRoute = $derived($isTV || (page.url.pathname as string) === '/tv' || (page.url.pathname as string).startsWith('/tv/'));

  function handleBack() {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      goto("/");
    }
  }
</script>

<div class="app">
  {#if !isTvRoute}
    <!-- Tactical HUD Backgrounds -->
    <div class="tactical-grid"></div>
    <div class="tactical-vignette"></div>
    
    <Navbar />

    <!-- Floating back button for Android -->
    {#if canGoBack}
      <button class="back-fab" onclick={handleBack} aria-label="Go back" title="Go back">
        ←
      </button>
    {/if}

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

    {#if showUpdatePopup}
      <div class="fixed bottom-6 right-6 z-[9999] w-80 bg-[#1a1a1f] border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden" transition:fly={{ x: 100, duration: 200 }}>
        <div class="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-2 text-blue-400 font-bold">
            <Download size={18} /> Update Available
          </div>
          <button onclick={() => showUpdatePopup = false} class="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <p class="text-sm text-gray-400 mb-4 font-medium">
          Version <span class="text-white">v{latestVersion}</span> is now ready. Download the new update for the latest features and fixes.
        </p>
        <a href="/download" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all">
          Get Update
        </a>
      </div>
    {/if}

    <MobileBottomNav />
  {:else}
    <!-- TV Mode specific rendering (No web navbar/footer) -->
    <main class="tv-main-content">
      {@render children()}
    </main>
  {/if}
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    padding-top: 64px;
    min-height: 100vh;
    flex: 1;
  }

  /* Lock root elements on TV to force internal scrolling container */
  :global(.tv-mode) body,
  :global(.tv-mode) html,
  :global(.tv-mode) .app {
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
  }

  .tv-main-content {
    height: 100vh;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none; /* Hide scrollbar for TV */
  }
  .tv-main-content::-webkit-scrollbar {
    display: none;
  }

  /* Floating back button — mobile/Android APK */
  .back-fab {
    display: none;
  }

  @media (max-width: 768px) {
    .main-content {
      padding-top: 56px;
      padding-bottom: 70px; /* Space for bottom nav */
    }

    .back-fab {
      display: flex;
      position: fixed;
      bottom: 1.5rem;
      left: 1rem;
      z-index: 999;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(229, 9, 20, 0.85);
      color: white;
      font-size: 1.3rem;
      font-weight: 700;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 44px;
      min-width: 44px;
    }
    .back-fab:active {
      transform: scale(0.9);
      background: rgba(229, 9, 20, 1);
    }
  }

  @media (max-width: 480px) {
    .main-content {
      padding-top: 52px;
    }
    .back-fab {
      bottom: 1.25rem;
      left: 0.75rem;
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
      min-height: 40px;
      min-width: 40px;
    }
  }
</style>
