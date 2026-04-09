<script lang="ts">
  import { onMount } from 'svelte';
  import { isTV } from '$lib/stores/device';
  import { Home, Search, Heart, Clock, Settings, User, LogOut, LayoutGrid } from 'lucide-svelte';
  import { fly, fade } from 'svelte/transition';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  
  let { children } = $props();

  let expanded = $state(false);
  
  onMount(() => {
    isTV.set(true);
    document.body.classList.add('tv-mode');
  });

  const menuItems = [
    { icon: Home, label: 'Home', href: '/tv' },
    { icon: Search, label: 'Search', href: '/tv/search' },
    { icon: LayoutGrid, label: 'Categories', href: '/tv/genres' },
    { icon: Clock, label: 'Watchlist', href: '/tv/watchlist' },
    { icon: Heart, label: 'Favorites', href: '/tv/favorites' },
    { icon: Settings, label: 'Settings', href: '/tv/settings' },
  ];

  function handleExitTV() {
    isTV.set(false);
    document.body.classList.remove('tv-mode');
    goto('/');
  }
</script>

<div class="tv-app-shell">
  <!-- Premium TV Sidebar (Netflix Style) -->
  <nav 
    class="tv-sidebar" 
    class:expanded 
    onmouseenter={() => expanded = true}
    onmouseleave={() => expanded = false}
  >
    <div class="logo-container">
      <div class="logo-box">
        <span class="logo-p">P</span>
      </div>
    </div>

    <div class="menu-items">
      {#each menuItems as item}
        <a 
          href={item.href} 
          class="nav-item" 
          class:active={page.url.pathname === item.href}
          tabindex="0"
        >
          <div class="icon-box">
            <item.icon size={32} strokeWidth={2.5} />
          </div>
          {#if expanded}
            <span class="label" in:fade={{ duration: 200 }}>{item.label}</span>
          {/if}
        </a>
      {/each}
    </div>

    <div class="bottom-items">
      <button class="nav-item exit-btn" onclick={handleExitTV} tabindex="0">
         <div class="icon-box">
            <LogOut size={32} />
         </div>
         {#if expanded}
          <span class="label" in:fade={{ duration: 200 }}>Exit TV Hub</span>
         {/if}
      </button>
    </div>
  </nav>

  <!-- Main Content Area -->
  <main class="tv-main-content">
    <div class="tv-scroll-container">
      <div in:fly={{ y: 20, duration: 500 }}>
        {@render children()}
      </div>
    </div>
  </main>
</div>

<style>
  :global(body) {
    background: #050505 !important;
    overflow: hidden !important;
    color: white;
  }

  .tv-app-shell {
    display: flex;
    width: 100vw;
    height: 100vh;
    background: #050505;
    overflow: hidden;
  }

  /* SIDEBAR STYLES */
  .tv-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100px;
    background: #080808;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 3rem 0;
    transition: width 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), background 0.4s ease;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .tv-sidebar.expanded {
    width: 320px;
    background: #0f0f0f;
    box-shadow: 20px 0 80px rgba(0, 0, 0, 0.8);
  }

  .logo-container {
    margin-bottom: 4rem;
    transition: transform 0.3s;
  }
  .expanded .logo-container {
    transform: translateX(-40px);
  }

  .logo-box {
    width: 60px;
    height: 60px;
    background: var(--net-red);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 40px rgba(229, 9, 20, 0.3);
  }

  .logo-p {
    color: white;
    font-size: 2.5rem;
    font-weight: 950;
  }

  .menu-items {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
    padding: 0 1.25rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.3);
    border-radius: 16px;
    transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    height: 64px;
    white-space: nowrap;
    padding: 0 1rem;
    cursor: pointer;
    border: 3px solid transparent;
  }

  .icon-box {
    width: 48px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.3s;
  }

  .label {
    margin-left: 2rem;
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .nav-item:hover,
  .nav-item:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    color: white;
    transform: scale(1.05);
    outline: none;
  }

  .nav-item:focus-visible {
     border-color: rgba(255, 255, 255, 0.8);
     box-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
  }

  .nav-item.active {
    color: white;
    background: rgba(229, 9, 20, 0.8);
    box-shadow: 0 10px 30px rgba(229, 9, 20, 0.3);
  }

  .nav-item.active .icon-box {
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
  }

  .bottom-items {
    width: 100%;
    padding: 0 1.25rem;
    margin-top: 2rem;
  }

  .exit-btn {
    width: 100%;
    border: none;
    text-align: left;
    background: none;
    font-family: inherit;
    color: #ef4444;
  }

  /* MAIN CONTENT STYLES */
  .tv-main-content {
    flex: 1;
    height: 100vh;
    margin-left: 100px;
    position: relative;
    background: radial-gradient(circle at 0% 0%, rgba(229, 9, 20, 0.02) 0%, transparent 40%);
    transition: margin-left 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  }

  /* When sidebar expands, move content slightly to maintain balance */
  .tv-sidebar.expanded + .tv-main-content {
    margin-left: 120px;
  }

  .tv-scroll-container {
    height: 100vh;
    overflow-y: auto;
    padding: 0; /* Remove top padding here, handle in pages */
    scrollbar-width: none;
  }

  .tv-scroll-container::-webkit-scrollbar {
    display: none;
  }

  /* Smooth Focus Glow for all items in TV mode */
  :global(.tv-mode) :focus-visible {
    outline: 4px solid white !important;
    outline-offset: 4px !important;
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.4) !important;
    z-index: 100;
  }
</style>
