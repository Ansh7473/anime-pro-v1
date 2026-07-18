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
    Flame,
  } from 'lucide-svelte';
  import { auth, logoutUser } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { isTV } from "$lib/stores/device";
    // NOTE: searchEngine is intentionally NOT statically imported.
    // It pulls in the 4-layer fuzzy ranker and is heavy. Lazy-load it
    // only when the user actually types into the search box so the
    // initial route transition isn't blocked by it.

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
  let isMac = $state(false);

  // Primary browse links live in the home quick-rail + bottom nav —
  // top bar keeps logo, search, and account only.
  function isNavActive(href: string) {
    if (href === "/") return page.url.pathname === "/";
    return page.url.pathname === href || page.url.pathname.startsWith(href + "/");
  }

  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

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
  let searchReqId = 0;
  $effect(() => {
    if (searchQuery.trim().length < 2) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    const reqId = ++searchReqId;
      const timer = setTimeout(async () => {
        isSearching = true;
        try {
          // Lazy-load the search engine only when the user actually types.
          // This keeps the heavy fuzzy ranker out of the initial bundle
          // so navigation isn't blocked by it.
          const { expandAlias, searchAndRankAnime } = await import("$lib/searchEngine");
          // Expand abbreviations ("aot" → "attack on titan") before hitting the API,
          // then re-rank results with the 4-layer fuzzy engine so the most relevant
          // titles surface first — not just the most popular.
          const expanded = expandAlias(searchQuery.trim());
          const res = await api.search(expanded);
          // Ignore stale results from a cancelled/older debounce cycle
          if (reqId !== searchReqId) return;
          const ranked = searchAndRankAnime(searchQuery.trim(), res?.data || []);
          suggestions = ranked.slice(0, 6);
          showSuggestions = true;
        } catch (err) {
          if (reqId === searchReqId) console.error("Search error:", err);
          if (reqId === searchReqId) suggestions = [];
        } finally {
          if (reqId === searchReqId) isSearching = false;
        }
      }, 400);

    return () => clearTimeout(timer);
  });

  onMount(() => {
    isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform) || navigator.userAgent.includes('Mac');
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
      if (e.key === "Escape" && mobileMenuOpen) {
        mobileMenuOpen = false;
      }
    };
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleGlobalKeyDown);
      document.body.style.overflow = "";
    };
  });
</script>

<svelte:window onscroll={handleScroll} />

