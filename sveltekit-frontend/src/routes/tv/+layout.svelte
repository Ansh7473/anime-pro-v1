<script lang="ts">
  import { onMount } from 'svelte';
  import { isTV } from '$lib/stores/device';
  import { Search, Home, Heart, Settings, LayoutGrid } from 'lucide-svelte';
  import { page } from '$app/state';
  
  let { children } = $props();

  let focusedNav = $state(false);
  
  onMount(() => {
    isTV.set(true);
    document.body.classList.add('tv-mode');
  });

  const menuItems = [
    { icon: Home, label: 'Home', href: '/tv' },
    { icon: Search, label: 'Search', href: '/tv/search' },
    { icon: LayoutGrid, label: 'Categories', href: '/tv/genres' },
    { icon: Heart, label: 'Favorites', href: '/tv/favorites' },
    { icon: Settings, label: 'Settings', href: '/tv/settings' },
  ];
</script>

<div class="tv-app-container">
  <!-- TV Sidebar -->
  <aside class="tv-sidebar" class:expanded={focusedNav} 
         onmouseenter={() => focusedNav = true}
         onmouseleave={() => focusedNav = false}>
    <div class="sidebar-logo">
      <span class="logo-text">AP</span>
    </div>
    
    <nav class="sidebar-nav">
      {#each menuItems as item}
        {@const Icon = item.icon}
        <a href={item.href} class="sidebar-item" class:active={page.url.pathname === item.href}>
          <Icon size={28} />
          {#if focusedNav}
            <span class="item-label">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>
  </aside>

  <main class="tv-content">
    {@render children()}
  </main>
</div>

<style>
  :global(body) {
    overflow: hidden;
    background: #050505 !important;
  }

  .tv-app-container {
    display: flex;
    width: 100vw;
    height: 100vh;
    background: #050505;
    color: white;
  }

  .tv-sidebar {
    width: 80px;
    height: 100%;
    background: rgba(10, 10, 10, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 1000;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
  }

  .tv-sidebar.expanded {
    width: 240px;
    align-items: flex-start;
    padding-left: 1.5rem;
  }

  .sidebar-logo {
    margin-bottom: 3rem;
    font-weight: 900;
    font-size: 1.8rem;
    color: var(--net-red);
    letter-spacing: -2px;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    padding: 0.8rem;
    border-radius: 12px;
    transition: all 0.2s;
    width: fit-content;
  }

  .expanded .sidebar-item {
    width: calc(100% - 1.5rem);
  }

  .sidebar-item:hover,
  .sidebar-item:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    outline: none;
    transform: scale(1.05);
  }

  .sidebar-item.active {
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
  }

  .item-label {
    font-size: 1.1rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .tv-content {
    flex: 1;
    height: 100%;
    overflow-y: auto;
    padding: 3rem;
    padding-left: 4rem;
    scroll-behavior: smooth;
  }

  /* Focus management for TV */
  :focus-visible {
    outline: 4px solid var(--net-red) !important;
    outline-offset: 4px !important;
  }
</style>
