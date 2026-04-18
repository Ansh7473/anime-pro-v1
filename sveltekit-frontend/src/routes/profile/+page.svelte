<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth, switchProfile, logoutUser } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { themeState, type ThemeSettings } from '$lib/stores/theme';
  import {
    Shield,
    UserPlus,
    Settings,
    Trash2,
    Camera,
    Check,
    X,
    AlertCircle,
    Key,
    Blocks,
    Sparkles,
    Palette
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

  // Avatar presets (Dicebear)
  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Bubba",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Cleo",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  ];

  onMount(async () => {
    if (!$auth.token) {
      goto("/auth/login?redirect=/profile");
      return;
    }
    // Refresh user data to get latest profiles/dates
    try {
      const userData = await api.getCurrentUser($auth.token);
      auth.update((state) => ({ ...state, user: userData }));
    } catch (e) {
      console.error(e);
    }
    loading = false;
  });

  // Favorites state for current profile
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
      favorites = await api.getFavorites(
        $auth.token!,
        $auth.currentProfile?.id,
      );
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
          ? {
              ...state.user,
              profiles: [...(state.user.profiles || []), newProfile],
            }
          : null,
      }));
      showProfileModal = false;
      profileForm = { name: "", avatar: "" };
    } catch (e: any) {
      error = e.message || "Failed to create profile";
    } finally {
      processing = false;
    }
  }

  async function deleteProfile(id: number) {
    if ($auth.user?.profiles.length === 1) {
      alert("You cannot delete your only profile.");
      return;
    }
    if (
      !confirm(
        "Are you sure you want to delete this profile? All history will be lost.",
      )
    )
      return;

    try {
      await api.deleteProfile($auth.token!, id);
      auth.update((state) => ({
        ...state,
        user: state.user
          ? {
              ...state.user,
              profiles: state.user.profiles.filter((p) => p.id !== id),
            }
          : null,
        currentProfile:
          state.currentProfile?.id?.toString() === id.toString()
            ? state.user?.profiles.find((p) => p.id?.toString() !== id.toString())
            : state.currentProfile,
      }));
    } catch (e: any) {
      alert(e.message || "Failed to delete profile");
    }
  }

  async function updatePref(key: string, value: any) {
    if (!$auth.currentProfile) return;
    try {
      const updated = await api.updateProfile(
        $auth.token!,
        $auth.currentProfile.id,
        { [key]: value },
      );
      auth.update((state) => ({
        ...state,
        currentProfile: updated,
        user: state.user
          ? {
              ...state.user,
              profiles: state.user.profiles.map((p) =>
                p.id === updated.id ? updated : p,
              ),
            }
          : null,
      }));
    } catch (e) {
      console.error("Failed to update preference:", e);
    }
  }

  function formatDate(dateStr: string | undefined) {
    if (!dateStr) return "Member";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  // Theme Categories
  const themeCategories = [
    {
      name: 'Signature Series',
      themes: [
        { id: 'minimalist', name: 'Signature Red', bg: '#070708', accent: '#e50914' },
        { id: 'classic-red', name: 'Original Pro', bg: '#080808', accent: '#e50914' },
        { id: 'crimson-vivid', name: 'Vivid Crimson', bg: '#0d0000', accent: '#E60000' },
        { id: 'deep-crimson', name: 'Deep Crimson', bg: '#0a0000', accent: '#800000' },
        { id: 'blood-moon', name: 'Blood Moon', bg: '#050505', accent: '#660000' }
      ]
    },
    {
      name: 'Midnight & Shadows',
      themes: [
        { id: 'obsidian', name: 'Obsidian', bg: '#000', accent: '#fff' },
        { id: 'midnight', name: 'Midnight Blue', bg: '#0f172a', accent: '#38bdf8' },
        { id: 'abyss', name: 'Abyss', bg: '#020617', accent: '#6366f1' },
        { id: 'onyx', name: 'Onyx', bg: '#0a0a0a', accent: '#444' }
      ]
    },
    {
      name: 'Cyber & Future',
      themes: [
        { id: 'cyberpunk', name: 'Cyberpunk', bg: '#050010', accent: '#d946ef' },
        { id: 'neon-pulse', name: 'Neon Pulse', bg: '#000', accent: '#00ff9f' },
        { id: 'matrix', name: 'Matrix', bg: '#000', accent: '#00ff41' },
        { id: 'nebula', name: 'Nebula', bg: '#0d0221', accent: '#c6426e' },
        { id: 'stellar', name: 'Stellar', bg: '#050a14', accent: '#00e5ff' }
      ]
    },
    {
      name: 'Premium Blends',
      themes: [
        { id: 'dracula', name: 'Dracula', bg: '#282a36', accent: '#ff79c6' },
        { id: 'monokai', name: 'Monokai', bg: '#272822', accent: '#f92672' },
        { id: 'mocha', name: 'Mocha', bg: '#1e1e2e', accent: '#f5e0dc' },
        { id: 'macchiato', name: 'Macchiato', bg: '#24273a', accent: '#c6a0f6' },
        { id: 'frappe', name: 'Frappe', bg: '#303446', accent: '#ca9ee6' },
        { id: 'latte', name: 'Latte', bg: '#eff1f5', accent: '#8839ef' },
        { id: 'titan', name: 'Titan', bg: '#1a1b1e', accent: '#4fd1c5' },
        { id: 'storm', name: 'Storm', bg: '#14213d', accent: '#fca311' }
      ]
    },
    {
      name: 'Nature & Zen',
      themes: [
        { id: 'emerald', name: 'Emerald', bg: '#064e3b', accent: '#10b981' },
        { id: 'forest', name: 'Forest Green', bg: '#022c22', accent: '#34d399' },
        { id: 'lichen', name: 'Lichen', bg: '#1a1c1a', accent: '#90a955' },
        { id: 'sakura', name: 'Sakura Soft', bg: '#fff5f7', accent: '#ffb7c5' },
        { id: 'zen', name: 'Zen Stone', bg: '#f5f5f4', accent: '#57534e' }
      ]
    },
    {
      name: 'Lux & Metals',
      themes: [
        { id: 'platinum', name: 'Platinum', bg: '#e5e4e2', accent: '#333' },
        { id: 'titanium', name: 'Titanium', bg: '#1c1c1c', accent: '#a0a0a0' },
        { id: 'gold', name: 'Luxe Gold', bg: '#1c1917', accent: '#fbbf24' },
        { id: 'copper', name: 'Copper', bg: '#1a0a00', accent: '#b87333' }
      ]
    }
  ];

  // Effects Gallery
  const effects = [
    { id: 'none', name: 'Clean', icon: X },
    { id: 'glass', name: 'Glass Armor', icon: Blocks },
    { id: 'neon', name: 'Neon Glow', icon: Sparkles },
    { id: 'prismatic', name: 'Prismatic', icon: Palette }
  ];

  function toggleGradients() {
    themeState.update(s => ({ ...s, gradients: !s.gradients }));
  }

  function setEffect(effectId: string) {
    themeState.update(s => ({ ...s, effect: effectId }));
  }

  function setTheme(themeId: string) {
    themeState.update(s => ({ ...s, current: themeId }));
  }
</script>

<svelte:head>
  <title>My Profile — AnimePro</title>
</svelte:head>

<div class="profile-page container">
  <div class="page-header">
    <h1 class="page-title">Account <span class="accent">Management</span></h1>
    <p class="page-subtitle">Control your personal preferences and viewing profiles.</p>
  </div>

  {#if loading}
    <div class="center"><div class="spinner"></div></div>
  {:else if $auth.user}
    <div class="profile-grid">
      <!-- User Info Card -->
      <div class="info-card glass">
        <div class="card-header">
          <div class="avatar-large">
            <img
              src={getProxiedImage(
                $auth.currentProfile?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user.email}`,
              )}
              alt="Avatar"
            />
          </div>
          <div class="header-text">
            <h2>Account Details</h2>
            <p class="email">{$auth.user.email}</p>
          </div>
        </div>

        <div class="card-body">
          <div class="info-item">
            <span class="label">User ID</span>
            <span class="value">#{$auth.user.id}</span>
          </div>
          <div class="info-item">
            <span class="label">Member Since</span>
            <span class="value">{formatDate($auth.user.createdAt)}</span>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn-logout" onclick={handleLogout}
            >Sign Out</button>
        </div>
      </div>

      <!-- Profiles Section -->
      <div class="profiles-section">
        <div class="section-header">
          <h2>Viewing Profiles</h2>
          <button
            class="btn-add-profile"
            onclick={() => (showProfileModal = true)}
          >
            <UserPlus size={16} /> Add Profile
          </button>
        </div>

        <div class="profiles-grid">
          {#each $auth.user.profiles || [] as profile}
            <div class="profile-wrapper">
              <button
                class="profile-card glass"
                class:active={$auth.currentProfile?.id === profile.id}
                onclick={() => switchProfile(profile)}
              >
                <div class="profile-avatar">
                  <img
                    src={getProxiedImage(
                      profile.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`,
                    )}
                    alt={profile.name}
                  />
                  {#if $auth.currentProfile?.id === profile.id}
                    <div class="active-badge"><Check size={12} /></div>
                  {/if}
                </div>
                <span class="profile-name">{profile.name}</span>
              </button>

              {#if $auth.user.profiles.length > 1}
                <button
                  class="btn-delete-profile"
                  onclick={() => deleteProfile(profile.id)}
                  title="Delete Profile"
                >
                  <Trash2 size={14} />
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Watch Preferences & Privacy -->
    <div class="settings-grid section-margin">
      <div class="settings-card premium-card">
        <div class="card-title-row">
          <Shield size={20} class="icon-accent" />
          <h3>Security</h3>
        </div>
        <p>
          Manage your password and authentication settings.
        </p>
        <button class="btn-outline" onclick={() => (showPasswordModal = true)}>
          <Key size={16} /> Change Password
        </button>
      </div>

      <div class="settings-card premium-card">
        <div class="card-title-row">
          <Settings size={20} class="icon-accent" />
          <h3>Playback Settings</h3>
        </div>

        <div class="preferences-list">
  <!-- Theme Customization Engine -->
  <div class="pref-item vertical">
    <div class="pref-info">
      <h3>Visual Engine <Sparkles size={16} class="icon-accent" /></h3>
      <p>Fine-tune your AnimePro interface with premium effects and gradients</p>
    </div>

    <!-- 1. Color Palette categorized -->
    <div class="custom-section">
      <div class="section-label">Color Palette</div>
      <div class="category-stack">
        {#each themeCategories as category}
          <div class="theme-category">
            <span class="cat-name">{category.name}</span>
            <div class="theme-grid">
              {#each category.themes as t}
                <button 
                  class="theme-swatch" 
                  class:active={$themeState.current === t.id}
                  onclick={() => setTheme(t.id)}
                  title={t.name}
                >
                  <div class="swatch-preview" style="background: {t.bg}">
                    <div class="swatch-accent" style="background: {t.accent}"></div>
                  </div>
                  <span class="swatch-label">{t.name}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="custom-row section-margin-top">
      <!-- 2. Gradient Toggle -->
      <div class="custom-card glass">
        <div class="card-info">
          <span>Gradient Module</span>
          <p>Apply professional blends to UI elements</p>
        </div>
        <label class="switch">
          <input type="checkbox" checked={$themeState.gradients} onchange={toggleGradients} />
          <span class="slider"></span>
        </label>
      </div>

      <!-- 3. Effects Selection -->
      <div class="custom-card glass vertical">
        <div class="card-info">
          <span>Display Effects</span>
          <p>Layer visual atmospherics over your theme</p>
        </div>
        <div class="effects-grid">
          {#each effects as effect}
            <button 
              class="effect-btn" 
              class:active={$themeState.effect === effect.id}
              onclick={() => setEffect(effect.id)}
            >
              <effect.icon size={18} />
              <span>{effect.name}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>
          <div class="pref-item">
            <div class="pref-info">
              <span>Auto Next Episode</span>
              <p>Play next episode automatically</p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={$auth.currentProfile?.autoNext}
                onchange={(e) =>
                  updatePref("autoNext", e.currentTarget.checked)}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="pref-item">
            <div class="pref-info">
              <span>Auto Skip Intro</span>
              <p>Skip opening themes if detected</p>
            </div>
            <label class="switch">
              <input
                type="checkbox"
                checked={$auth.currentProfile?.autoSkip}
                onchange={(e) =>
                  updatePref("autoSkip", e.currentTarget.checked)}
              />
              <span class="slider"></span>
            </label>
          </div>

          <div class="pref-item">
            <div class="pref-info">
              <span>Default Audio</span>
              <p>Preferred language for playback</p>
            </div>
            <select
              class="input-dark"
              value={$auth.currentProfile?.language || "multi"}
              onchange={(e) => updatePref("language", e.currentTarget.value)}
            >
              <option value="multi">Auto / Multi</option>
              <option value="hindi">Hindi Dub</option>
              <option value="english">English Dub</option>
              <option value="sub">Subtitles</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Favorites Gallery -->
    <div class="favorites-container section-margin">
      <div class="section-header">
        <h2>My Favorites</h2>
      </div>
      {#if loadingFavs}
        <div class="loading-favs">
          <span class="spinner-small"></span> Loading favorites...
        </div>
      {:else if favorites.length > 0}
        <div class="favs-grid">
          {#each favorites as fav}
            <a href="/anime/{fav.animeId}" class="fav-card">
              <div class="fav-poster">
                <img
                  src={getProxiedImage(fav.animePoster)}
                  alt={fav.animeTitle}
                />
              </div>
              <div class="fav-info">
                <p class="fav-title">{fav.animeTitle}</p>
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="empty-favs glass">
          <p>You haven't favorited any anime yet.</p>
          <a href="/" class="btn-primary mini">Explore Anime</a>
        </div>
      {/if}
    </div>

    <!-- Modals -->
    {#if showPasswordModal}
      <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        onclick={() => (showPasswordModal = false)}
        onkeydown={(e) => e.key === "Escape" && (showPasswordModal = false)}
      >
        <div
          class="modal glass"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <div class="modal-header">
            <h3>Change Password</h3>
            <button
              class="close-btn"
              onclick={() => (showPasswordModal = false)}
              ><X size={20} /></button
            >
          </div>
          <div class="modal-body">
            {#if error}<div class="alert error">
                <AlertCircle size={16} />
                {error}
              </div>{/if}
            <div class="form-group">
              <label for="current-password">Current Password</label>
              <input
                id="current-password"
                type="password"
                class="input-dark"
                bind:value={passwordForm.current}
              />
            </div>
            <div class="form-group">
              <label for="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                class="input-dark"
                bind:value={passwordForm.new}
              />
            </div>
            <div class="form-group">
              <label for="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                class="input-dark"
                bind:value={passwordForm.confirm}
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn-secondary"
              onclick={() => (showPasswordModal = false)}>Cancel</button
            >
            <button
              class="btn-primary"
              onclick={handlePasswordChange}
              disabled={processing}
            >
              {processing ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if showProfileModal}
      <div
        class="modal-backdrop"
        role="button"
        tabindex="0"
        onclick={() => (showProfileModal = false)}
        onkeydown={(e) => e.key === "Escape" && (showProfileModal = false)}
      >
        <div
          class="modal glass"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
        >
          <div class="modal-header">
            <h3>Create New Profile</h3>
            <button class="close-btn" onclick={() => (showProfileModal = true)}
              ><X size={20} /></button
            >
          </div>
          <div class="modal-body">
            {#if error}<div class="alert error">
                <AlertCircle size={16} />
                {error}
              </div>{/if}
            <div class="form-group">
              <label for="profile-name">Profile Name</label>
              <input
                id="profile-name"
                type="text"
                class="input-dark"
                bind:value={profileForm.name}
                placeholder="e.g. My Anime"
              />
            </div>
            <div class="form-group">
              <label for="profile-avatar">Select Avatar</label>
              <div id="profile-avatar" class="avatar-picker">
                {#each avatars as avatar}
                  <button
                    class="avatar-option"
                    class:selected={profileForm.avatar === avatar}
                    onclick={() => (profileForm.avatar = avatar)}
                  >
                    <img src={avatar} alt="Avatar option" />
                    {#if profileForm.avatar === avatar}<div
                        class="selected-mark"
                      >
                        <Check size={12} />
                      </div>{/if}
                  </button>
                {/each}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              class="btn-secondary"
              onclick={() => (showProfileModal = false)}>Cancel</button
            >
            <button
              class="btn-primary"
              onclick={handleCreateProfile}
              disabled={processing}
            >
              {processing ? "Creating..." : "Create Profile"}
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if success}
      <div class="toast success">
        <Check size={18} />
        {success}
      </div>
      {(setTimeout(() => (success = ""), 3000), "")}
    {/if}
  {/if}
</div>

<style>
  .profile-page {
    padding: 3rem 0 6rem;
    min-height: 90vh;
  }
  .page-header {
    margin-bottom: 3rem;
  }
  .page-title {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
  .page-title .accent {
    color: var(--net-red);
  }
  .page-subtitle {
    color: var(--net-text-muted);
    margin-top: 0.5rem;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 2.5rem;
    align-items: start;
  }

  .info-card {
    padding: 2.5rem;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(20, 20, 20, 0.4);
  }
  .card-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
    text-align: center;
  }
  .avatar-large {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--net-red);
    padding: 5px;
    background: var(--net-bg);
  }
  .avatar-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
  .header-text h2 {
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
    margin-bottom: 0.2rem;
  }
  .email {
    color: var(--net-text-muted);
    font-size: 0.95rem;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 2rem;
  }
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .label {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }
  .value {
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .btn-logout {
    width: 100%;
    margin-top: 2.5rem;
    background: rgba(229, 9, 20, 0.1);
    color: #f87171;
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.9rem;
    border-radius: 12px;
    cursor: pointer;
    transition: 0.2s;
    font-weight: 700;
    font-size: 0.95rem;
  }
  .btn-logout:hover {
    background: var(--net-red);
    color: white;
    border-color: var(--net-red);
  }

  .profiles-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-header h2 {
    font-size: 1.6rem;
    font-weight: 800;
    color: white;
  }
  .btn-add-profile {
    background: var(--net-red);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: 0.2s;
  }
  .btn-add-profile:hover {
    transform: scale(1.05);
    background: #ff1e2b;
  }

  .profiles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1.5rem;
  }
  .profile-wrapper {
    position: relative;
  }
  .profile-card {
    width: 100%;
    padding: 1.5rem 1rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
    transition: 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
  .profile-card:hover {
    transform: translateY(-8px);
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.03);
  }
  .profile-card.active {
    border-color: var(--net-red);
    background: rgba(229, 9, 20, 0.08);
  }

  .profile-avatar {
    width: 75px;
    height: 75px;
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .active-badge {
    position: absolute;
    bottom: -6px;
    right: -6px;
    background: var(--net-red);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--net-bg);
  }
  .profile-name {
    color: white;
    font-weight: 700;
    font-size: 0.95rem;
  }

  .btn-delete-profile {
    position: absolute;
    top: -8px;
    right: -8px;
    background: rgba(255, 255, 255, 0.1);
    color: #f87171;
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    opacity: 0;
    transition: 0.2s;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .profile-wrapper:hover .btn-delete-profile {
    opacity: 1;
  }
  .btn-delete-profile:hover {
    background: #e50914;
    color: white;
  }

  /* Theme Engine Styles */
  .custom-section {
    margin: 2rem 0;
  }
  .section-label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    color: var(--net-text-muted);
    margin-bottom: 1rem;
    display: block;
    font-weight: 700;
  }
  .category-stack {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }
  .theme-category {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .cat-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
  }
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 1.2rem;
  }
  .theme-swatch {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    transition: var(--transition);
  }
  .theme-swatch:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.2);
    transform: translateY(-4px);
  }
  .theme-swatch.active {
    background: rgba(229, 9, 20, 0.1);
    border-color: var(--net-red);
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.15);
  }
  .swatch-preview {
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
  }
  .swatch-accent {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40%;
    height: 100%;
    transform: skewX(-20deg) translateX(-20%);
    box-shadow: 4px 0 15px rgba(0,0,0,0.3);
  }
  .swatch-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--net-text-muted);
  }
  .active .swatch-label {
    color: white;
  }

  .custom-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .custom-card {
    padding: 1.5rem;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }
  .custom-card.vertical {
    flex-direction: column;
    align-items: flex-start;
  }
  .card-info span {
    display: block;
    font-weight: 700;
    font-size: 1rem;
    margin-bottom: 0.3rem;
  }
  .card-info p {
    font-size: 0.85rem;
    color: var(--net-text-muted);
  }

  .effects-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.8rem;
    width: 100%;
  }
  .effect-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 1rem 0.5rem;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    transition: var(--transition);
    color: var(--net-text-muted);
  }
  .effect-btn:hover {
    background: rgba(255,255,255,0.06);
    color: white;
  }
  .effect-btn.active {
    background: var(--net-red);
    color: white;
    border-color: var(--net-red);
    box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
  }
  .effect-btn span {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .section-margin-top {
    margin-top: 3rem;
  }

  @media (max-width: 1024px) {
    .custom-row {
      grid-template-columns: 1fr;
    }
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
  }
  .settings-card {
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .card-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .card-title-row h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
  }
  .icon-accent {
    color: var(--net-red);
  }
  .settings-card p {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .preferences-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-top: 1rem;
  }
  .pref-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }
  .pref-info span {
    display: block;
    font-weight: 700;
    font-size: 0.95rem;
    color: white;
    margin-bottom: 0.2rem;
  }
  .pref-info p {
    font-size: 0.8rem;
    color: var(--net-text-muted);
    margin: 0;
  }

  /* Switch Toggle */
  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: rgba(255, 255, 255, 0.1);
    transition: 0.3s;
    border-radius: 24px;
  }
  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  input:checked + .slider {
    background-color: var(--net-red);
  }
  input:checked + .slider:before {
    transform: translateX(20px);
  }

  .input-dark {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    font-size: 0.9rem;
    width: 100%;
    outline: none;
    transition: 0.2s;
  }
  .input-dark:focus {
    border-color: var(--net-red);
  }

  .btn-outline {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: white;
    padding: 0.7rem 1.2rem;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: fit-content;
  }
  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: white;
  }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    [data-effect="glass"] .glass {
      background: rgba(255, 255, 255, 0.05) !important;
      -webkit-backdrop-filter: blur(25px) saturate(200%) !important;
      backdrop-filter: blur(25px) saturate(200%) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    background: rgba(0, 0, 0, 0.7);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    backdrop-filter: blur(12px) saturate(180%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1rem;
    outline: none;
  }
  .modal {
    width: 100%;
    max-width: 450px;
    padding: 2.5rem;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes modalIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-header h3 {
    font-size: 1.4rem;
    font-weight: 800;
    color: white;
  }
  .close-btn {
    background: none;
    border: none;
    color: var(--net-text-muted);
    cursor: pointer;
  }
  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .form-group label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--net-text-muted);
  }
  .avatar-picker {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .avatar-option {
    position: relative;
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid transparent;
    background: var(--net-card-bg);
    cursor: pointer;
    padding: 0;
    transition: 0.2s;
  }
  .avatar-option img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .avatar-option.selected {
    border-color: var(--net-red);
    transform: scale(1.05);
  }
  .selected-mark {
    position: absolute;
    top: 4px;
    right: 4px;
    background: var(--net-red);
    color: white;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }

  .alert {
    padding: 0.8rem 1rem;
    border-radius: 10px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .alert.error {
    background: rgba(229, 9, 20, 0.1);
    color: #f87171;
    border: 1px solid rgba(229, 9, 20, 0.2);
  }

  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 2rem;
    border-radius: 12px;
    background: #22c55e;
    color: white;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 5000;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
  }

  .center {
    display: flex;
    justify-content: center;
    padding: 6rem 0;
  }

  .section-margin {
    margin-top: 4rem;
  }
  .favorites-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .favs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1.25rem;
  }
  .fav-card {
    display: flex;
    flex-direction: column;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.06);
    transition: 0.3s;
    text-decoration: none;
    color: white;
  }
  .fav-card:hover {
    transform: translateY(-5px);
    border-color: var(--net-red);
  }
  .fav-poster {
    aspect-ratio: 2/3;
    overflow: hidden;
  }
  .fav-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .fav-info {
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.4);
  }
  .fav-title {
    font-size: 0.85rem;
    font-weight: 700;
    line-clamp: 2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  .loading-favs {
    padding: 3rem;
    text-align: center;
    color: var(--net-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }
  .empty-favs {
    padding: 4rem 2rem;
    text-align: center;
    border-radius: 20px;
    border: 1px dashed rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }
  .empty-favs p {
    color: var(--net-text-muted);
    margin-bottom: 1.5rem;
  }
  .btn-primary.mini {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 800px) {
    .profile-grid {
      grid-template-columns: 1fr;
    }
    .settings-grid {
      grid-template-columns: 1fr;
    }
    .page-title {
      font-size: 2rem;
    }
  }

  @media (max-width: 768px) {
    .profile-page {
      padding: 1.5rem 0 4rem;
    }
    .page-title {
      font-size: 1.8rem;
    }
    .profile-header {
      padding: 1.5rem;
    }
    .profile-info {
      gap: 1rem;
    }
    .profile-avatar {
      width: 80px;
      height: 80px;
    }
    .profile-name {
      font-size: 1.3rem;
    }
    .profile-email {
      font-size: 0.85rem;
    }
    .profile-grid {
      gap: 1.5rem;
    }
    .section-title {
      font-size: 1.1rem;
    }
    .settings-grid {
      gap: 1rem;
    }
    .setting-card {
      padding: 1rem;
    }
    .setting-label {
      font-size: 0.9rem;
    }
    .setting-value {
      font-size: 0.85rem;
    }
    .modal {
      padding: 2rem;
    }
    .modal-header h3 {
      font-size: 1.2rem;
    }
    .avatar-picker {
      gap: 0.8rem;
    }
    .toast {
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 0.85rem 1.5rem;
      font-size: 0.9rem;
    }
    .center {
      padding: 5rem 0;
    }
    .section-margin {
      margin-top: 3rem;
    }
    .favs-grid {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 1rem;
    }
    .fav-info {
      padding: 0.65rem;
    }
    .fav-title {
      font-size: 0.8rem;
    }
    .empty-favs {
      padding: 3rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .profile-page {
      padding: 1rem 0 3rem;
    }
    .page-title {
      font-size: 1.5rem;
    }
    .profile-header {
      padding: 1.25rem;
    }
    .profile-info {
      gap: 0.85rem;
    }
    .profile-avatar {
      width: 70px;
      height: 70px;
    }
    .profile-name {
      font-size: 1.15rem;
    }
    .profile-email {
      font-size: 0.8rem;
    }
    .profile-grid {
      gap: 1.25rem;
    }
    .section-title {
      font-size: 1rem;
    }
    .settings-grid {
      gap: 0.85rem;
    }
    .setting-card {
      padding: 0.85rem;
    }
    .setting-label {
      font-size: 0.85rem;
    }
    .setting-value {
      font-size: 0.8rem;
    }
    .modal {
      padding: 1.5rem;
    }
    .modal-header h3 {
      font-size: 1.1rem;
    }
    .avatar-picker {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.7rem;
    }
    .modal-footer {
      flex-direction: column;
    }
    .modal-footer button {
      width: 100%;
    }
    .toast {
      bottom: 1rem;
      right: 1rem;
      left: 1rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.85rem;
    }
    .center {
      padding: 4rem 0;
    }
    .section-margin {
      margin-top: 2.5rem;
    }
    .favs-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.85rem;
    }
    .fav-info {
      padding: 0.6rem;
    }
    .fav-title {
      font-size: 0.75rem;
    }
    .empty-favs {
      padding: 2.5rem 1rem;
    }
    .btn-primary.mini {
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
    }
  }

  @media (max-width: 360px) {
    .page-title {
      font-size: 1.3rem;
    }
    .profile-header {
      padding: 1rem;
    }
    .profile-avatar {
      width: 60px;
      height: 60px;
    }
    .profile-name {
      font-size: 1rem;
    }
    .profile-email {
      font-size: 0.75rem;
    }
    .section-title {
      font-size: 0.95rem;
    }
    .setting-card {
      padding: 0.75rem;
    }
    .setting-label {
      font-size: 0.8rem;
    }
    .setting-value {
      font-size: 0.75rem;
    }
    .modal {
      padding: 1.25rem;
    }
    .modal-header h3 {
      font-size: 1rem;
    }
    .favs-grid {
      grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
      gap: 0.7rem;
    }
    .fav-title {
      font-size: 0.7rem;
    }
  }
  .pref-item.vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.75rem;
    width: 100%;
    max-height: 300px;
    overflow-y: auto;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .theme-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 10px;
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    transition: 0.2s;
  }

  .theme-swatch:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .theme-swatch.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--net-red);
  }

  .swatch-preview {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 8px;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
  }

  .swatch-accent {
    position: absolute;
    bottom: -10%;
    right: -10%;
    width: 50%;
    height: 50%;
    border-radius: 50%;
    transform: rotate(45deg);
  }

  .swatch-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--net-text-muted);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .theme-swatch.active .swatch-label {
    color: white;
  }

  /* Custom scrollbar for theme grid */
  .theme-grid::-webkit-scrollbar {
    width: 4px;
  }
  .theme-grid::-webkit-scrollbar-track {
    background: transparent;
  }
  .theme-grid::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
</style>
