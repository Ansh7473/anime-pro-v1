<script lang="ts">
  import { browser } from '$app/environment';
  import { X } from 'lucide-svelte';

  let visible = $state(false);
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
          visible = true;
        }
      })
      .catch(() => {
        // CORS block or network error — AniList is unreachable
        visible = true;
      });
  }
</script>

{#if visible && !dismissed}
  <div class="status-banner" role="alert">
    <div class="status-content">
      <span class="status-icon" aria-hidden="true">⚠️</span>
      <p class="status-text">
        Search may be limited while AniList is down. Streaming still works.
        <a class="status-link" href="/search">Try search</a>
        or open an anime by ID in the URL.
      </p>
      <button class="status-close" onclick={() => dismissed = true} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  </div>
{/if}

<style>
  .status-banner {
    background: linear-gradient(90deg, rgba(255, 160, 0, 0.15), rgba(255, 100, 0, 0.1));
    border-bottom: 1px solid rgba(255, 160, 0, 0.25);
    position: fixed;
    /* Match navbar height + notch */
    top: calc(64px + env(safe-area-inset-top, 0px));
    left: 0;
    right: 0;
    z-index: 999;
  }

  /* Align with Navbar mobile breakpoint (1024) */
  @media (max-width: 1024px) {
    .status-banner {
      top: calc(56px + env(safe-area-inset-top, 0px));
    }
  }

  .status-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 1rem;
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
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .status-link {
    color: #ffd27a;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .status-close {
    background: none;
    border: none;
    color: rgba(255, 200, 100, 0.6);
    cursor: pointer;
    padding: 0.35rem;
    min-width: 36px;
    min-height: 36px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .status-close:hover {
    color: rgba(255, 200, 100, 1);
  }

  @media (max-width: 640px) {
    .status-text {
      font-size: 0.75rem;
    }
    .status-content {
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
    }
  }
</style>
