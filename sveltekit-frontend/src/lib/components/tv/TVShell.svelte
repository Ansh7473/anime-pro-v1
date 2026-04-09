<script lang="ts">
  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { X, Home, Search, LayoutGrid, Clock, Heart, Settings, User } from "lucide-svelte";
  import { isTV } from "$lib/stores/device";
  import { goto } from "$app/navigation";

  let { children } = $props();
  let tvSidebarExpanded = $state(false);

  async function handleExit() {
    isTV.set(false);
    await goto('/');
  }

  // Global Remote Control Key Handling
  function handleGlobalKeydown(e: KeyboardEvent) {
    // 1. Handle Navigation/Back
    if (e.key === 'Backspace' || e.key === 'Escape') {
      const p = page.url.pathname as string;
      if (p !== '/tv') {
        e.preventDefault();
        window.history.back();
      }
      return;
    }

    // 2. Spatial Navigation for D-pad (Arrows)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const active = document.activeElement;
      if (!active || active === document.body) {
        // Fallback: focus first focusable element
        const first = document.querySelector('button, a, [tabindex="0"]');
        if (first) (first as HTMLElement).focus();
        return;
      }

      const focusable = Array.from(document.querySelectorAll('button:not(:disabled), a, [tabindex="0"]')) as HTMLElement[];
      const currentRect = active.getBoundingClientRect();
      const currentCenter = {
        x: currentRect.left + currentRect.width / 2,
        y: currentRect.top + currentRect.height / 2
      };

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const el of focusable) {
        if (el === active) continue;
        const rect = el.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };

        const dx = center.x - currentCenter.x;
        const dy = center.y - currentCenter.y;

        // Check direction
        let isValidDirection = false;
        if (e.key === 'ArrowRight' && dx > 0 && Math.abs(dy) < Math.abs(dx)) isValidDirection = true;
        if (e.key === 'ArrowLeft' && dx < 0 && Math.abs(dy) < Math.abs(dx)) isValidDirection = true;
        if (e.key === 'ArrowDown' && dy > 0 && Math.abs(dx) < Math.abs(dy)) isValidDirection = true;
        if (e.key === 'ArrowUp' && dy < 0 && Math.abs(dx) < Math.abs(dy)) isValidDirection = true;

        if (isValidDirection) {
           // Squared distance
           const dist = dx * dx + dy * dy;
           if (dist < minDistance) {
             minDistance = dist;
             bestCandidate = el;
           }
        }
      }

      if (bestCandidate) {
        e.preventDefault();
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }

  const tvMenuItems = [
    { icon: Home, label: 'Home', href: '/tv' },
    { icon: Search, label: 'Search', href: '/tv/search' },
    { icon: LayoutGrid, label: 'Categories', href: '/tv/genres' },
    { icon: Clock, label: 'Watchlist', href: '/tv/watchlist' },
    { icon: Heart, label: 'Favorites', href: '/tv/favorites' },
    { icon: User, label: 'Profile', href: '/tv/profile' },
    { icon: Settings, label: 'Settings', href: '/tv/settings' },
  ];
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="tv-shell-container">
  <nav 
    class="tv-sidebar" 
    class:expanded={tvSidebarExpanded} 
    onmouseenter={() => tvSidebarExpanded = true}
    onmouseleave={() => tvSidebarExpanded = false}
    transition:fly={{ x: -100, duration: 400 }}
  >
    <div class="tv-logo-container">
       <div class="tv-logo-box">AP</div>
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
       <button class="tv-nav-item exit-btn" onclick={handleExit}>
          <div class="tv-icon-box"><X size={32} /></div>
          {#if tvSidebarExpanded}
            <span class="tv-label">Exit TV Hub</span>
          {/if}
       </button>
    </div>
  </nav>

  <main class="tv-layout-main">
    <div class="tv-layout-scroll">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .tv-shell-container {
    display: flex;
    min-height: 100vh;
    background: #050505;
    color: white;
    overflow: hidden;
  }

  .tv-layout-main {
    flex: 1;
    height: 100vh;
    margin-left: 100px;
    background: radial-gradient(circle at 0% 0%, rgba(229, 9, 20, 0.03) 0%, transparent 40%);
    position: relative;
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
    cursor: pointer;
    background: transparent;
    width: 100%;
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

  .tv-layout-scroll {
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .tv-layout-scroll::-webkit-scrollbar { display: none; }
</style>
