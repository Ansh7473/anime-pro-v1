<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth, switchProfile, logoutUser } from "$lib/stores/auth";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { themeState, type ThemeSettings } from '$lib/stores/theme';
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
    Heart,
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

  onMount(async () => {
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
</svelte:head>

{#if loading}
  <div class="loading-state">
    <div class="spinner"></div>
    <p>Loading your profile...</p>
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
      <div class="user-card-left">
        <div class="user-avatar">
          {($auth.currentProfile?.name || 'A')[0].toUpperCase()}
        </div>
        <div class="user-details">
          <h2 class="user-name">{$auth.currentProfile?.name || 'User'}</h2>
          <p class="user-email">{$auth.user?.email || ''}</p>
          <span class="user-date">Member since {formatDate($auth.currentProfile?.createdAt)}</span>
        </div>
      </div>
      <button class="btn-outline logout-btn" onclick={handleLogout}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>

    <div class="settings-grid">
      <!-- Left: Profiles -->
      <div class="settings-col">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Profiles</h2>
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
          <h2 class="card-title">Security</h2>
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
          <h2 class="card-title">Playback Preferences</h2>
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
          <h2 class="card-title">Appearance</h2>
          <a href="/intel" class="settings-action">
            <div class="settings-action-left">
              <Palette size={18} />
              <div>
                <span class="action-label">Customize Theme</span>
                <span class="action-desc">Choose from 80+ color themes</span>
              </div>
            </div>
            <ChevronRight size={16} class="chevron" />
          </a>
        </section>

        <!-- Favorites -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">Favorites</h2>
            <a href="/favorites" class="btn-text">View All</a>
          </div>
          {#if loadingFavs}
            <div class="fav-loading">
              <div class="spinner small"></div>
            </div>
          {:else if favorites.length === 0}
            <div class="fav-empty">
              <Heart size={24} />
              <p>No favorites yet. Heart an anime to add it here!</p>
            </div>
          {:else}
            <div class="fav-grid">
              {#each favorites.slice(0, 6) as anime}
                <a href="/anime/{anime.id}" class="fav-card">
                  <img src={getProxiedImage(anime.poster)} alt={anime.title} class="fav-poster" />
                  <span class="fav-title">{anime.title}</span>
                </a>
              {/each}
            </div>
          {/if}
        </section>
      </div>
    </div>
  </div>
{/if}

<!-- Password Modal -->
{#if showPasswordModal}
  <div class="modal-overlay" onclick={closeModals} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Change Password</h3>
        <button class="modal-close" onclick={closeModals}><X size={18} /></button>
      </div>
      <form onsubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} class="modal-body">
        {#if error}
          <div class="alert alert-error small">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        {/if}
        <div class="form-group">
          <label>Current Password</label>
          <input type="password" bind:value={passwordForm.current} required placeholder="Enter current password" />
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input type="password" bind:value={passwordForm.new} required minlength={6} placeholder="At least 6 characters" />
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input type="password" bind:value={passwordForm.confirm} required placeholder="Re-enter new password" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-outline" onclick={closeModals}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={processing}>
            {processing ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Create Profile Modal -->
{#if showProfileModal}
  <div class="modal-overlay" onclick={closeModals} role="dialog" aria-modal="true">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <div class="modal-header">
        <h3>Create New Profile</h3>
        <button class="modal-close" onclick={closeModals}><X size={18} /></button>
      </div>
      <form onsubmit={(e) => { e.preventDefault(); handleCreateProfile(); }} class="modal-body">
        {#if error}
          <div class="alert alert-error small">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        {/if}
        <div class="form-group">
          <label>Profile Name</label>
          <input type="text" bind:value={profileForm.name} required maxlength={20} placeholder="Enter a name for this profile" />
        </div>
        <div class="form-group">
          <label>Choose Avatar</label>
          <div class="avatar-grid">
            {#each avatars as av}
              <button
                type="button"
                class="avatar-option"
                class:selected={profileForm.avatar === av}
                onclick={() => profileForm.avatar = av}
              >
                <img src={av} alt="" />
              </button>
            {/each}
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-outline" onclick={closeModals}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={processing || !profileForm.name}>
            {processing ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .profile-page {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 960px;
  }

  /* Loading */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 1rem;
    gap: 1rem;
    color: var(--net-text-muted);
    min-height: 60vh;
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
  .alert.small { padding: 0.65rem 0.85rem; font-size: 0.82rem; margin-bottom: 1rem; }
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  .user-card-left {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }
  .user-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--net-red), #7c040a);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 800;
    color: white;
    flex-shrink: 0;
  }
  .user-name {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 0.15rem;
  }
  .user-email {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    margin-bottom: 0.2rem;
  }
  .user-date {
    font-size: 0.75rem;
    color: var(--net-text-muted);
    opacity: 0.7;
  }

  /* Settings Grid */
  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .card-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
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

  /* Favorites */
  .fav-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }
  .fav-card {
    text-decoration: none;
    border-radius: 10px;
    overflow: hidden;
    transition: transform 0.2s;
  }
  .fav-card:hover { transform: translateY(-3px); }
  .fav-poster {
    width: 100%;
    aspect-ratio: 2/3;
    object-fit: cover;
    border-radius: 8px;
  }
  .fav-title {
    display: block;
    font-size: 0.72rem;
    font-weight: 600;
    color: white;
    margin-top: 0.4rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fav-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem 1rem;
    gap: 0.75rem;
    text-align: center;
    color: var(--net-text-muted);
  }
  .fav-empty svg { opacity: 0.3; }
  .fav-empty p { font-size: 0.85rem; }
  .fav-loading {
    display: flex;
    justify-content: center;
    padding: 2rem;
  }

  /* Buttons */
  .btn-primary {
    padding: 0.7rem 1.5rem;
    background: var(--net-red);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.15); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

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

  /* Modals */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  }
  .modal {
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .modal-header h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
  .modal-close {
    background: none;
    border: none;
    color: var(--net-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
  }
  .modal-close:hover { background: rgba(255, 255, 255, 0.05); color: white; }
  .modal-body { padding: 1.5rem; }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  /* Forms */
  .form-group {
    margin-bottom: 1.25rem;
  }
  .form-group label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--net-text-muted);
    margin-bottom: 0.4rem;
  }
  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: white;
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }
  .form-group input:focus { border-color: var(--net-red); }
  .form-group input::placeholder { color: rgba(255, 255, 255, 0.25); }

  .avatar-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
  }
  .avatar-option {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2px solid transparent;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
  }
  .avatar-option img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-option:hover { border-color: rgba(255, 255, 255, 0.2); }
  .avatar-option.selected { border-color: var(--net-red); box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.3); }

  .spinner.small {
    width: 20px;
    height: 20px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .page-title { font-size: 1.5rem; }
    .header-badge { display: none; }
    .settings-grid { grid-template-columns: 1fr; }
    .user-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    .logout-btn { width: 100%; justify-content: center; }
    .fav-grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.3rem; }
    .user-card-left { gap: 0.85rem; }
    .user-avatar { width: 46px; height: 46px; font-size: 1.2rem; }
    .user-name { font-size: 1.05rem; }
    .card { padding: 1.25rem; }
    .fav-grid { grid-template-columns: repeat(2, 1fr); }
    .avatar-grid { grid-template-columns: repeat(3, 1fr); }
    .modal { border-radius: 12px; }
    .modal-body { padding: 1.25rem; }
  }
</style>
