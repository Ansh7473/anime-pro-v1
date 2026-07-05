<script lang="ts">
  import { browser } from '$app/environment';
  import { X } from 'lucide-svelte';

  let visible = $state(false);
  let message = $state('');
  let dismissed = $state(false);

  if (browser) {
    // Check AniList directly — if it's down, show banner even when Jikan fallback works
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ Media(id:1,type:ANIME){id} }' })
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (body.errors || !body.data) {
          message = 'AniList API is temporarily down — content is served from backup sources. Streaming & watch pages are unaffected.';
          visible = true;
        }
      })
      .catch(() => {
        // CORS block or network error — AniList is unreachable
        message = 'AniList API is temporarily down — content is served from backup sources. Streaming & watch pages are unaffected.';
        visible = true;
      });
  }
</script>

{#if visible && !dismissed}
  <div class="status-banner" role="alert">
    <div class="status-content">
      <span class="status-icon">⚠️</span>
      <p class="status-text">{message}</p>
      <button class="status-close" onclick={() => dismissed = true} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  </div>
{/if}

<style>
  .status-banner {
    background: linear-gradient(90deg, rgba(255, 160, 0, 0.12), rgba(255, 100, 0, 0.08));
    border-bottom: 1px solid rgba(255, 160, 0, 0.25);
    position: relative;
    z-index: 100;
  }

  .status-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 1rem;
  }

  .status-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  .status-text {
    font-size: 0.8rem;
    color: rgba(255, 200, 100, 0.95);
    margin: 0;
    flex: 1;
    line-height: 1.4;
  }

  .status-close {
    background: none;
    border: none;
    color: rgba(255, 200, 100, 0.6);
    cursor: pointer;
    padding: 0.25rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }

  .status-close:hover {
    color: rgba(255, 200, 100, 1);
  }

  @media (max-width: 640px) {
    .status-text {
      font-size: 0.75rem;
    }
  }
</style>
