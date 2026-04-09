<script lang="ts">
  import { page } from "$app/state";
  import { auth } from "$lib/stores/auth";
  import { Home, Search, Clock, User, LogIn } from 'lucide-svelte';
  import { isTV } from "$lib/stores/device";

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/latest", label: "Latest", icon: Clock },
  ];
</script>

{#if !$isTV}
<div class="mobile-bottom-nav glass hide-desktop">
  <div class="nav-content">
    {#each items as item}
      <a href={item.href} class="nav-item" class:active={page.url.pathname === item.href}>
        <item.icon size={20} />
        <span>{item.label}</span>
      </a>
    {/each}

    {#if $auth.user}
      <a href="/profile" class="nav-item" class:active={page.url.pathname === '/profile'}>
        <User size={20} />
        <span>Profile</span>
      </a>
    {:else}
      <a href="/auth/login" class="nav-item" class:active={page.url.pathname.startsWith('/auth')}>
        <LogIn size={20} />
        <span>Login</span>
      </a>
    {/if}
  </div>
</div>
{/if}

<style>
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(60px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 1000;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(10, 10, 10, 0.85);
    backdrop-filter: blur(20px);
    display: flex;
    align-items: center;
  }

  .nav-content {
    display: flex;
    justify-content: space-around;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--net-text-muted);
    text-decoration: none;
    font-size: 0.7rem;
    font-weight: 500;
    transition: all 0.2s ease;
    flex: 1;
    min-height: 44px;
  }

  .nav-item :global(svg) {
    transition: transform 0.2s ease;
  }

  .nav-item.active {
    color: var(--net-red);
  }

  .nav-item.active :global(svg) {
    transform: translateY(-2px);
    color: var(--net-red);
  }

  .nav-item:active {
    transform: scale(0.9);
  }

  @media (min-width: 768px) {
    .hide-desktop {
      display: none;
    }
  }
</style>
