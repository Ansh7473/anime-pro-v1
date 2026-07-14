<script lang="ts">
  import { page } from "$app/state";
  import { auth } from "$lib/stores/auth";
  import { Home, CalendarDays, Clock, User, LogIn, Compass } from "lucide-svelte";
  import { isTV } from "$lib/stores/device";

  const items = [
    { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
    {
      href: "/schedule",
      label: "Schedule",
      icon: CalendarDays,
      match: (p: string) => p.startsWith("/schedule"),
    },
    {
      href: "/explore",
      label: "Browse",
      icon: Compass,
      match: (p: string) => p.startsWith("/explore") || p.startsWith("/search"),
    },
    {
      href: "/latest",
      label: "Latest",
      icon: Clock,
      match: (p: string) => p.startsWith("/latest"),
    },
  ];
</script>

{#if !$isTV}
  <nav class="mobile-bottom-nav glass hide-desktop" aria-label="Primary">
    <div class="nav-content">
      {#each items as item}
        {@const active = item.match(page.url.pathname)}
        <a href={item.href} class="nav-item" class:active aria-current={active ? "page" : undefined}>
          <span class="icon-wrap">
            <item.icon size={20} strokeWidth={active ? 2.4 : 2} />
          </span>
          <span class="label">{item.label}</span>
          {#if active}
            <span class="active-dot" aria-hidden="true"></span>
          {/if}
        </a>
      {/each}

      {#if $auth.user}
        {@const profileActive = page.url.pathname.startsWith("/profile")}
        <a
          href="/profile"
          class="nav-item"
          class:active={profileActive}
          aria-current={profileActive ? "page" : undefined}
        >
          <span class="icon-wrap">
            <User size={20} strokeWidth={profileActive ? 2.4 : 2} />
          </span>
          <span class="label">You</span>
          {#if profileActive}
            <span class="active-dot" aria-hidden="true"></span>
          {/if}
        </a>
      {:else}
        {@const loginActive = page.url.pathname.startsWith("/auth")}
        <a
          href="/auth/login"
          class="nav-item"
          class:active={loginActive}
          aria-current={loginActive ? "page" : undefined}
        >
          <span class="icon-wrap">
            <LogIn size={20} strokeWidth={loginActive ? 2.4 : 2} />
          </span>
          <span class="label">Login</span>
          {#if loginActive}
            <span class="active-dot" aria-hidden="true"></span>
          {/if}
        </a>
      {/if}
    </div>
  </nav>
{/if}

<style>
  .mobile-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(62px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 1000;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(8, 8, 10, 0.88);
    backdrop-filter: blur(22px) saturate(1.2);
    -webkit-backdrop-filter: blur(22px) saturate(1.2);
    display: flex;
    align-items: center;
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.35);
  }

  .nav-content {
    display: flex;
    justify-content: space-around;
    align-items: stretch;
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
    padding: 0 0.15rem;
  }

  .nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition:
      color 0.2s ease,
      transform 0.15s ease;
    flex: 1;
    min-height: 48px;
    min-width: 0;
    padding: 0.2rem 0.15rem;
    -webkit-tap-highlight-color: transparent;
  }

  .icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 10px;
    transition:
      background 0.2s ease,
      transform 0.2s ease,
      color 0.2s ease;
  }

  .nav-item :global(svg) {
    transition: transform 0.2s ease;
  }

  .label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-item.active {
    color: #fff;
  }

  .nav-item.active .icon-wrap {
    color: var(--net-red, #FF8A3D);
    background: rgba(229, 9, 20, 0.12);
    transform: translateY(-1px);
  }

  .active-dot {
    position: absolute;
    top: 4px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FACC15, #F59E0B);
    box-shadow: 0 0 8px rgba(229, 9, 20, 0.7);
  }

  .nav-item:active {
    transform: scale(0.94);
  }

  @media (min-width: 1025px) {
    .mobile-bottom-nav.hide-desktop {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-item,
    .icon-wrap,
    .nav-item :global(svg) {
      transition: none;
    }
  }
</style>
