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
    { href: "/intel", label: "Intel Center" },
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
      <button class="nav-icon-btn hide-mobile" onclick={handleRandom} title="Random Anime"
        >🎲</button
      >

      <a href="/download" class="nav-icon-btn" title="Download Apps">
        <Download size={20} />
      </a>

      <a href="/donate" class="nav-icon-btn text-pink-500" title="Donate">
        <Heart size={20} fill="currentColor" />
      </a>

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
        <div class="user-profile" class:open={profileOpen} bind:this={profileContainer}>
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
        <div class="user-profile" class:open={profileOpen} bind:this={profileContainer}>
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
          onclick={() => (mobileMenuOpen = false)}>Login</a>
        <a
          href="/auth/register"
          class="mobile-link accent"
          onclick={() => (mobileMenuOpen = false)}>Sign Up</a>
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
    background: #141414;
    padding: 1rem;
    display: flex;
    flex-direction: column;
  }
  .mobile-link {
    padding: 0.75rem;
    color: #ccc;
    text-decoration: none;
  }

  @media (max-width: 768px) {
    .hide-mobile { display: none; }
  }
  @media (min-width: 769px) {
    .hide-desktop { display: none; }
    .user-profile:hover .profile-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }
</style>
