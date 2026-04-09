<script lang="ts">
  import { auth, logoutUser } from "$lib/stores/auth";
  import { isTV } from "$lib/stores/device";
  import { goto } from "$app/navigation";
  import { Settings, User, Monitor, Languages, LogOut, Smartphone } from 'lucide-svelte';
  import { fly } from 'svelte/transition';

  let selectedIndex = $state(0);
  
  const settingsGroups = [
    { 
      id: 'account',
      title: 'Account', 
      icon: User,
      options: [
        { label: 'Profile Management', description: 'Switch or edit profiles' },
        { label: 'Watch History', description: 'Clear or manage history' }
      ]
    },
    { 
      id: 'playback',
      title: 'Playback', 
      icon: Monitor,
      options: [
        { label: 'Video Quality', description: 'Default: Auto (Highest)' },
        { label: 'Auto-Play', description: 'Next episode automatically' }
      ]
    },
    { 
      id: 'language',
      title: 'Language', 
      icon: Languages,
      options: [
        { label: 'Primary Language', description: 'Set to: Hindi (Dub)' },
        { label: 'Subtitles', description: 'Enabled by default' }
      ]
    }
  ];

  function handleExitTV() {
    isTV.set(false);
    document.body.classList.remove('tv-mode');
    goto('/');
  }

  function handleLogout() {
    logoutUser();
    goto('/');
  }
</script>

<div class="tv-settings-page" in:fly={{ x: 50, duration: 500 }}>
  <header class="settings-header">
    <Settings size={32} class="text-red-600" />
    <h1>Settings</h1>
  </header>

  <div class="settings-grid">
    <div class="settings-list">
      {#each settingsGroups as group, i}
        <section class="settings-group">
          <div class="group-title">
            <group.icon size={20} />
            <h2>{group.title}</h2>
          </div>
          <div class="options-container">
            {#each group.options as option}
              <button class="settings-option">
                <span class="option-label">{option.label}</span>
                <span class="option-desc">{option.description}</span>
              </button>
            {/each}
          </div>
        </section>
      {/each}

      <section class="settings-group danger-zone">
        <div class="group-title">
          <Smartphone size={20} />
          <h2>Device & System</h2>
        </div>
        <div class="options-container">
          <button class="settings-option exit-btn" onclick={handleExitTV}>
            <Smartphone size={20} />
            <div class="btn-text">
              <span class="option-label">Exit TV Mode</span>
              <span class="option-desc">Return to standard mobile/web interface</span>
            </div>
          </button>
          
          <button class="settings-option logout-btn" onclick={handleLogout}>
            <LogOut size={20} />
            <div class="btn-text">
              <span class="option-label">Log Out</span>
              <span class="option-desc">Sign out of your account</span>
            </div>
          </button>
        </div>
      </section>
    </div>

    <!-- Preview/Info section (Netflix style) -->
    <div class="settings-info-panel glass">
      {#if $auth.user}
        <div class="current-user-card">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed={$auth.user.email}" alt="Avatar" class="tv-avatar" />
          <div class="user-details">
            <h3>{$auth.user.email}</h3>
            <span class="plan-badge">PREMIUM ALPHA</span>
          </div>
        </div>
      {/if}
      <div class="system-info">
        <p>App Version: 2.0.4-TV</p>
        <p>Device ID: ANIMEPRO-TV-WRAPPER</p>
        <p>Server Status: <span class="text-green-500">Operational</span></p>
      </div>
    </div>
  </div>
</div>

<style>
  .tv-settings-page {
    max-width: 1200px;
    margin: 0 auto;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 4rem;
  }

  .settings-header h1 {
    font-size: 3rem;
    font-weight: 800;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 4rem;
  }

  .settings-group {
    margin-bottom: 3rem;
  }

  .group-title {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--net-text-muted);
    margin-bottom: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .options-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-option {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.5rem 2rem;
    border-radius: 12px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: all 0.2s;
    cursor: pointer;
  }

  .settings-option:hover,
  .settings-option:focus-visible {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.02);
    border-color: var(--net-red);
    outline: none;
  }

  .option-label {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
  }

  .option-desc {
    font-size: 0.95rem;
    color: var(--net-text-muted);
  }

  .exit-btn, .logout-btn {
    flex-direction: row;
    align-items: center;
    gap: 1.5rem;
  }
  
  .exit-btn :global(svg) { color: #3b82f6; }
  .logout-btn :global(svg) { color: var(--net-red); }

  .settings-info-panel {
    padding: 2.5rem;
    border-radius: 20px;
    height: fit-content;
    position: sticky;
    top: 2rem;
  }

  .current-user-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 3rem;
    text-align: center;
  }

  .tv-avatar {
    width: 120px;
    height: 120px;
    border-radius: 12px;
    border: 4px solid var(--net-red);
  }

  .plan-badge {
    background: var(--net-red);
    color: white;
    font-size: 0.75rem;
    font-weight: 900;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    margin-top: 0.5rem;
    display: inline-block;
  }

  .system-info {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    line-height: 1.8;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 1.5rem;
  }
</style>
