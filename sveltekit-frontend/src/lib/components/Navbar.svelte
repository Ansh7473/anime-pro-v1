<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth, logoutUser } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  let scrolled = $state(false);
  let searchOpen = $state(false);
  let searchQuery = $state("");
  let suggestions = $state<any[]>([]);

  let isSearching = $state(false);
  let showSuggestions = $state(false);
  let mobileMenuOpen = $state(false);
  let searchContainer: HTMLElement;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/latest", label: "Latest" },
    { href: "/schedule", label: "Schedule" },
    { href: "/tv-series", label: "TV Series" },
    { href: "/movies", label: "Movies" },
  ];

  function handleScroll() {
    scrolled = window.scrollY > 50;
  }

  function handleSearch(e: KeyboardEvent) {
    if (e.key === "Enter") {
      executeSearch();
    }
  }

  function executeSearch() {
    if (!searchQuery.trim()) return;
    goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    searchOpen = false;
    showSuggestions = false;
  }

  async function handleRandom() {
    try {
      const id = await api.getRandomAnime();
      if (id) goto(`/anime/${id}`);
    } catch {}
  }

  function selectSuggestion(anime: any) {
    goto(`/anime/${anime.id}`);
    searchQuery = "";
    searchOpen = false;
    showSuggestions = false;
  }

  // Svelte 5 Debounced Search Effect
  $effect(() => {
    if (searchQuery.trim().length < 2) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    const timer = setTimeout(async () => {
      isSearching = true;
      try {
        const res = await api.search(searchQuery);
        suggestions = res.data.slice(0, 6);
        showSuggestions = true;
      } catch (err) {
        console.error("Search error:", err);
        suggestions = [];
      } finally {
        isSearching = false;
      }
    }, 300);

    return () => clearTimeout(timer);
  });

  onMount(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchContainer && !searchContainer.contains(e.target as Node)) {
        showSuggestions = false;
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  });
</script>

<svelte:window onscroll={handleScroll} />

