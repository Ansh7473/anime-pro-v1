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
  import { Download, X, Home, Search, LayoutGrid, Clock, Heart, Settings, User } from "lucide-svelte";
  import { isTV } from "$lib/stores/device";

  let { children } = $props();
  let tvSidebarExpanded = $state(false);

  // Hide sidebar when watching video
  let hideTvSidebar = $derived(page.url.pathname.includes('/watch/'));

  const tvMenuItems = [
    { icon: Home, label: 'Home', href: '/tv' },
    { icon: Search, label: 'Search', href: '/tv/search' },
    { icon: LayoutGrid, label: 'Categories', href: '/tv/genres' },
    { icon: Clock, label: 'Watchlist', href: '/tv/watchlist' },
    { icon: Heart, label: 'Favorites', href: '/tv/favorites' },
    { icon: User, label: 'Profile', href: '/tv/settings' }, // Point profile to settings for now or dedicated page
    { icon: Settings, label: 'Settings', href: '/tv/settings' },
  ];

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

  <div class="app" class:tv-mode-active={$isTV}>
    {#if !$isTV}
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
      <!-- Primary TV Shell (Netflix Style) - Persistent for all routes -->
      {#if !hideTvSidebar}
        <nav 
          class="tv-sidebar" 
          class:expanded={tvSidebarExpanded} 
          onmouseenter={() => tvSidebarExpanded = true}
          onmouseleave={() => tvSidebarExpanded = false}
          transition:fly={{ x: -100, duration: 400 }}
        >
          <div class="tv-logo-container">
             <div class="tv-logo-box">P</div>
          </div>

          <div class="tv-menu-items">
            {#each tvMenuItems as item}
              <a 
                href={item.href} 
                class="tv-nav-item" 
                class:active={page.url.pathname === item.href}
                tabindex="0"
              >
                <div class="tv-icon-box">
                  <item.icon size={32} strokeWidth={2.5} />
                </div>
                {#if tvSidebarExpanded}
                  <span class="tv-label" in:fly={{ x: -10, duration: 300 }}>{item.label}</span>
                {/if}
              </a>
            {/each}
          </div>

          <div class="tv-bottom-items">
             <button class="tv-nav-item exit-btn" onclick={() => isTV.set(false)}>
                <div class="tv-icon-box"><X size={32} /></div>
                {#if tvSidebarExpanded}
                  <span class="tv-label">Exit TV Hub</span>
                {/if}
             </button>
          </div>
        </nav>
      {/if}

      <main 
        class="tv-layout-main" 
        style:margin-left={hideTvSidebar ? '0' : '100px'}
        style:background={hideTvSidebar ? 'black' : 'radial-gradient(circle at 0% 0%, rgba(229, 9, 20, 0.03) 0%, transparent 40%)'}
      >
        <div class="tv-layout-scroll">
          {@render children()}
        </div>
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

  /* TV SHELL STYLES */
  .tv-mode-active {
    background: #050505;
    color: white;
    overflow: hidden;
  }

  .tv-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100px;
    background: #080808;
    z-index: 5000;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 0;
    transition: width 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .tv-sidebar.expanded {
    width: 320px;
    background: #0f0f0f;
    box-shadow: 20px 0 80px rgba(0,0,0,0.8);
  }

  .tv-logo-container { margin-bottom: 4rem; }
  .tv-logo-box {
    width: 50px;
    height: 50px;
    background: var(--net-red);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: 900;
    border-radius: 12px;
  }

  .tv-menu-items {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
    padding: 0 1.25rem;
  }

  .tv-nav-item {
    display: flex;
    align-items: center;
    height: 64px;
    padding: 0 1rem;
    border-radius: 16px;
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
    transition: all 0.3s;
    border: 3px solid transparent;
    white-space: nowrap;
  }

  .tv-nav-item:focus-visible, .tv-nav-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: scale(1.05);
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }

  .tv-nav-item.active {
    background: var(--net-red);
    color: white;
  }

  .tv-icon-box {
    width: 32px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .tv-label {
    margin-left: 2rem;
    font-size: 1.3rem;
    font-weight: 800;
  }

  .tv-layout-main {
    flex: 1;
    margin-left: 100px;
    height: 100vh;
    overflow: hidden;
    background: radial-gradient(circle at 0% 0%, rgba(229, 9, 20, 0.03) 0%, transparent 40%);
  }

  .tv-layout-scroll {
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .tv-layout-scroll::-webkit-scrollbar { display: none; }

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