<nav class="navbar" class:scrolled>
  <div class="nav-inner">
    <!-- WatchAnimeX brand -->
    <a href="/" class="logo" aria-label="WatchAnimeX home" onclick={() => { closeSearch(); mobileMenuOpen = false; }}>
      <div class="logo-badge" aria-hidden="true">
        <svg viewBox="0 0 40 40" class="logo-mark">
          <rect x="1" y="1" width="38" height="38" rx="11" />
          <path d="M10 9h8l4 6.2L26 9h8l-8 11 9 11h-8l-5-6.5-5 6.5H9l9-11z" />
        </svg>
      </div>
      <div class="logo-text-wrapper">
        <span class="logo-text">WatchAnime<span class="logo-accent">X</span></span>
      </div>
    </a>

    <!-- Center pill search (Miruro-style) -->
    <button
      type="button"
      class="nav-search-pill hide-mobile"
      onclick={toggleSearch}
      aria-label="Search Anime"
    >
      <Search size={16} class="nav-search-pill-icon" />
      <span class="nav-search-pill-text">Search Anime</span>
      <kbd class="nav-search-pill-kbd">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
    </button>

    <!-- ACTION BUTTONS -->
    <div class="nav-actions">
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
        class:menu-open={mobileMenuOpen}
        onclick={() => {
          mobileMenuOpen = !mobileMenuOpen;
          if (mobileMenuOpen) searchOpen = false;
        }}
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-nav-menu"
      >
        {#if mobileMenuOpen}<X size={22} />{:else}☰{/if}
      </button>
    </div>
  </div>

  <!-- MOBILE HAMBURGER DRAWER -->
  {#if mobileMenuOpen}
    <button
      type="button"
      class="mobile-menu-backdrop"
      aria-label="Close menu"
      onclick={closeMobileMenu}
    ></button>

    <div
      id="mobile-nav-menu"
      class="mobile-menu"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div class="mobile-menu-scroll">
        <p class="mobile-section-label">Apps & support</p>
        <div class="mobile-action-row">
          <a
            href="/download"
            class="mobile-action-chip download-chip"
            class:active={isNavActive("/download")}
            onclick={closeMobileMenu}
          >
            <Download size={17} />
            <span>Download Apps</span>
          </a>
          <a
            href="/donate"
            class="mobile-action-chip donate-chip"
            class:active={isNavActive("/donate")}
            onclick={closeMobileMenu}
          >
            <Heart size={17} fill="currentColor" />
            <span>Donate</span>
          </a>
        </div>

        <p class="mobile-section-label">Account</p>
        {#if $auth.user}
          <div class="mobile-profile-section">
            <div class="mobile-user-info">
              <img
                src={getProxiedImage(
                  $auth.currentProfile?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || "guest"}`,
                )}
                alt=""
                class="mobile-profile-avatar"
              />
              <div class="mobile-profile-details">
                <span class="mobile-profile-name">{$auth.currentProfile?.name || "User"}</span>
                <span class="mobile-profile-email">{$auth.user.email}</span>
              </div>
            </div>
            <div class="mobile-account-grid">
              <a href="/profile" class="mobile-account-btn" onclick={closeMobileMenu}>
                <User size={16} /> Profile
              </a>
              <a href="/watchlist" class="mobile-account-btn" onclick={closeMobileMenu}>
                <Bookmark size={16} /> Watchlist
              </a>
              <a href="/favorites" class="mobile-account-btn" onclick={closeMobileMenu}>
                <Heart size={16} /> Favorites
              </a>
              <button
                type="button"
                class="mobile-account-btn"
                onclick={() => {
                  isTV.set(true);
                  document.body.classList.add("tv-mode");
                  closeMobileMenu();
                }}
              >
                <Tv size={16} /> TV Mode
              </button>
            </div>
            <button
              type="button"
              class="mobile-logout-btn"
              onclick={() => {
                closeMobileMenu();
                logoutUser();
                goto("/");
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        {:else}
          <div class="mobile-profile-section">
            <div class="mobile-user-info">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=guest&backgroundColor=b6e3f4"
                alt=""
                class="mobile-profile-avatar"
              />
              <div class="mobile-profile-details">
                <span class="mobile-profile-name">Guest User</span>
                <span class="mobile-profile-email">Sign in to save progress</span>
              </div>
            </div>
            <div class="mobile-account-grid">
              <a href="/auth/login" class="mobile-account-btn" onclick={closeMobileMenu}>
                <LogIn size={16} /> Login
              </a>
              <a href="/auth/register" class="mobile-account-btn accent" onclick={closeMobileMenu}>
                <UserPlus size={16} /> Sign Up
              </a>
              <button
                type="button"
                class="mobile-account-btn full-span"
                onclick={() => {
                  isTV.set(true);
                  document.body.classList.add("tv-mode");
                  closeMobileMenu();
                }}
              >
                <Tv size={16} /> TV Mode Hub
              </button>
            </div>
          </div>
        {/if}
      </div>
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
            <span>Searching WatchAnimeX database...</span>
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
    padding: 0.75rem var(--page-gutter, 2.5rem);
    padding-top: max(0.75rem, env(safe-area-inset-top));
    padding-left: max(var(--page-gutter, 2.5rem), env(safe-area-inset-left));
    padding-right: max(var(--page-gutter, 2.5rem), env(safe-area-inset-right));
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.72) 70%, transparent 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .navbar.scrolled {
    background: rgba(0, 0, 0, 0.94);
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
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 8px 18px rgba(255, 116, 77, 0.18));
  }

  .logo-mark {
    width: 38px;
    height: 38px;
    display: block;
  }
  .logo-mark rect {
    fill: #111117;
    stroke: rgba(255, 255, 255, 0.14);
    stroke-width: 1.5;
  }
  .logo-mark path {
    fill: #ff8057;
  }

  .logo-text-wrapper {
    display: flex;
    align-items: center;
    line-height: 1;
  }

  .logo-text {
    color: #f7f5f2;
    font-family: var(--net-display-font, "Outfit", system-ui, sans-serif);
    font-size: 1.28rem;
    font-weight: 800;
    letter-spacing: -0.045em;
  }

  .logo-accent {
    color: #ff8057;
  }

  /* ACTIONS — logo left, tools right (browse lives under hero / bottom nav) */
  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: auto;
    z-index: 2;
  }

  .nav-search-pill {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex: 1 1 auto;
    max-width: 460px;
    min-width: 220px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    padding: 0.55rem 1rem;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    font-size: 0.88rem;
    transition: all 0.2s ease;
  }
  .nav-search-pill:hover {
    background: rgba(255, 138, 61, 0.08);
    border-color: rgba(255, 138, 61, 0.35);
    color: rgba(255, 255, 255, 0.95);
  }
  .nav-search-pill-icon { flex-shrink: 0; opacity: 0.8; }
  .nav-search-pill-text {
    flex: 1;
    text-align: left;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nav-search-pill-kbd {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 0.12rem 0.4rem;
    font-size: 0.68rem;
    font-weight: 600;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.55);
  }

  /* legacy class kept for any residual refs */
  .search-bar-trigger { display: none; }
  .search-trigger-text { font-weight: 500; }
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
    border-color: var(--net-red, #FF8A3D);
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
    color: var(--net-red, #FF8A3D);
  }

  .dropdown-item.logout:hover {
    color: #ff4a4a;
    background: rgba(229, 9, 20, 0.12);
  }

  /* MOBILE HAMBURGER DRAWER */
  .hamburger.menu-open {
    color: #fff;
    background: rgba(255, 138, 61, 0.22);
    border-color: rgba(229, 9, 20, 0.45);
  }

  /*
    Backdrop is absolute (not fixed) because navbar uses backdrop-filter,
    which creates a containing block and breaks viewport-fixed overlays.
  */
  .mobile-menu-backdrop {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    height: 100dvh;
    z-index: 998;
    border: none;
    padding: 0;
    margin: 0;
    background: rgba(0, 0, 0, 0.58);
    animation: menuFadeIn 0.18s ease forwards;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 999;
    background: rgba(10, 10, 14, 0.98);
    backdrop-filter: blur(28px) saturate(140%);
    -webkit-backdrop-filter: blur(28px) saturate(140%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.75);
    animation: slideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    /* Leave room for top bar + bottom tab bar on phones */
    max-height: min(
      78dvh,
      calc(100dvh - 56px - env(safe-area-inset-top, 0px) - 72px - env(safe-area-inset-bottom, 0px))
    );
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .mobile-menu-scroll {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 0.85rem 0.85rem calc(1rem + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  @keyframes menuFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
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

  .mobile-section-label {
    margin: 0.35rem 0.15rem 0.1rem;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.42);
  }

  .mobile-section-label:first-child {
    margin-top: 0;
  }

  /* Download + Donate chips side by side */
  .mobile-action-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .mobile-action-chip {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 48px;
    min-width: 0;
    padding: 0.65rem 0.7rem;
    border-radius: 12px;
    font-size: 0.84rem;
    font-weight: 700;
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-action-chip span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-action-chip:active {
    transform: scale(0.98);
  }

  .download-chip {
    color: #7dd3fc;
    background: rgba(56, 189, 248, 0.1);
    border-color: rgba(56, 189, 248, 0.28);
  }

  .download-chip.active {
    background: rgba(56, 189, 248, 0.2);
    border-color: rgba(125, 211, 252, 0.55);
  }

  .donate-chip {
    color: #ff8cc8;
    background: rgba(255, 105, 180, 0.1);
    border-color: rgba(255, 105, 180, 0.28);
  }

  .donate-chip.active {
    background: rgba(255, 105, 180, 0.2);
    border-color: rgba(255, 140, 200, 0.55);
  }

  /* Account card */
  .mobile-profile-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.035);
    padding: 0.85rem;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .mobile-user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .mobile-profile-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: #1a1a1c;
    border: 2px solid rgba(255, 255, 255, 0.14);
  }

  .mobile-profile-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .mobile-profile-name {
    font-weight: 700;
    color: white;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-profile-email {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mobile-account-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .mobile-account-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 44px;
    min-width: 0;
    padding: 0.55rem 0.5rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.88);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-account-btn:active {
    transform: scale(0.98);
  }

  .mobile-account-btn.accent {
    color: #fff;
    background: rgba(255, 138, 61, 0.22);
    border-color: rgba(229, 9, 20, 0.4);
  }

  .mobile-account-btn.full-span {
    grid-column: 1 / -1;
  }

  .mobile-logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    width: 100%;
    min-height: 44px;
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    background: rgba(229, 9, 20, 0.08);
    border: 1px solid rgba(229, 9, 20, 0.22);
    color: #ff6b6b;
    font-size: 0.85rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition:
      background 0.15s ease,
      transform 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-logout-btn:active {
    transform: scale(0.98);
    background: rgba(229, 9, 20, 0.16);
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
    background: rgba(255, 138, 61, 0.22);
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
    border-color: var(--net-red, #FF8A3D);
    box-shadow: 0 0 20px rgba(255, 138, 61, 0.3);
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
    background: rgba(255, 138, 61, 0.22);
    color: #ff4757;
    border-color: rgba(229, 9, 20, 0.4);
  }

  .search-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: var(--net-red, #FF8A3D);
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
    border-color: rgba(255, 138, 61, 0.5);
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
    background: linear-gradient(135deg, #FACC15, #F59E0B);
    box-shadow: 0 0 8px var(--net-red, #FF8A3D);
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
    color: var(--net-red, #FF8A3D);
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
    background: rgba(250, 204, 21, 0.22);
    color: #60a5fa;
    border: 1px solid rgba(245, 158, 11, 0.35);
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
    background: linear-gradient(135deg, rgba(255, 138, 61, 0.22) 0%, rgba(180, 5, 12, 0.3) 100%);
    border: 1px solid rgba(229, 9, 20, 0.4);
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-full-results-btn:hover {
    background: linear-gradient(135deg, #FACC15, #F59E0B);
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
    border-top-color: var(--net-red, #FF8A3D);
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
    .hide-mobile {
      display: none !important;
    }
    .navbar {
      padding: 0.55rem 0.85rem;
      padding-top: max(0.55rem, env(safe-area-inset-top));
      padding-left: max(0.85rem, env(safe-area-inset-left));
      padding-right: max(0.85rem, env(safe-area-inset-right));
    }
    .nav-inner {
      justify-content: space-between;
      gap: 0.5rem;
      min-height: 44px;
    }
    .nav-actions {
      margin-left: auto;
      gap: 0.35rem;
    }
    .nav-icon-btn {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
    }
    .logo {
      gap: 0.55rem;
      min-width: 0;
    }
    .logo-badge {
      width: 30px;
      height: 30px;
    }
    .logo-mark {
      width: 30px;
      height: 30px;
    }
    .logo-text {
      font-size: 1.15rem;
    }
    .logo-text-wrapper {
      min-width: 0;
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

  @media (max-width: 480px) {
    .navbar {
      padding: 0.5rem 0.7rem;
      padding-top: max(0.5rem, env(safe-area-inset-top));
      padding-left: max(0.7rem, env(safe-area-inset-left));
      padding-right: max(0.7rem, env(safe-area-inset-right));
    }
    .logo-text {
      font-size: 1.05rem;
    }
    .mobile-menu-scroll {
      padding-inline: 0.7rem;
    }
    .mobile-action-chip {
      font-size: 0.8rem;
      padding: 0.6rem 0.55rem;
    }
    .mobile-account-btn {
      font-size: 0.76rem;
      gap: 0.3rem;
      padding: 0.5rem 0.4rem;
    }
  }

  @media (max-width: 360px) {
    .mobile-action-row,
    .mobile-account-grid {
      gap: 0.35rem;
    }
    .mobile-action-chip span {
      font-size: 0.76rem;
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

  /* Tablet / smaller desktop: compact search trigger */
  @media (max-width: 1200px) and (min-width: 1025px) {
    .search-bar-trigger {
      padding: 0.4rem 0.7rem;
      font-size: 0.8rem;
    }
    .search-trigger-text { display: none; }
    .search-shortcut { display: none; }
  }

  /* Editorial masthead */
  .navbar { padding-left:0;padding-right:0;background:rgba(7,7,6,.96);backdrop-filter:none;border-bottom:1px solid var(--editorial-line,#28231f);box-shadow:none;transition:background .15s; }
  .navbar.scrolled { background:#070706;backdrop-filter:none;border-bottom-color:#332c27;box-shadow:none; }
  .nav-inner { max-width:none;margin-inline:auto;padding-left:max(var(--page-gutter,2.5rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter,2.5rem),env(safe-area-inset-right)); }
  .logo-text{color:var(--editorial-text,#f1ece4);letter-spacing:-.035em}.logo-accent{color:var(--editorial-accent,#df886b)}.logo-subtag{color:#6f6861;letter-spacing:.14em}
  .nav-search-pill { border-radius:3px;background:var(--editorial-surface,#0d0c0b);border-color:var(--editorial-line,#28231f);box-shadow:none; }
  .nav-search-pill:hover { background:var(--editorial-surface-raised,#151210);border-color:#4b3d35;transform:none;box-shadow:none; }
  .nav-icon-btn,.profile-trigger { border-radius:3px;background:transparent;border-color:transparent;box-shadow:none; }
  .nav-icon-btn:hover,.profile-trigger:hover { transform:none;background:var(--editorial-surface-raised,#151210);border-color:var(--editorial-line,#28231f);box-shadow:none; }
  .profile-dropdown,.search-modal { border-radius:4px;background:#0d0c0b!important;border:1px solid var(--editorial-line,#28231f)!important;box-shadow:none; }
  .search-backdrop { background:rgba(3,3,3,.9);backdrop-filter:none; }.search-input-box{border-radius:3px;background:#151210;border-color:#332c27}.trending-tag-pill,.meta-pill,.view-full-results-btn{border-radius:3px}.suggestion-card{border-radius:3px;background:transparent;border-bottom:1px solid #28231f}.suggestion-card:hover{transform:none;background:#151210;box-shadow:none}.suggestion-poster{border-radius:3px}
  .mobile-menu{background:#090807;border-left:1px solid #28231f}.mobile-action-chip,.mobile-account-btn{border-radius:3px}
  @media(max-width:1024px){.navbar{padding-left:0;padding-right:0}.nav-inner{padding-left:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-right))}}
  @media(max-width:640px){.nav-inner{padding-left:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-right))}}
</style>
