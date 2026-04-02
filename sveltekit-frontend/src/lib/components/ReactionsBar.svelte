<script lang="ts">
  import { api } from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { Flame, Heart, Zap, Smile, Info } from 'lucide-svelte';

  let { animeId, episode } = $props<{ animeId: string; episode: number }>();

  let counts = $state<Record<string, number>>({
    fire: 0,
    heart: 0,
    shock: 0,
    happy: 0
  });
  let userReaction = $state<string | null>(null);
  let loading = $state(true);

  const emojis = [
    { type: 'fire', icon: Flame, label: 'Lit', color: '#ff4500' },
    { type: 'heart', icon: Heart, label: 'Love', color: '#ff1493' },
    { type: 'shock', icon: Zap, label: 'WTF', color: '#ffd700' },
    { type: 'happy', icon: Smile, label: 'Nice', color: '#00ff7f' }
  ];

  onMount(async () => {
    fetchReactions();
  });

  async function fetchReactions() {
    try {
      const res = await api.getReactions(animeId, episode, $auth.token || undefined);
      counts = { ...counts, ...res.counts };
      userReaction = res.userReaction || null;
    } catch (e) {
      console.error('Failed to fetch reactions:', e);
    } finally {
      loading = false;
    }
  }

  async function toggle(type: string) {
    if (!$auth.token) {
      alert('Please login to react!');
      return;
    }

    // Optimistic update
    const prev = userReaction;
    if (userReaction === type) {
      userReaction = null;
      counts[type]--;
    } else {
      if (userReaction) counts[userReaction]--;
      userReaction = type;
      counts[type]++;
    }

    try {
      const res = await api.toggleReaction($auth.token, { animeId, episode, type });
      // Sync with server response if needed
    } catch (e) {
      // Revert on error
      userReaction = prev;
      fetchReactions();
    }
  }
</script>

<div class="reactions-container">
  {#each emojis as emoji}
    <button 
      class="reaction-btn" 
      class:active={userReaction === emoji.type}
      onclick={() => toggle(emoji.type)}
      aria-label={`React with ${emoji.label}`}
    >
      <emoji.icon 
        size={20} 
        strokeWidth={userReaction === emoji.type ? 2.5 : 2}
        color={userReaction === emoji.type ? emoji.color : 'rgba(255,255,255,0.5)'} 
      />
      <span class="count">{counts[emoji.type] || 0}</span>
      <span class="tooltip">{emoji.label}</span>
    </button>
  {/each}
</div>

<style>
  .reactions-container {
    display: flex;
    gap: 0.75rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 100px;
    width: fit-content;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .reaction-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.85rem;
    border-radius: 100px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--net-text-muted);
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .reaction-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: white;
    transform: translateY(-2px);
  }

  .reaction-btn.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .count {
    min-width: 1ch;
  }

  .tooltip {
    position: absolute;
    bottom: 120%;
    left: 50%;
    transform: translateX(-50%) translateY(5px);
    background: white;
    color: black;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    opacity: 0;
    pointer-events: none;
    transition: 0.2s;
    white-space: nowrap;
  }

  .reaction-btn:hover .tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
</style>