<nav class="navbar" class:scrolled>
  <div class="nav-inner">
    <a href="/" class="logo">
      <span class="logo-text">ANIME<span class="logo-accent">PRO</span></span>
    </a>

    <div class="nav-links hide-mobile">
      {#each navLinks as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={page.url.pathname === link.href}>{link.label}</a
        >
      {/each}
    </div>

    <div class="nav-actions">
      <button class="nav-icon-btn" onclick={handleRandom} title="Random Anime"
        >🎲</button
      >

      <div class="search-container" bind:this={searchContainer}>
        {#if searchOpen}
          <div class="search-box glass">
            <input
              type="text"
              placeholder="Search anime..."
              bind:value={searchQuery}
              onkeydown={handleSearch}
              onfocus={() => suggestions.length > 0 && (showSuggestions = true)}
            />
            {#if isSearching}
              <div class="search-spinner"></div>
            {/if}
            <button
              class="close-btn"
              onclick={() => {
                searchOpen = false;
                searchQuery = "";
                showSuggestions = false;
              }}>✕</button
            >
          </div>
        {:else}
          <button class="nav-icon-btn" onclick={() => (searchOpen = true)}
            >🔍</button
          >
        {/if}

        {#if showSuggestions && (suggestions.length > 0 || isSearching)}
          <div class="suggestions-dropdown glass">
            {#if isSearching && suggestions.length === 0}
              <div class="searching-state">Searching...</div>
            {:else}
              {#each suggestions as anime}
                <button
                  class="suggestion-item"
                  onclick={() => selectSuggestion(anime)}
                >
                  <img
                    src={getProxiedImage(anime.poster)}
                    alt={anime.title}
                    class="suggestion-poster"
                  />
                  <div class="suggestion-info">
                    <span class="suggestion-title">{anime.title}</span>
                    <div class="suggestion-meta">
                      <span class="suggestion-type">{anime.type}</span>
                      <span class="suggestion-score"
                        >⭐ {anime.score || "N/A"}</span
                      >
                    </div>
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>

      <button
        class="nav-icon-btn hamburger hide-desktop"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>☰</button
      >

      {#if $auth.user}
        <div class="user-profile">
          <button class="profile-trigger" title="Account">
            <img
              src={getProxiedImage(
                $auth.currentProfile?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user.email}`,
              )}
              alt="Profile"
            />
          </button>
          <div class="profile-dropdown glass">
            <div class="user-info">
              <span class="user-name"
                >{$auth.currentProfile?.name || "User"}</span
              >
              <span class="user-email">{$auth.user.email}</span>
            </div>
            <hr />
            <a href="/profile" class="dropdown-item">My Profile</a>
            <a href="/watchlist" class="dropdown-item">Watchlist</a>
            <a href="/favorites" class="dropdown-item">Favorites</a>
            <button
              class="dropdown-item logout"
              onclick={() => {
                logoutUser();
                goto("/");
              }}>Logout</button
            >
          </div>
        </div>
      {:else}
        <!-- Give unauthenticated users a guest profile dropdown instead of raw buttons on home screen -->
        <div class="user-profile hide-mobile">
          <button class="profile-trigger" title="Guest">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=b6e3f4"
              alt="Guest"
            />
          </button>
          <div class="profile-dropdown glass">
            <div class="user-info">
              <span class="user-name">Guest User</span>
              <span class="user-email">Not logged in</span>
            </div>
            <hr />
            <a href="/auth/login" class="dropdown-item">Login</a>
            <a href="/auth/register" class="dropdown-item accent">Sign Up</a>
          </div>
        </div>
      {/if}
    </div>
  </div>

  {#if mobileMenuOpen}
    <div class="mobile-menu glass">
      {#each navLinks as link}
        <a
          href={link.href}
          class="mobile-link"
          onclick={() => (mobileMenuOpen = false)}>{link.label}</a
        >
      {/each}
      {#if !$auth.user}
        <hr />
        <a
          href="/auth/login"
          class="mobile-link"
          onclick={() => (mobileMenuOpen = false)}>Login</a
        >
        <a
          href="/auth/register"
          class="mobile-link accent"
          onclick={() => (mobileMenuOpen = false)}>Sign Up</a
        >
      {/if}
    </div>
  {/if}
</nav>

<style>
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: 0.75rem 1rem;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.8) 0%,
      transparent 100%
    );
    transition: background 0.3s ease;
  }
  .navbar.scrolled {
    background: var(--net-bg);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1400px;
    margin: 0 auto;
  }

  .logo {
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    text-decoration: none;
    color: white;
  }
  .logo-accent {
    color: var(--net-red);
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }
  .nav-link {
    color: var(--net-text-muted);
    font-weight: 500;
    font-size: 0.95rem;
    transition: color 0.2s;
    text-decoration: none;
    padding: 0.5rem 0;
  }
  .nav-link:hover,
  .nav-link.active {
    color: white;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .nav-icon-btn {
    color: white;
    font-size: 1.2rem;
    padding: 0.5rem;
    border-radius: 50%;
    transition: var(--transition);
    background: none;
    border: none;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .search-container {
    position: relative;
  }
  .search-box {
    display: flex;
    align-items: center;
    background: rgba(40, 40, 40, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    padding: 0.4rem 0.8rem;
    gap: 0.5rem;
  }
  .search-box input {
    background: none;
    border: none;
    color: white;
    outline: none;
    font-size: 0.95rem;
    width: 180px;
  }

  .search-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--net-red);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--net-text-muted);
    font-size: 0.9rem;
    padding: 4px;
    min-width: 32px;
    min-height: 32px;
  }

  .suggestions-dropdown {
    position: absolute;
    top: 115%;
    right: 0;
    width: 300px;
    max-width: calc(100vw - 2rem);
    border-radius: var(--radius-lg);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    padding: 0.5rem;
    z-index: 1001;
  }

  .searching-state {
    padding: 1rem;
    text-align: center;
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }

  .suggestion-item {
    display: flex;
    gap: 0.75rem;
    width: 100%;
    padding: 0.6rem;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    text-align: left;
    transition: background 0.2s;
    min-height: 44px;
  }
  .suggestion-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .suggestion-poster {
    width: 40px;
    height: 56px;
    border-radius: 4px;
    object-fit: cover;
    background: #222;
    flex-shrink: 0;
  }
  .suggestion-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    overflow: hidden;
    min-width: 0;
  }
  .suggestion-title {
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .suggestion-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--net-text-muted);
  }
  .suggestion-score {
    color: #fbbf24;
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--net-bg);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    animation: slideDown 0.3s ease;
  }
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .mobile-link {
    color: var(--net-text-muted);
    font-weight: 500;
    padding: 0.75rem 1rem;
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background 0.2s;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .mobile-link:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }
  .mobile-link.accent {
    color: var(--net-red);
    font-weight: 700;
  }

  .hide-mobile {
    display: none;
  }
  .hide-desktop {
    display: block;
  }
  @media (min-width: 768px) {
    .hide-mobile {
      display: flex;
    }
    .hide-desktop {
      display: none;
    }
    .navbar {
      padding: 0.75rem 2rem;
    }
    .logo {
      font-size: 1.6rem;
    }
    .search-box input {
      width: 220px;
    }
    .suggestions-dropdown {
      width: 320px;
    }
    .suggestion-poster {
      width: 44px;
      height: 62px;
    }
    .mobile-menu {
      padding: 1rem 2rem;
    }
  }
  .hamburger {
    font-size: 1.5rem;
  }

  .auth-buttons {
    display: flex;
    gap: 0.5rem;
    margin-left: 0.5rem;
  }
  .nav-btn-link {
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
    color: white;
    transition: 0.2s;
    min-height: 40px;
    display: flex;
    align-items: center;
  }
  .nav-btn-link:not(.accent):hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .nav-btn-link.accent {
    background: var(--net-red);
  }
  .nav-btn-link.accent:hover {
    background: #ff1e2b;
    transform: translateY(-1px);
  }

  .user-profile {
    position: relative;
    margin-left: 0.5rem;
  }
  .profile-trigger {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    padding: 0;
    transition: border-color 0.2s;
    min-width: 36px;
    min-height: 36px;
  }
  .profile-trigger:hover {
    border-color: var(--net-red);
  }
  .profile-trigger img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-dropdown {
    position: absolute;
    top: 120%;
    right: 0;
    width: 220px;
    max-width: calc(100vw - 2rem);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
    padding: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .user-profile:hover .profile-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .user-info {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
  }
  .user-name {
    font-weight: 700;
    color: white;
    font-size: 0.95rem;
  }
  .user-email {
    font-size: 0.75rem;
    color: var(--net-text-muted);
  }

  hr {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0.5rem 0;
  }
  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--net-text-muted);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    transition: 0.2s;
    min-height: 40px;
  }
  .dropdown-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }
  .dropdown-item.logout {
    color: #f87171;
  }
  .dropdown-item.logout:hover {
    background: rgba(248, 113, 113, 0.1);
  }

  /* Mobile-specific improvements */
  @media (max-width: 480px) {
    .navbar {
      padding: 0.6rem 0.75rem;
    }
    .logo {
      font-size: 1.2rem;
    }
    .nav-icon-btn {
      font-size: 1.1rem;
      padding: 0.4rem;
    }
    .search-box input {
      width: 140px;
      font-size: 0.9rem;
    }
    .suggestions-dropdown {
      width: calc(100vw - 1.5rem);
      right: -0.75rem;
      left: 0.75rem;
    }
    .suggestion-poster {
      width: 36px;
      height: 50px;
    }
    .profile-dropdown {
      width: 200px;
      right: -0.5rem;
    }
    .mobile-menu {
      padding: 0.75rem;
      max-height: calc(100vh - 56px);
    }
    .mobile-link {
      padding: 0.6rem 0.75rem;
      font-size: 0.95rem;
    }
  }

  @media (max-width: 360px) {
    .navbar {
      padding: 0.5rem 0.5rem;
    }
    .logo {
      font-size: 1.1rem;
    }
    .nav-icon-btn {
      font-size: 1rem;
      padding: 0.35rem;
      min-width: 40px;
      min-height: 40px;
    }
    .search-box input {
      width: 120px;
      font-size: 0.85rem;
    }
    .suggestions-dropdown {
      width: calc(100vw - 1rem);
      right: -0.5rem;
      left: 0.5rem;
    }
    .mobile-menu {
      padding: 0.5rem;
    }
    .mobile-link {
      padding: 0.5rem;
      font-size: 0.9rem;
    }
  }
</style>
