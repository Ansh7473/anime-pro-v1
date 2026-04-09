<script lang="ts">
  import { page } from "$app/state";
  import { Home, Search, Heart, Clock, Settings, User } from 'lucide-svelte';
  import { isTV } from "$lib/stores/device";

  let expanded = $state(false);

  const menuItems = [
    { icon: Home, label: 'Home', href: '/tv' },
    { icon: Search, label: 'Search', href: '/tv/search' },
    { icon: Clock, label: 'Watchlist', href: '/watchlist' },
    { icon: Heart, label: 'Favorites', href: '/favorites' },
    { icon: User, label: 'Profile', href: '/profile' },
  ];

  function handleExitTV() {
    isTV.set(false);
    document.body.classList.remove('tv-mode');
    window.location.href = '/';
  }
</script>

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
      >
        <div class="icon-box">
          <item.icon size={28} strokeWidth={2.5} />
        </div>
        {#if expanded}
          <span class="label">{item.label}</span>
        {/if}
      </a>
    {/each}
  </div>

  <div class="bottom-items">
    <button class="nav-item exit-btn" onclick={handleExitTV}>
       <div class="icon-box">
          <Settings size={28} />
       </div>
       {#if expanded}
        <span class="label">Exit TV Mode</span>
       {/if}
    </button>
  </div>
</nav>

<style>
  .tv-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100px;
    background: linear-gradient(90deg, rgba(0,0,0,0.95), transparent);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 0;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .tv-sidebar.expanded {
    width: 280px;
    background: rgba(10, 10, 12, 0.98);
    backdrop-filter: blur(20px);
    box-shadow: 50px 0 100px rgba(0, 0, 0, 0.9);
  }

  .logo-container {
    margin-bottom: 4rem;
  }
  .logo-box {
    width: 50px;
    height: 50px;
    background: var(--net-red);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 30px rgba(229, 9, 20, 0.4);
  }
  .logo-p {
    color: white;
    font-size: 2rem;
    font-weight: 900;
  }

  .menu-items {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    padding: 0 1.5rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.5);
    border-radius: 16px;
    transition: all 0.2s;
    height: 60px;
    white-space: nowrap;
    padding: 0 1rem;
    cursor: pointer;
  }

  .icon-box {
    width: 44px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .label {
    margin-left: 1.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .nav-item:hover,
  .nav-item:focus-visible {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: scale(1.05);
    outline: none;
  }

  .nav-item:focus-visible {
     border: 2px solid white;
     box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
  }

  .nav-item.active {
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
  }

  .bottom-items {
    width: 100%;
    padding: 0 1.5rem;
  }

  .exit-btn {
    width: 100%;
    border: none;
    text-align: left;
    background: none;
    font-family: inherit;
  }

  .exit-btn:hover {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }
</style>
