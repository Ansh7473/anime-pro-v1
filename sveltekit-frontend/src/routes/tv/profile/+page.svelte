<script lang="ts">
  import { auth, logoutUser } from "$lib/stores/auth";
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { fly, fade } from 'svelte/transition';
  import { User, Settings, LogOut, ShieldCheck, Mail, Clock } from 'lucide-svelte';
  import { goto } from "$app/navigation";

  let userStats = $state<any>(null);
  let loading = $state(true);

  onMount(async () => {
    if (!$auth.token) {
      goto('/tv/settings');
      return;
    }
    
    try {
      userStats = await api.getUserStats($auth.token);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    } finally {
      loading = false;
    }
  });

  function handleLogout() {
    logoutUser();
    goto('/tv');
  }
</script>

<div class="tv-profile-page" in:fly={{ y: 30, duration: 600 }}>
  <header class="profile-header">
    <div class="avatar-wrapper">
      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed={$auth.user?.email || 'default'}" alt="Avatar" class="profile-avatar" />
      <div class="status-badge">ONLINE</div>
    </div>
    <div class="user-info">
      <h1>{$auth.user?.email.split('@')[0].toUpperCase() || 'ANONYMOUS'}</h1>
      <p class="user-email"><Mail size={16} /> {$auth.user?.email || 'No email connected'}</p>
      <div class="badges">
        <span class="badge premium">PREMIUM ACCESS</span>
        <span class="badge status">ALPHA TESTER</span>
      </div>
    </div>
  </header>

  <div class="profile-grid">
    <section class="info-card stats-card glass">
      <h2><ShieldCheck size={24} /> Account Status</h2>
      <div class="stats-row">
        <div class="stat">
          <span class="label">MEMBER SINCE</span>
          <span class="value">APRIL 2026</span>
        </div>
        <div class="stat">
          <span class="label">TRUST LEVEL</span>
          <span class="value">VERIFIED</span>
        </div>
      </div>
      <div class="account-actions">
        <button class="action-btn" onclick={() => goto('/tv/settings')}>
          <Settings size={20} /> ACCOUNT SETTINGS
        </button>
        <button class="action-btn logout" onclick={handleLogout}>
          <LogOut size={20} /> SIGN OUT
        </button>
      </div>
    </section>

    <section class="info-card history-preview glass">
      <h2><Clock size={24} /> Recent Security</h2>
      <div class="security-list">
        <div class="security-item">
          <span class="time">Just now</span>
          <span class="event">TV Session Started</span>
        </div>
        <div class="security-item">
          <span class="time">2h ago</span>
          <span class="event">Profile Details Updated</span>
        </div>
        <div class="security-item">
          <span class="time">Yesterday</span>
          <span class="event">New Device Linked (Android TV)</span>
        </div>
      </div>
    </section>
  </div>
</div>

<style>
  .tv-profile-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 4rem;
    margin-bottom: 5rem;
    background: linear-gradient(90deg, rgba(229, 9, 20, 0.1), transparent);
    padding: 3rem;
    border-radius: 30px;
    border-left: 5px solid var(--net-red);
  }

  .avatar-wrapper {
    position: relative;
  }

  .profile-avatar {
    width: 200px;
    height: 200px;
    border-radius: 40px;
    background: #111;
    border: 4px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }

  .status-badge {
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: #4ade80;
    color: black;
    font-weight: 900;
    padding: 0.4rem 1.2rem;
    border-radius: 100px;
    font-size: 0.8rem;
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
  }

  .user-info h1 {
    font-size: 4rem;
    font-weight: 950;
    letter-spacing: -2px;
    margin-bottom: 0.5rem;
  }

  .user-email {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--net-text-muted);
    font-size: 1.2rem;
    margin-bottom: 2rem;
  }

  .badges {
    display: flex;
    gap: 1rem;
  }

  .badge {
    padding: 0.5rem 1.5rem;
    border-radius: 8px;
    font-weight: 900;
    font-size: 0.85rem;
  }

  .badge.premium { background: var(--net-red); color: white; }
  .badge.status { background: rgba(255,255,255,0.1); color: white; }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }

  .info-card {
    padding: 3rem;
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .info-card h2 {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 1.8rem;
    margin-bottom: 2.5rem;
    color: var(--net-text-muted);
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat .label { font-size: 0.8rem; color: var(--net-text-muted); letter-spacing: 0.1em; }
  .stat .value { font-size: 1.5rem; font-weight: 800; }

  .account-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem 2rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    color: white;
    font-weight: 700;
    width: 100%;
    transition: all 0.2s;
  }

  .action-btn:focus-visible, .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: white;
    transform: scale(1.02);
    outline: none;
  }

  .action-btn.logout { color: var(--net-red); }
  .action-btn.logout:focus-visible { border-color: var(--net-red); }

  .security-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .security-item {
    display: flex;
    justify-content: space-between;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .security-item .time { color: var(--net-text-muted); font-size: 0.9rem; }
  .security-item .event { font-weight: 600; }
</style>
