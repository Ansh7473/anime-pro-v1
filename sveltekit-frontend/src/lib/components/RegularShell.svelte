<script lang="ts">
  import Navbar from "$lib/components/Navbar.svelte";
  import MobileBottomNav from "$lib/components/MobileBottomNav.svelte";
  import PullToRefresh from "$lib/components/PullToRefresh.svelte";
  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { Download, X } from "lucide-svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let { children } = $props();

  // Update check logic
  let showUpdatePopup = $state(false);
  let latestVersion = $state("");
  const CURRENT_VERSION = "1.0.0";
  const BACKEND_URL = 'https://anime-pro-v1-backend-go.vercel.app';

  onMount(async () => {
    // @ts-ignore
    const isElectron = !!window.electronAPI?.isElectron;
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

  function handleBack() {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      goto("/");
    }
  }

  let canGoBack = $derived(page.url.pathname !== "/");
  let isWatchPage = $derived(page.url.pathname.startsWith('/watch/'));
</script>

<div class="regular-shell">
  {#if !isWatchPage}
    <div class="tactical-grid"></div>
    <div class="tactical-vignette"></div>
    <Navbar />

    {#if canGoBack}
      <button class="back-fab" onclick={handleBack} aria-label="Go back">
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
    </PullToRefresh>

    <MobileBottomNav />

    {#if showUpdatePopup}
      <div class="update-popup glass" transition:fly={{ y: 50, duration: 400 }}>
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
          Version <span class="text-white">v{latestVersion}</span> is now ready.
        </p>
        <a href="/download" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all">
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

  .back-fab {
    display: none;
  }

  @media (max-width: 768px) {
    .main-content {
      padding-top: 56px;
      padding-bottom: 70px;
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
