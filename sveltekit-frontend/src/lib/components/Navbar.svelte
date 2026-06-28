<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { Download, Heart } from 'lucide-svelte';
  import { auth, logoutUser } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { isTV } from "$lib/stores/device";

  let scrolled = $state(false);
  let searchOpen = $state(false);
  let searchQuery = $state("");
  let suggestions = $state<any[]>([]);

  let isSearching = $state(false);
  let showSuggestions = $state(false);
  let mobileMenuOpen = $state(false);
  let profileOpen = $state(false);
  let searchContainer: HTMLElement = $state(null!);
  let profileContainer: HTMLElement = $state(null!);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/latest", label: "Latest" },
    { href: "/schedule", label: "Schedule" },
    { href: "/tv-series", label: "TV Series" },
    { href: "/movies", label: "Movies" },
    { href: "/intel", label: "Blog" },
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
      if (profileContainer && !profileContainer.contains(e.target as Node)) {
        profileOpen = false;
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
      <img src="/favicon-192.png" alt="WatchAnimez" class="logo-img" />
      <span class="logo-text">WATCH<span class="logo-accent">ANIMEZ</span></span>
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
      <button class="nav-icon-btn hide-mobile" onclick={handleRandom} title="Random Anime"
        >🎲</button
      >

      <a href="/download" class="nav-icon-btn" title="Download Apps">
        <Download size={20} />
      </a>

      <a href="/donate" class="nav-icon-btn text-pink-500 hide-mobile" title="Donate">
        <Heart size={20} fill="currentColor" />
      </a>

      <div class="search-container" class:open={searchOpen} bind:this={searchContainer}>
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
                    loading="lazy"
                    decoding="async"
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

      {#if $auth.user}
        <div class="user-profile hide-mobile" class:open={profileOpen} bind:this={profileContainer}>
          <button class="profile-trigger" title="Account" onclick={(e) => { e.stopPropagation(); profileOpen = !profileOpen; }}>
            <img
              src={getProxiedImage(
                ($auth.currentProfile?.avatar) ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || 'guest'}`,
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
            <a href="/profile" class="dropdown-item" onclick={() => profileOpen = false}>My Profile</a>
            <a href="/watchlist" class="dropdown-item" onclick={() => profileOpen = false}>Watchlist</a>
            <a href="/favorites" class="dropdown-item" onclick={() => profileOpen = false}>Favorites</a>
            <hr />
            <button
               class="dropdown-item"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 profileOpen = false;
               }}>TV Mode Hub</button>
            <button
              class="dropdown-item logout"
              onclick={() => {
                profileOpen = false;
                logoutUser();
                goto("/");
              }}>Logout</button
            >
          </div>
        </div>
      {:else}
        <div class="user-profile hide-mobile" class:open={profileOpen} bind:this={profileContainer}>
          <button class="profile-trigger" title="Guest" onclick={(e) => { e.stopPropagation(); profileOpen = !profileOpen; }}>
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
            <a href="/auth/login" class="dropdown-item" onclick={() => profileOpen = false}>Login</a>
            <a href="/auth/register" class="dropdown-item accent" onclick={() => profileOpen = false}>Sign Up</a>
            <hr />
            <button
               class="dropdown-item"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 profileOpen = false;
               }}>TV Mode Hub</button>
          </div>
        </div>
      {/if}

      <button
        class="nav-icon-btn hamburger hide-desktop"
        onclick={() => (mobileMenuOpen = !mobileMenuOpen)}>☰</button
      >
    </div>
  </div>

  {#if mobileMenuOpen}
    <div class="mobile-menu glass">
      <div class="mobile-links-grid">
        {#each navLinks as link}
          <a
            href={link.href}
            class="mobile-link"
            class:active={page.url.pathname === link.href}
            onclick={() => (mobileMenuOpen = false)}>{link.label}</a
          >
        {/each}
        
        <!-- Heart (Donate) option inside hamburger menu -->
        <a
          href="/donate"
          class="mobile-link donate-mobile-link"
          onclick={() => (mobileMenuOpen = false)}
        >
          <span class="mobile-heart-wrapper">
            <Heart size={16} fill="currentColor" />
          </span>
          Donate / Support
        </a>
      </div>

      <hr class="mobile-divider" />

      {#if $auth.user}
        <div class="mobile-profile-section">
          <div class="mobile-user-info">
            <img
              src={getProxiedImage(
                ($auth.currentProfile?.avatar) ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || 'guest'}`,
              )}
              alt="Profile"
              class="mobile-profile-avatar"
            />
            <div class="mobile-profile-details">
              <span class="mobile-profile-name">{$auth.currentProfile?.name || "User"}</span>
              <span class="mobile-profile-email">{$auth.user.email}</span>
            </div>
          </div>
          <div class="mobile-profile-links">
            <a href="/profile" class="mobile-link" onclick={() => (mobileMenuOpen = false)}>My Profile</a>
            <a href="/watchlist" class="mobile-link" onclick={() => (mobileMenuOpen = false)}>Watchlist</a>
            <a href="/favorites" class="mobile-link" onclick={() => (mobileMenuOpen = false)}>Favorites</a>
            <button
               class="mobile-link mobile-btn"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 mobileMenuOpen = false;
               }}>TV Mode Hub</button>
            <button
              class="mobile-link mobile-btn logout"
              onclick={() => {
                mobileMenuOpen = false;
                logoutUser();
                goto("/");
              }}>Logout</button
            >
          </div>
        </div>
      {:else}
        <div class="mobile-profile-section">
          <div class="mobile-user-info">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=b6e3f4"
              alt="Guest"
              class="mobile-profile-avatar"
            />
            <div class="mobile-user-details">
              <span class="mobile-profile-name">Guest User</span>
              <span class="mobile-profile-email">Not logged in</span>
            </div>
          </div>
          <div class="mobile-profile-links">
            <a href="/auth/login" class="mobile-link" onclick={() => (mobileMenuOpen = false)}>Login</a>
            <a href="/auth/register" class="mobile-link accent" onclick={() => (mobileMenuOpen = false)}>Sign Up</a>
            <button
               class="mobile-link mobile-btn"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 mobileMenuOpen = false;
               }}>TV Mode Hub</button>
          </div>
        </div>
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
    padding-top: max(0.75rem, env(safe-area-inset-top));
    padding-left: max(1rem, env(safe-area-inset-left));
    padding-right: max(1rem, env(safe-area-inset-right));
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    text-decoration: none;
    color: white;
  }
  .logo-img {
    height: 32px;
    width: 32px;
    object-fit: contain;
    border-radius: 6px;
    transition: transform 0.2s ease;
  }
  .logo:hover .logo-img {
    transform: scale(1.05);
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
    white-space: nowrap;
  }
  .nav-link:hover, .nav-link.active {
    color: white;
  }
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .nav-icon-btn {
    color: white;
    background: none;
    border: none;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .search-container {
    position: relative;
  }
  .search-box {
    display: flex;
    align-items: center;
    background: rgba(40, 40, 40, 0.6);
    border-radius: 8px;
    padding: 0.4rem 0.8rem;
  }
  .search-box input {
    background: none;
    border: none;
    color: white;
    outline: none;
  }
  .search-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin-right: 0.5rem;
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--net-text-muted, #999);
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }
  .close-btn:hover {
    color: white;
  }
  .suggestions-dropdown {
    position: absolute;
    top: 110%;
    right: 0;
    width: 300px;
    background: #141414;
    border-radius: 8px;
    padding: 0.5rem;
  }
  .suggestion-item {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: white;
    text-align: left;
    cursor: pointer;
  }
  .suggestion-poster {
    width: 40px;
    height: 56px;
    object-fit: cover;
  }
  .suggestion-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    flex: 1;
  }
  .suggestion-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.2rem;
  }
  .suggestion-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--net-text-muted, #999);
  }
  .suggestion-type {
    text-transform: uppercase;
  }
  .suggestion-score {
    color: #fbbf24;
  }
  .searching-state {
    padding: 0.75rem;
    color: var(--net-text-muted, #999);
    text-align: center;
    font-size: 0.9rem;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .user-profile {
    position: relative;
  }
  .profile-trigger {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    border: none;
    padding: 0;
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
    background: #141414;
    border-radius: 8px;
    padding: 0.75rem;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: 0.2s;
  }
  .user-profile.open .profile-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  .dropdown-item {
    display: block;
    width: 100%;
    padding: 0.6rem;
    color: #ccc;
    text-decoration: none;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
  }
  .dropdown-item:hover {
    color: white;
    background: rgba(255,255,255,0.1);
  }
  .mobile-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: calc(100vh - 100% - 60px);
    overflow-y: auto;
    animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
  .mobile-links-grid {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .mobile-link {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    color: var(--net-text-muted, #ccc);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.2s ease;
  }
  .mobile-link:hover, .mobile-link.active {
    color: white;
    background: rgba(255, 255, 255, 0.06);
  }
  .mobile-link.accent {
    color: var(--net-red, #ff0055);
  }
  .donate-mobile-link {
    color: #ff69b4;
    font-weight: 600;
  }
  .donate-mobile-link:hover {
    background: rgba(255, 105, 180, 0.1) !important;
    color: #ff8da1;
  }
  .mobile-heart-wrapper {
    display: inline-flex;
    margin-right: 0.5rem;
    color: #ff69b4;
  }
  .mobile-divider {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0.5rem 0;
  }
  .mobile-profile-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.04);
  }
  .mobile-user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .mobile-profile-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }
  .mobile-profile-details {
    display: flex;
    flex-direction: column;
  }
  .mobile-profile-name {
    font-weight: 600;
    color: white;
    font-size: 0.95rem;
  }
  .mobile-profile-email {
    font-size: 0.8rem;
    color: var(--net-text-muted, #888);
  }
  .mobile-profile-links {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .mobile-btn {
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  .mobile-btn.logout {
    color: #ff4a4a;
  }
  .mobile-btn.logout:hover {
    background: rgba(255, 74, 74, 0.08);
  }

  @media (max-width: 1024px) {
    .hide-mobile { display: none; }
    
    .search-container.open {
      position: absolute;
      top: 100%;
      left: 1rem;
      right: 1rem;
      width: calc(100% - 2rem);
      margin-top: 0.5rem;
      z-index: 1001;
      display: block;
      background: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      border: none;
      padding: 0;
    }
    
    .search-container.open .search-box {
      width: 100%;
      background: rgba(20, 20, 20, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      padding: 0.6rem 1rem;
      box-sizing: border-box;
      display: flex;
      align-items: center;
    }
    
    .search-container.open .search-box input {
      flex: 1;
      font-size: 1rem;
      padding: 0.2rem 0;
      background: none;
      border: none;
      color: white;
      outline: none;
    }
    
    .search-container.open .suggestions-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      width: 100%;
      margin-top: 0.25rem;
      background: rgba(20, 20, 20, 0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
      z-index: 1000;
      border-radius: 12px;
      box-sizing: border-box;
      max-height: 300px;
      overflow-y: auto;
    }
  }
  @media (min-width: 1025px) {
    .hide-desktop { display: none; }
    .user-profile:hover .profile-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }
</style>
