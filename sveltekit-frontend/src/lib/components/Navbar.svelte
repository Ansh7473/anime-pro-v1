<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import {
    Download,
    Heart,
    User,
    Bookmark,
    Tv,
    LogOut,
    LogIn,
    UserPlus,
    Search,
    X,
    Sparkles,
    ArrowLeft,
    TrendingUp,
    Film,
    Tv2,
    Flame
  } from 'lucide-svelte';
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
  let searchInput: HTMLInputElement = $state(null!);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/latest", label: "Latest" },
    { href: "/schedule", label: "Schedule" },
    { href: "/tv-series", label: "TV Series" },
    { href: "/movies", label: "Movies" },
    { href: "/intel", label: "Blog" },
  ];

  const trendingSearches = [
    "Solo Leveling",
    "Demon Slayer",
    "One Piece",
    "Jujutsu Kaisen",
    "Bleach",
    "Chainsaw Man"
  ];

  function handleScroll() {
    scrolled = window.scrollY > 20;
  }

  function handleSearchKey(e: KeyboardEvent) {
    if (e.key === "Enter") {
      executeSearch();
    } else if (e.key === "Escape") {
      closeSearch();
    }
  }

  function executeSearch() {
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    closeSearch();
    goto(`/search?q=${encodeURIComponent(q)}`);
  }

  function closeSearch() {
    searchOpen = false;
    searchQuery = "";
    showSuggestions = false;
  }

  function toggleSearch() {
    searchOpen = !searchOpen;
    if (searchOpen) {
      mobileMenuOpen = false;
    }
  }

  async function handleRandom() {
    try {
      const id = await api.getRandomAnime();
      if (id) goto(`/anime/${id}`);
    } catch {}
  }

  function selectSuggestion(anime: any) {
    closeSearch();
    goto(`/anime/${anime.id}`);
  }

  function quickSearch(tag: string) {
    searchQuery = tag;
  }

  // Prevent background scrolling when search modal or mobile menu is open
  $effect(() => {
    if (typeof document !== 'undefined') {
      if (searchOpen || mobileMenuOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  });

  // Auto-focus input when search opens
  $effect(() => {
    if (searchOpen && searchInput) {
      const timer = setTimeout(() => searchInput?.focus(), 80);
      return () => clearTimeout(timer);
    }
  });

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
        const res = await api.search(searchQuery.trim());
        suggestions = res?.data ? res.data.slice(0, 6) : [];
        showSuggestions = true;
      } catch (err) {
        console.error("Search error:", err);
        suggestions = [];
      } finally {
        isSearching = false;
      }
    }, 350);

    return () => clearTimeout(timer);
  });

  onMount(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileContainer && !profileContainer.contains(e.target as Node)) {
        profileOpen = false;
      }
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch();
      }
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  });
</script>

<svelte:window onscroll={handleScroll} />

