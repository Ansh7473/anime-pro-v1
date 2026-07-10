<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth, switchProfile, logoutUser } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { themeState } from '$lib/stores/theme';
  import PasswordModal from "$lib/components/PasswordModal.svelte";
  import CreateProfileModal from "$lib/components/CreateProfileModal.svelte";
  import {
    User,
    UserPlus,
    Settings,
    Trash2,
    Camera,
    Check,
    X,
    AlertCircle,
    Key,
    Palette,
    LogOut,
    ChevronRight
  } from "lucide-svelte";

  let loading = $state(true);
  let error = $state("");
  let success = $state("");

  // Modals state
  let showPasswordModal = $state(false);
  let showProfileModal = $state(false);
  let showPreferencesModal = $state(false);

  // Form states
  let passwordForm = $state({ current: "", new: "", confirm: "" });
  let profileForm = $state({ name: "", avatar: "" });
  let processing = $state(false);

  // Avatar presets
  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bubba",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Cleo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  ];

  // --- Theme picker ---
  // Keys mirror the .theme-* classes defined in src/lib/styles/themes.css
  const THEME_KEYS = [
    "minimalist", "classic-red", "deep-crimson", "blood-moon",
    "obsidian", "midnight", "abyss", "void",
    "emerald", "forest", "lichen", "oasis",
    "cyberpunk", "neon-pulse", "matrix", "retrowave",
    "slate", "royal", "ruby", "amber", "violet", "arctic", "rose", "gold",
    "ocean", "lava", "mint", "coral", "sky", "sand", "storm", "clay",
    "ink", "serene", "dracula", "nord", "monokai", "gruvbox", "solarized",
    "autumn", "spring", "winter", "summer", "platinum", "titanium",
    "copper", "bronze", "pearl", "onyx", "quartz", "amethyst", "topaz",
    "sapphire", "peridot", "garnet", "citrine", "opal", "turquoise",
    "malachite", "moonstone", "tanzanite", "crimson-vivid", "nebula",
    "phosphor", "cyber-orange", "dracula-soft", "mocha", "macchiato",
    "frappe", "latte", "sakura", "zen", "void-walker", "stellar",
    "phantom", "ghoul", "titan",
  ];

  let swatches = $state<Record<string, { bg: string; accent: string }>>({});

  function themeName(key: string) {
    return key.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // Read each theme's --net-bg / --net-red from the loaded stylesheet via a hidden probe,
  // so swatches stay in sync with themes.css without hardcoding colours.
  function computeSwatches() {
    if (typeof document === "undefined") return;
    const probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const map: Record<string, { bg: string; accent: string }> = {};
    for (const key of THEME_KEYS) {
      probe.className = `theme-${key}`;
      const cs = getComputedStyle(probe);
      map[key] = {
        bg: cs.getPropertyValue("--net-bg").trim() || "#0a0a0a",
        accent: cs.getPropertyValue("--net-red").trim() || "#e50914",
      };
    }
    document.body.removeChild(probe);
    swatches = map;
  }

  function setTheme(key: string) {
    themeState.update((s) => ({ ...s, current: key }));
    success = `Theme set to ${themeName(key)}`;
  }

  function toggleGradients() {
    themeState.update((s) => ({ ...s, gradients: !s.gradients }));
  }

  onMount(async () => {
    computeSwatches();
    if (!$auth.token) {
      goto("/auth/login?redirect=/profile");
      return;
    }
    try {
      const userData = await api.getCurrentUser($auth.token);
      auth.update((state) => ({ ...state, user: userData }));
    } catch (e) {
      console.error(e);
    }
    loading = false;
  });

  // Favorites
  let favorites: any[] = $state([]);
  let loadingFavs = $state(false);

  $effect(() => {
    if ($auth.token && $auth.currentProfile?.id) {
      fetchFavorites();
    }
  });

  async function fetchFavorites() {
    loadingFavs = true;
    try {
      favorites = await api.getFavorites($auth.token!, $auth.currentProfile?.id);
    } catch (e) {
      console.error("Failed to fetch favorites:", e);
    } finally {
      loadingFavs = false;
    }
  }

  function handleLogout() {
    logoutUser();
    goto("/");
  }

  async function handlePasswordChange() {
    if (passwordForm.new !== passwordForm.confirm) {
      error = "Passwords don't match";
      return;
    }
    processing = true;
    error = "";
    try {
      await api.changePassword($auth.token!, {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
      });
      success = "Password updated successfully!";
      showPasswordModal = false;
      passwordForm = { current: "", new: "", confirm: "" };
    } catch (e: any) {
      error = e.message || "Failed to change password";
    } finally {
      processing = false;
    }
  }

  async function handleCreateProfile() {
    if (!profileForm.name) return;
    processing = true;
    error = "";
    try {
      const newProfile = await api.createProfile($auth.token!, profileForm);
      auth.update((state) => ({
        ...state,
        user: state.user
          ? { ...state.user, profiles: [...(state.user.profiles || []), newProfile] }
          : null,
      }));
      showProfileModal = false;
      profileForm = { name: "", avatar: "" };
      success = "Profile created successfully!";
    } catch (e: any) {
      error = e.message || "Failed to create profile";
    } finally {
      processing = false;
    }
  }

  async function deleteProfile(id: number) {
    if ($auth.user?.profiles.length === 1) {
      error = "You cannot delete your only profile.";
      return;
    }
    if (!confirm("Are you sure you want to delete this profile? All watch history will be lost.")) return;

    try {
      await api.deleteProfile($auth.token!, id);
      auth.update((state) => ({
        ...state,
        user: state.user
          ? { ...state.user, profiles: state.user.profiles.filter((p) => p.id !== id) }
          : null,
        currentProfile:
          state.currentProfile?.id?.toString() === id.toString()
            ? state.user?.profiles.find((p) => p.id?.toString() !== id.toString())
            : state.currentProfile,
      }));
      success = "Profile deleted.";
    } catch (e: any) {
      error = e.message || "Failed to delete profile";
    }
  }

  async function updatePref(key: string, value: any) {
    if (!$auth.currentProfile) return;
    try {
      const updated = await api.updateProfile($auth.token!, $auth.currentProfile.id, { [key]: value });
      auth.update((state) => ({
        ...state,
        currentProfile: updated,
        user: state.user
          ? { ...state.user, profiles: state.user.profiles.map((p) => p.id === updated.id ? updated : p) }
          : null,
      }));
    } catch (e) {
      console.error("Failed to update preference:", e);
    }
  }

  function formatDate(dateStr: string | undefined) {
    if (!dateStr) return "Member";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function closeModals() {
    showPasswordModal = false;
    showProfileModal = false;
    showPreferencesModal = false;
    error = "";
  }
</script>

<svelte:head>
  <title>My Profile — WatchAnimez</title>
  <meta name="description" content="Manage your WatchAnimez profiles, preferences, security settings, and view your favorite anime." />
  <meta property="og:title" content="My Profile — WatchAnimez" />
  <meta property="og:description" content="Manage your WatchAnimez profiles, preferences, security settings, and view your favorite anime." />
</svelte:head>

{#if loading}
  <div class="profile-page container">
    <div class="pf-sk pf-sk-header shimmer"></div>
    <div class="pf-sk pf-sk-card shimmer"></div>
    <div class="pf-sk pf-sk-section shimmer"></div>
    <div class="pf-sk pf-sk-section shimmer"></div>
  </div>
{:else}
  <div class="profile-page container">
    <!-- Header -->
    <div class="page-header">
      <div class="header-top">
        <div>
          <h1 class="page-title">Account Settings</h1>
          <p class="page-subtitle">Manage your profiles, preferences, and security</p>
        </div>
        <div class="header-badge">
          <User size={16} />
          <span>Profile</span>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    {#if error}
      <div class="alert alert-error">
        <AlertCircle size={16} />
        <span>{error}</span>
        <button onclick={() => error = ""} class="alert-close"><X size={14} /></button>
      </div>
    {/if}
    {#if success}
      <div class="alert alert-success">
        <Check size={16} />
        <span>{success}</span>
        <button onclick={() => success = ""} class="alert-close"><X size={14} /></button>
      </div>
    {/if}

    <!-- User Info Card -->
    <div class="user-card">
      <div class="user-card-top">
        <div class="user-card-left">
          <div class="user-avatar">
            {($auth.currentProfile?.name || 'A')[0].toUpperCase()}
          </div>
          <div class="user-details">
            <h2 class="user-name">{$auth.currentProfile?.name || 'User'}</h2>
            <p class="user-email">{$auth.user?.email || ''}</p>
          </div>
        </div>
        <button class="btn-outline logout-btn" onclick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
      <div class="profile-stats">
        <div class="stat">
          <span class="stat-num">{$auth.user?.profiles?.length || 1}</span>
          <span class="stat-label">Profiles</span>
        </div>
        <div class="stat">
          <span class="stat-num">{favorites.length}</span>
          <span class="stat-label">Favorites</span>
        </div>
        <div class="stat">
          <span class="stat-num">{themeName($themeState.current)}</span>
          <span class="stat-label">Theme</span>
        </div>
      </div>
    </div>

    <div class="settings-grid">
      <!-- Left: Profiles -->
      <div class="settings-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title"><User size={16} /> Profiles</h2>
            <button class="btn-small" onclick={() => showProfileModal = true}>
              <UserPlus size={14} /> New Profile
            </button>
          </div>
          <div class="profiles-list">
            {#each ($auth.user?.profiles || []) as profile}
              <div class="profile-item" class:active={profile.id === $auth.currentProfile?.id}>
                <div class="profile-item-left">
                  <img
                    src={getProxiedImage(profile.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`}
                    alt=""
                    class="profile-avatar-img"
                  />
                  <div>
                    <span class="profile-item-name">{profile.name}</span>
                    {#if profile.id === $auth.currentProfile?.id}
                      <span class="active-tag">Active</span>
                    {/if}
                  </div>
                </div>
                <div class="profile-item-actions">
                  {#if profile.id !== $auth.currentProfile?.id}
                    <button class="btn-text" onclick={() => switchProfile(profile)}>Switch</button>
                  {/if}
                  <button class="btn-icon danger" onclick={() => deleteProfile(profile.id)} title="Delete profile">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </section>

        <!-- Security -->
        <section class="card">
          <h2 class="card-title"><Key size={16} /> Security</h2>
          <button class="settings-action" onclick={() => showPasswordModal = true}>
            <div class="settings-action-left">
              <Key size={18} />
              <div>
                <span class="action-label">Change Password</span>
                <span class="action-desc">Update your account password</span>
              </div>
            </div>
            <ChevronRight size={16} class="chevron" />
          </button>
        </section>
      </div>

      <!-- Right: Preferences + Favorites -->
      <div class="settings-col">
        <!-- Preferences -->
        <section class="card">
          <h2 class="card-title"><Settings size={16} /> Playback Preferences</h2>
          <div class="pref-list">
            <div class="pref-row">
              <span class="pref-label">Auto-Play Next Episode</span>
              <button
                class="toggle"
                class:on={$auth.currentProfile?.autoNext}
                onclick={() => updatePref('autoNext', !$auth.currentProfile?.autoNext)}
              >
                <div class="toggle-knob"></div>
              </button>
            </div>
            <div class="pref-row">
              <span class="pref-label">Skip Intros</span>
              <button
                class="toggle"
                class:on={$auth.currentProfile?.autoSkip}
                onclick={() => updatePref('autoSkip', !$auth.currentProfile?.autoSkip)}
              >
                <div class="toggle-knob"></div>
              </button>
            </div>
            <div class="pref-row">
              <span class="pref-label">Audio Preference</span>
              <select
                class="pref-select"
                value={$auth.currentProfile?.language || 'sub'}
                onchange={(e) => updatePref('language', (e.target as HTMLSelectElement).value)}
              >
                <option value="sub">Subtitled</option>
                <option value="dub">Dubbed</option>
                <option value="multi">Multi-Audio</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Theme -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title"><Palette size={16} /> Appearance</h2>
            <span class="theme-current">
              {themeName($themeState.current)}
            </span>
          </div>

          <div class="theme-grid">
            {#each THEME_KEYS as key}
              <button
                class="theme-swatch"
                class:active={$themeState.current === key}
                title={themeName(key)}
                aria-label={themeName(key)}
                onclick={() => setTheme(key)}
                style="--sw-bg: {swatches[key]?.bg || '#0a0a0a'}; --sw-accent: {swatches[key]?.accent || '#e50914'};"
              >
                <span class="sw-accent"></span>
                {#if $themeState.current === key}
                  <span class="sw-check"><Check size={12} /></span>
                {/if}
              </button>
            {/each}
          </div>

          <div class="pref-row theme-gradient-row">
            <span class="pref-label">Gradient accents</span>
            <button
              class="toggle"
              class:on={$themeState.gradients}
              onclick={toggleGradients}
              aria-label="Toggle gradient accents"
            >
              <div class="toggle-knob"></div>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<!-- Password Modal -->
{#if showPasswordModal}
  <PasswordModal
    {error}
    {processing}
    onClose={closeModals}
    onSubmit={(d) => { passwordForm = d; handlePasswordChange(); }}
  />
{/if}

<!-- Create Profile Modal -->
{#if showProfileModal}
  <CreateProfileModal
    {error}
    {processing}
    {avatars}
    onClose={closeModals}
    onSubmit={(d) => { profileForm = d; handleCreateProfile(); }}
  />
{/if}

<style>
  .profile-page {
    --s1: #121214;
    --s2: #0d0d0f;
    --hair: rgba(245, 245, 245, 0.08);
    --hair-2: rgba(245, 245, 245, 0.14);
    --r: 14px;
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 960px;
  }

  /* Loading */
  .pf-sk {
    border-radius: 14px;
    margin-bottom: 1.25rem;
  }
  .pf-sk-header { height: 64px; }
  .pf-sk-card { height: 160px; }
  .pf-sk-section { height: 200px; }
  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.05) 30%,
      rgba(255, 255, 255, 0.11) 50%,
      rgba(255, 255, 255, 0.05) 70%
    );
    background-size: 200% 100%;
    animation: pf-shimmer 1.4s ease-in-out infinite;
  }
  @keyframes pf-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; }
  }

  /* Page Header */
  .page-header { margin-bottom: 2rem; }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .page-title {
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.2rem;
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 0.92rem;
  }
  .header-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.4rem 1rem;
    border-radius: 50px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--net-red);
    white-space: nowrap;
  }

  /* Alerts */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    line-height: 1.4;
  }
  .alert-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  .alert-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    color: #4ade80;
  }
  .alert-close {
    margin-left: auto;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    padding: 0.25rem;
  }
  .alert-close:hover { opacity: 1; }

  /* User Card */
  .user-card {
    background: var(--s1);
    border: 1px solid var(--hair);
    border-radius: var(--r);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .user-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .logout-btn {
    flex-shrink: 0;
  }
  .user-card-left {
    display: flex;
    align-items: center;
    gap: 1.1rem;
    min-width: 0;
  }
  .user-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--net-red), #7c040a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
  }
  .user-details { min-width: 0; }
  .user-name {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.15rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .user-email {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--hair);
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    text-align: center;
  }
  .stat-num {
    font-size: 1.15rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--net-text-muted);
  }
  .stat + .stat {
    border-left: 1px solid var(--hair);
  }

  /* Settings Grid */
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .card {
    background: var(--s1);
    border: 1px solid var(--hair);
    border-radius: var(--r);
    padding: 1.35rem;
    margin-bottom: 1.25rem;
  }
  .settings-col > .card:last-child { margin-bottom: 0; }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.1rem;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .card-title :global(svg) { color: var(--net-red); flex: none; }
  .card-header .card-title { margin-bottom: 0; }

  /* Profiles List */
  .profiles-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .profile-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.85rem;
    border-radius: 10px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }
  .profile-item:hover { background: rgba(255, 255, 255, 0.03); }
  .profile-item.active {
    background: rgba(229, 9, 20, 0.06);
    border-color: rgba(229, 9, 20, 0.15);
  }
  .profile-item-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .profile-avatar-img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }
  .profile-item-name {
    font-size: 0.9rem;
    font-weight: 600;
  }
  .active-tag {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
    padding: 0.15rem 0.5rem;
    border-radius: 50px;
    margin-left: 0.5rem;
  }
  .profile-item-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Settings Action */
  .settings-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.85rem;
    border-radius: 10px;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    text-decoration: none;
    font-family: inherit;
  }
  .settings-action:hover { background: rgba(255, 255, 255, 0.04); }
  .settings-action-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--net-text-muted);
  }
  .action-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
  }
  .action-desc {
    display: block;
    font-size: 0.75rem;
    color: var(--net-text-muted);
    margin-top: 0.1rem;
  }
  .chevron { color: var(--net-text-muted); opacity: 0.5; }

  /* Preferences */
  .pref-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .pref-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  .pref-row:last-child { border-bottom: none; }
  .pref-label {
    font-size: 0.88rem;
    font-weight: 500;
  }
  .pref-select {
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: white;
    font-size: 0.82rem;
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .pref-select:focus { border-color: var(--net-red); }

  /* Toggle */
  .toggle {
    width: 42px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.12);
    border: none;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    padding: 0;
    flex-shrink: 0;
  }
  .toggle-knob {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 3px;
    left: 3px;
    transition: transform 0.2s;
  }
  .toggle.on {
    background: var(--net-red);
  }
  .toggle.on .toggle-knob {
    transform: translateX(18px);
  }

  /* Theme picker */
  .theme-current {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.3rem 0.65rem;
    border-radius: 50px;
    white-space: nowrap;
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: 0.5rem;
    max-height: 232px;
    overflow-y: auto;
    padding: 0.15rem 0.35rem 0.15rem 0.15rem;
    margin-bottom: 0.25rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .theme-grid::-webkit-scrollbar { width: 6px; }
  .theme-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
  .theme-swatch {
    position: relative;
    aspect-ratio: 1;
    border-radius: 9px;
    background: var(--sw-bg);
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    padding: 0;
    overflow: hidden;
    transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  }
  .theme-swatch:hover {
    transform: translateY(-2px) scale(1.05);
    border-color: rgba(255, 255, 255, 0.35);
  }
  .theme-swatch .sw-accent {
    position: absolute;
    right: 4px;
    bottom: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--sw-accent);
    border: 1.5px solid rgba(0, 0, 0, 0.25);
  }
  .theme-swatch.active {
    border-color: var(--sw-accent);
    box-shadow: 0 0 0 2px var(--sw-accent);
  }
  .theme-swatch .sw-check {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: rgba(0, 0, 0, 0.35);
  }
  .theme-gradient-row {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    border-bottom: none;
    margin-top: 0.5rem;
    padding-bottom: 0;
  }

  /* Buttons */
  .btn-outline {
    padding: 0.6rem 1.25rem;
    background: none;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: inherit;
  }
  .btn-outline:hover { border-color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.04); }

  .btn-small {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    color: var(--net-red);
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .btn-small:hover { background: rgba(229, 9, 20, 0.15); }

  .btn-text {
    background: none;
    border: none;
    color: var(--net-red);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    font-family: inherit;
  }
  .btn-text:hover { text-decoration: underline; }

  .btn-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--net-text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-icon:hover { background: rgba(255, 255, 255, 0.05); }
  .btn-icon.danger:hover { color: #f87171; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

  /* Responsive */
  @media (max-width: 768px) {
    .page-title { font-size: 1.5rem; }
    .header-badge { display: none; }
    .settings-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.3rem; }
    .user-card-top {
      flex-direction: column;
      align-items: stretch;
    }
    .user-card-left { gap: 0.85rem; }
    .user-avatar { width: 50px; height: 50px; font-size: 1.25rem; }
    .user-name { font-size: 1.05rem; }
    .logout-btn {
      width: 100%;
      justify-content: center;
      padding: 0.55rem 0.85rem;
      min-height: 44px;
    }
    .card { padding: 1.15rem; }
    .stat-num { font-size: 1rem; }
  }
</style>