<nav class="navbar" class:scrolled>
  <div class="nav-inner">
    <!-- BRAND LOGO (decorative animation, not video content) -->
        <a href="/" class="logo" onclick={() => { closeSearch(); mobileMenuOpen = false; }}>
          <div class="logo-badge">
            <!--
              aria-hidden + role=presentation tells crawlers this is decorative, not video content.
              data-nosnippet prevents Google from indexing this as a video result.
            -->
            <video
              src="/logo-anim.mp4"
              class="logo-img"
              autoplay
              loop
              muted
              playsinline
              aria-hidden="true"
              role="presentation"
              data-nosnippet
            ></video>
        <span class="logo-glow"></span>
      </div>
      <div class="logo-text-wrapper">
        <span class="logo-text">WATCH<span class="logo-accent">ANIMEZ</span></span>
        <span class="logo-subtag hide-mobile">HD STREAMING</span>
      </div>
    </a>

    <!-- DESKTOP NAV LINKS -->
    <div class="nav-links hide-mobile">
      {#each navLinks as link}
        <a
          href={link.href}
          class="nav-link"
          class:active={page.url.pathname === link.href}>{link.label}</a
        >
      {/each}
    </div>

    <!-- ACTION BUTTONS -->
    <div class="nav-actions">
      <!-- QUICK SEARCH TRIGGER (DESKTOP) -->
      <button
        class="search-bar-trigger hide-mobile"
        onclick={toggleSearch}
        aria-label="Open search"
      >
        <Search size={16} class="search-trigger-icon" />
        <span class="search-trigger-text">Search anime...</span>
        <kbd class="search-shortcut">⌘K</kbd>
      </button>

      <!-- MOBILE SEARCH ICON -->
      <button
        class="nav-icon-btn search-trigger-btn hide-desktop"
        onclick={toggleSearch}
        aria-label="Search Anime"
      >
        <Search size={20} />
      </button>

      <button class="nav-icon-btn hide-mobile" onclick={handleRandom} title="Surprise Anime">
        <Sparkles size={18} />
      </button>

      <a href="/download" class="nav-icon-btn hide-mobile" title="Download Apps">
        <Download size={18} />
      </a>

      <a href="/donate" class="nav-icon-btn heart-btn hide-mobile" title="Donate & Support">
        <Heart size={18} fill="currentColor" />
      </a>

      <!-- USER PROFILE DROPDOWN -->
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
              <img
                class="ui-avatar"
                src={getProxiedImage(
                  ($auth.currentProfile?.avatar) ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || 'guest'}`,
                )}
                alt="Profile"
              />
              <div class="ui-text">
                <span class="user-name">{$auth.currentProfile?.name || "User"}</span>
                <span class="user-email">{$auth.user.email}</span>
              </div>
            </div>
            <hr />
            <a href="/profile" class="dropdown-item" onclick={() => profileOpen = false}><User size={16} /> My Profile</a>
            <a href="/watchlist" class="dropdown-item" onclick={() => profileOpen = false}><Bookmark size={16} /> Watchlist</a>
            <a href="/favorites" class="dropdown-item" onclick={() => profileOpen = false}><Heart size={16} /> Favorites</a>
            <hr />
            <button
               class="dropdown-item"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 profileOpen = false;
               }}><Tv size={16} /> TV Mode</button>
            <button
              class="dropdown-item logout"
              onclick={() => {
                profileOpen = false;
                logoutUser();
                goto("/");
              }}><LogOut size={16} /> Logout</button
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
              <img
                class="ui-avatar"
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=b6e3f4"
                alt="Guest"
              />
              <div class="ui-text">
                <span class="user-name">Guest User</span>
                <span class="user-email">Sign in for watch history</span>
              </div>
            </div>
            <hr />
            <a href="/auth/login" class="dropdown-item" onclick={() => profileOpen = false}><LogIn size={16} /> Login</a>
            <a href="/auth/register" class="dropdown-item accent" onclick={() => profileOpen = false}><UserPlus size={16} /> Sign Up</a>
            <hr />
            <button
               class="dropdown-item"
               onclick={() => {
                 isTV.set(true);
                 document.body.classList.add('tv-mode');
                 profileOpen = false;
               }}><Tv size={16} /> TV Mode</button>
          </div>
        </div>
      {/if}

      <!-- HAMBURGER MENU TOGGLE -->
      <button
        class="nav-icon-btn hamburger hide-desktop"
        onclick={() => { mobileMenuOpen = !mobileMenuOpen; if (mobileMenuOpen) searchOpen = false; }}
        aria-label="Toggle menu">
        {#if mobileMenuOpen}<X size={22} />{:else}☰{/if}
      </button>
    </div>
  </div>

  <!-- MOBILE HAMBURGER DRAWER -->
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

<!-- HIGH-PERFORMANCE FULL-SCREEN OVERLAY SEARCH MODAL -->
{#if searchOpen}
  <div class="search-backdrop" onclick={closeSearch} role="dialog" aria-modal="true">
    <div
      class="search-modal glass"
      bind:this={searchContainer}
      onclick={(e) => e.stopPropagation()}
    >
      <!-- MODAL TOP BAR -->
      <div class="search-top-bar">
        <button class="icon-action-btn back-btn" onclick={closeSearch} aria-label="Close search">
          <ArrowLeft size={20} />
        </button>

        <div class="search-input-box">
          <Search size={18} class="input-search-icon" />
          <input
            bind:this={searchInput}
            type="text"
            placeholder="Search anime, movies, series..."
            bind:value={searchQuery}
            onkeydown={handleSearchKey}
          />
          {#if isSearching}
            <div class="search-spinner"></div>
          {/if}
          {#if searchQuery}
            <button class="clear-input-btn" onclick={() => searchQuery = ""} aria-label="Clear query">
              <X size={16} />
            </button>
          {/if}
        </div>

        <button class="cancel-modal-btn" onclick={closeSearch}>
          Cancel
        </button>
      </div>

      <!-- MODAL CONTENT AREA -->
      <div class="search-body-content custom-scroll">
        <!-- TRENDING / QUICK SEARCHES (WHEN INPUT IS EMPTY OR SHORT) -->
        {#if searchQuery.trim().length < 2}
          <div class="search-welcome-panel">
            <div class="panel-section-title">
              <Flame size={16} class="flame-icon" />
              <span>Trending Searches</span>
            </div>

            <div class="trending-tags-grid">
              {#each trendingSearches as tag}
                <button class="trending-tag-pill" onclick={() => quickSearch(tag)}>
                  <TrendingUp size={13} />
                  <span>{tag}</span>
                </button>
              {/each}
            </div>

            <div class="search-tips">
              <span class="tip-dot"></span>
              <span>Tip: Press <kbd>Enter</kbd> anytime to open the complete catalog view.</span>
            </div>
          </div>
        {:else if isSearching && suggestions.length === 0}
          <div class="searching-loader-state">
            <div class="search-spinner-lg"></div>
            <span>Searching WatchAnimez database...</span>
          </div>
        {:else if suggestions.length > 0}
          <div class="suggestions-container">
            <div class="suggestions-header-bar">
              <span class="header-label">Quick Suggestions</span>
              <span class="header-hint">Found {suggestions.length} top matches</span>
            </div>

            <div class="suggestions-grid">
              {#each suggestions as anime}
                <button
                  class="suggestion-card"
                  onclick={() => selectSuggestion(anime)}
                >
                  <img
                    src={getProxiedImage(anime.poster)}
                    alt={anime.title}
                    class="suggestion-poster"
                    loading="lazy"
                    decoding="async"
                    onerror={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/favicon-192.png';
                    }}
                  />
                  <div class="suggestion-details">
                    <span class="suggestion-title">{anime.title}</span>
                    {#if anime.japaneseTitle || anime.jname}
                      <span class="suggestion-jtitle">{anime.japaneseTitle || anime.jname}</span>
                    {/if}
                    <div class="suggestion-meta-row">
                      <span class="meta-pill type-pill">{anime.type || 'TV'}</span>
                      {#if anime.episodes?.sub || anime.sub}
                        <span class="meta-pill sub-pill">SUB {anime.episodes?.sub || anime.sub}</span>
                      {/if}
                      {#if anime.episodes?.dub || anime.dub}
                        <span class="meta-pill dub-pill">DUB {anime.episodes?.dub || anime.dub}</span>
                      {/if}
                      {#if anime.score || anime.rating}
                        <span class="meta-pill score-pill">⭐ {anime.score || anime.rating}</span>
                      {/if}
                    </div>
                  </div>
                </button>
              {/each}
            </div>

            <button class="view-full-results-btn" onclick={executeSearch}>
              <span>View all results for "{searchQuery}"</span>
              <span class="arrow">→</span>
            </button>
          </div>
        {:else if !isSearching && searchQuery.trim().length >= 2 && suggestions.length === 0}
          <div class="no-results-state">
            <Search size={40} class="no-results-icon" />
            <h3>No Anime Found</h3>
            <p>We couldn't find matches for "{searchQuery}". Try pressing Enter for extended search.</p>
            <button class="view-full-results-btn" onclick={executeSearch}>
              Search Catalog for "{searchQuery}"
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* --- MAIN NAVBAR STYLING --- */
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: 0.75rem 2.5rem;
    padding-top: max(0.75rem, env(safe-area-inset-top));
    padding-left: max(2.5rem, env(safe-area-inset-left));
    padding-right: max(2.5rem, env(safe-area-inset-right));
    background: linear-gradient(180deg, rgba(8, 8, 12, 0.96) 0%, rgba(8, 8, 12, 0.6) 70%, transparent 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .navbar.scrolled {
    background: rgba(10, 10, 14, 0.94);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 1rem;
    position: relative;
  }

  /* LOGO DESIGN */
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: white;
    flex-shrink: 0;
    z-index: 2;
  }

  .logo-badge {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-img {
    height: 34px;
    width: 34px;
    object-fit: cover;
    border-radius: 9px;
    box-shadow: 0 0 14px rgba(229, 9, 20, 0.5);
    transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    z-index: 2;
    display: block;
    overflow: hidden;
  }

  .logo-glow {
    position: absolute;
    inset: -2px;
    background: radial-gradient(circle, rgba(229, 9, 20, 0.6) 0%, transparent 70%);
    border-radius: 12px;
    filter: blur(4px);
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }

  .logo:hover .logo-img {
    transform: scale(1.08) rotate(-3deg);
  }

  .logo:hover .logo-glow {
    opacity: 1;
  }

  .logo-text-wrapper {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .logo-text {
    font-size: 1.35rem;
    font-weight: 900;
    letter-spacing: -0.03em;
  }

  .logo-accent {
    color: var(--net-red, #e50914);
    text-shadow: 0 0 15px rgba(229, 9, 20, 0.6);
  }

  .logo-subtag {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 2px;
  }

  /* NAV LINKS */
  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
  }

  .nav-link {
    position: relative;
    color: rgba(255, 255, 255, 0.72);
    font-weight: 600;
    font-size: 0.92rem;
    transition: color 0.2s ease;
    text-decoration: none;
    padding: 0.4rem 0;
    white-space: nowrap;
  }

  .nav-link::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--net-red, #e50914);
    border-radius: 2px;
    box-shadow: 0 0 10px rgba(229, 9, 20, 0.8);
    transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-link:hover, .nav-link.active {
    color: #ffffff;
  }

  .nav-link.active::after, .nav-link:hover::after {
    width: 100%;
  }

  /* ACTIONS & BUTTONS */
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: auto;
    z-index: 2;
  }

  .search-bar-trigger {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 0.45rem 0.9rem;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .search-bar-trigger:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(229, 9, 20, 0.5);
    color: white;
    box-shadow: 0 0 15px rgba(229, 9, 20, 0.2);
  }

  .search-trigger-text {
    font-weight: 500;
  }

  .search-shortcut {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 0.1rem 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.7);
  }

  .nav-icon-btn {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .nav-icon-btn:hover {
    color: #ffffff;
    background: rgba(229, 9, 20, 0.15);
    border-color: rgba(229, 9, 20, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.25);
  }

  .heart-btn:hover {
    color: #ff69b4;
    background: rgba(255, 105, 180, 0.15);
    border-color: rgba(255, 105, 180, 0.4);
    box-shadow: 0 4px 15px rgba(255, 105, 180, 0.25);
  }

  /* USER PROFILE DROPDOWN */
  .user-profile {
    position: relative;
  }

  .profile-trigger {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    border: 1.5px solid rgba(255, 255, 255, 0.18);
    padding: 0;
    background: #1a1a1c;
    transition: all 0.2s ease;
  }

  .profile-trigger:hover {
    border-color: var(--net-red, #e50914);
    transform: translateY(-1px);
    box-shadow: 0 0 15px rgba(229, 9, 20, 0.4);
  }

  .profile-trigger img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 244px;
    background: rgba(14, 14, 18, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 0.6rem;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px) scale(0.98);
    transform-origin: top right;
    transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s;
    z-index: 1200;
  }

  .user-profile.open .profile-dropdown {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem;
  }

  .ui-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex: none;
    background: #1a1a1c;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .ui-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .user-name {
    font-size: 0.9rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-dropdown hr {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0.4rem 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
    background: none;
    border: none;
    border-radius: 10px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }

  .dropdown-item:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }

  .dropdown-item.accent {
    color: var(--net-red, #e50914);
  }

  .dropdown-item.logout:hover {
    color: #ff4a4a;
    background: rgba(229, 9, 20, 0.12);
  }

  /* MOBILE HAMBURGER DRAWER */
  .mobile-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(12, 12, 16, 0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    animation: slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .mobile-links-grid {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .mobile-link {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    color: rgba(255, 255, 255, 0.75);
    text-decoration: none;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .mobile-link:hover, .mobile-link.active {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }

  .donate-mobile-link {
    color: #ff69b4;
    font-weight: 700;
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
    background: rgba(255, 255, 255, 0.04);
    padding: 1rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .mobile-user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .mobile-profile-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.15);
  }

  .mobile-profile-details {
    display: flex;
    flex-direction: column;
  }

  .mobile-profile-name {
    font-weight: 700;
    color: white;
    font-size: 0.95rem;
  }

  .mobile-profile-email {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
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

  /* --- FULL-SCREEN OVERLAY SEARCH MODAL --- */
  .search-backdrop {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(4, 4, 8, 0.82);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 1.5rem 1rem;
    padding-top: max(1.5rem, env(safe-area-inset-top));
    animation: fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInModal {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(20px);
    }
  }

  .search-modal {
    width: 100%;
    max-width: 680px;
    background: rgba(14, 14, 20, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85), 0 0 40px rgba(229, 9, 20, 0.15);
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 3rem);
    max-height: calc(100dvh - 3rem);
    animation: scaleUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes scaleUpModal {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .search-top-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    background: rgba(20, 20, 28, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .icon-action-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: none;
    transition: all 0.15s ease;
  }

  .icon-action-btn:hover {
    background: rgba(229, 9, 20, 0.2);
    border-color: rgba(229, 9, 20, 0.4);
    color: #ff4757;
  }

  .search-input-box {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex: 1;
    background: rgba(10, 10, 14, 0.95);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    padding: 0.5rem 0.9rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .search-input-box:focus-within {
    border-color: var(--net-red, #e50914);
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.3);
  }

  .search-input-box input {
    width: 100%;
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    font-weight: 500;
    outline: none;
  }

  .search-input-box input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .input-search-icon {
    color: rgba(255, 255, 255, 0.45);
    flex: none;
  }

  .clear-input-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem;
    border-radius: 50%;
    transition: color 0.15s ease;
  }

  .clear-input-btn:hover {
    color: white;
  }

  .cancel-modal-btn {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.5rem 0.9rem;
    border-radius: 10px;
    cursor: pointer;
    flex: none;
    transition: all 0.15s ease;
  }

  .cancel-modal-btn:hover {
    background: rgba(229, 9, 20, 0.2);
    color: #ff4757;
    border-color: rgba(229, 9, 20, 0.4);
  }

  .search-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--net-red, #e50914);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex: none;
  }

  /* MODAL BODY CONTENT */
  .search-body-content {
    padding: 1.25rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .custom-scroll::-webkit-scrollbar {
    width: 5px;
  }
  .custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  /* TRENDING SECTION */
  .search-welcome-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #ff4757;
  }

  .flame-icon {
    color: #ff4757;
  }

  .trending-tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .trending-tag-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 0.45rem 0.85rem;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .trending-tag-pill:hover {
    background: rgba(229, 9, 20, 0.18);
    border-color: rgba(229, 9, 20, 0.5);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(229, 9, 20, 0.25);
  }

  .search-tips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 0.5rem;
  }

  .tip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--net-red, #e50914);
    box-shadow: 0 0 8px var(--net-red, #e50914);
  }

  .search-tips kbd {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 0.1rem 0.35rem;
    font-size: 0.72rem;
    color: white;
  }

  /* SUGGESTIONS LIST */
  .suggestions-container {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .suggestions-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .header-label {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--net-red, #e50914);
  }

  .header-hint {
    color: rgba(255, 255, 255, 0.45);
  }

  .suggestions-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suggestion-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    color: white;
    transition: all 0.2s ease;
  }

  .suggestion-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(229, 9, 20, 0.4);
    transform: translateX(4px);
  }

  .suggestion-poster {
    width: 46px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    flex: none;
    background: #1a1a20;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .suggestion-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    flex: 1;
  }

  .suggestion-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .suggestion-jtitle {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.45);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .suggestion-meta-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
    margin-top: 0.1rem;
  }

  .meta-pill {
    font-size: 0.68rem;
    font-weight: 700;
    padding: 0.15rem 0.45rem;
    border-radius: 5px;
    text-transform: uppercase;
  }

  .type-pill {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);
  }

  .sub-pill {
    background: rgba(229, 9, 20, 0.18);
    color: #ff4757;
    border: 1px solid rgba(229, 9, 20, 0.35);
  }

  .dub-pill {
    background: rgba(59, 130, 246, 0.18);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.35);
  }

  .score-pill {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .view-full-results-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    margin-top: 0.5rem;
    background: linear-gradient(135deg, rgba(229, 9, 20, 0.2) 0%, rgba(180, 5, 12, 0.3) 100%);
    border: 1px solid rgba(229, 9, 20, 0.4);
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-full-results-btn:hover {
    background: var(--net-red, #e50914);
    box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
    transform: translateY(-1px);
  }

  .view-full-results-btn .arrow {
    transition: transform 0.2s ease;
  }

  .view-full-results-btn:hover .arrow {
    transform: translateX(4px);
  }

  /* STATES */
  .searching-loader-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.85rem;
    padding: 3rem 1rem;
    color: rgba(255, 255, 255, 0.65);
    font-size: 0.92rem;
  }

  .search-spinner-lg {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.12);
    border-top-color: var(--net-red, #e50914);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  .no-results-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.65rem;
    padding: 2.5rem 1rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .no-results-icon {
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 0.5rem;
  }

  .no-results-state h3 {
    color: white;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .no-results-state p {
    font-size: 0.85rem;
    max-width: 360px;
    color: rgba(255, 255, 255, 0.45);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* MEDIA QUERIES */
  @media (max-width: 1024px) {
    .hide-mobile { display: none !important; }
    .navbar {
      padding: 0.65rem 1rem;
      padding-top: max(0.65rem, env(safe-area-inset-top));
      padding-left: max(1rem, env(safe-area-inset-left));
      padding-right: max(1rem, env(safe-area-inset-right));
    }
    /* On mobile, remove absolute centering since nav-links are hidden */
    .nav-links {
      position: static;
      transform: none;
    }
    /* On mobile: logo left, actions right */
    .nav-inner {
      justify-content: space-between;
    }
    .nav-actions {
      margin-left: auto;
    }
    .search-modal {
      height: 100%;
      max-height: none;
      border-radius: 0;
      border: none;
    }
    .search-backdrop {
      padding: 0;
    }
  }

  @media (min-width: 1025px) {
    .hide-desktop { display: none !important; }
    .user-profile:hover .profile-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }

  /* Tablet: slightly tighter spacing */
  @media (max-width: 1200px) and (min-width: 1025px) {
    .nav-links {
      gap: 1rem;
    }
    .nav-link {
      font-size: 0.85rem;
    }
    .search-bar-trigger {
      padding: 0.4rem 0.7rem;
      font-size: 0.8rem;
    }
    .search-trigger-text {
      display: none;
    }
    .search-shortcut {
      display: none;
    }
  }
</style>
