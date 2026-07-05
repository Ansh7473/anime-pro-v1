<script lang="ts">
  import { page } from '$app/state';
  import { Home, Search, ArrowLeft } from 'lucide-svelte';

  let { status, error } = $props<{ status: number; error?: Error & { message?: string } }>();

  const statusMessages: Record<number, { title: string; description: string }> = {
    404: {
      title: 'Page Not Found',
      description: "The page you're looking for doesn't exist or has been moved. Let's get you back to watching anime."
    },
    500: {
      title: 'Something Went Wrong',
      description: "We encountered an unexpected error. Our team has been notified and is working to fix it. Please try again shortly."
    }
  };

  const info = $derived(statusMessages[status] || {
    title: status >= 500 ? 'Server Error' : 'Page Not Found',
    description: status >= 500
      ? 'An unexpected server error occurred. Please try again later.'
      : "We couldn't find the page you were looking for."
  });
</script>

<svelte:head>
  <title>{status} — {info.title} | WatchAnimez</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="error-page">
  <div class="error-content">
    <div class="error-code">{status}</div>
    <h1 class="error-title">{info.title}</h1>
    <p class="error-desc">{info.description}</p>

    {#if status === 500 && error?.message}
      <div class="error-detail">
        <p>Technical details: {error.message}</p>
      </div>
    {/if}

    <div class="error-actions">
      <a href="/" class="btn-primary">
        <Home size={18} />
        Go Home
      </a>
      <button class="btn-secondary" onclick={() => window.history.back()}>
        <ArrowLeft size={18} />
        Go Back
      </button>
      <a href="/search" class="btn-secondary">
        <Search size={18} />
        Search Anime
      </a>
    </div>

    <div class="error-help">
      <p>Need help? <a href="/contact">Contact our support team</a> or check the <a href="/faq">FAQ</a>.</p>
    </div>
  </div>

  <div class="error-visual">
    {#if status === 404}
      <img
        src="https://media.giphy.com/media/p4w0AMZJa2EtG/giphy.gif"
        alt="Shocked anime character"
        class="error-gif"
      />
    {:else}
      <img
        src="https://media.giphy.com/media/darauqjZo6FsA/giphy.gif"
        alt="Panicking anime character"
        class="error-gif"
      />
    {/if}
    <div class="bg-text">{status}</div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding: 2rem 1rem;
    position: relative;
    overflow: hidden;
  }

  .error-content {
    text-align: center;
    max-width: 600px;
    position: relative;
    z-index: 2;
  }

  .error-code {
    font-size: clamp(6rem, 15vw, 12rem);
    font-weight: 900;
    color: var(--net-red);
    line-height: 1;
    letter-spacing: -0.05em;
    opacity: 0.15;
    margin-bottom: -2rem;
    user-select: none;
  }

  .error-title {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 1rem;
    color: white;
  }

  .error-desc {
    color: var(--net-text-muted);
    font-size: 1.1rem;
    line-height: 1.7;
    margin-bottom: 2.5rem;
    max-width: 480px;
    margin-inline: auto;
  }

  .error-detail {
    background: rgba(229, 9, 20, 0.08);
    border: 1px solid rgba(229, 9, 20, 0.2);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 2rem;
    font-family: monospace;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    word-break: break-all;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }

  .error-actions a,
  .error-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 12px;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
    font-family: inherit;
  }

  .error-help {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }
  .error-help a {
    color: var(--net-red);
    text-decoration: none;
  }
  .error-help a:hover {
    text-decoration: underline;
  }

  .error-visual {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 1;
  }

  .error-gif {
    position: absolute;
    width: min(320px, 55vw);
    height: auto;
    border-radius: 16px;
    opacity: 0.18;
    object-fit: contain;
    mix-blend-mode: lighten;
  }

  .bg-text {
    font-size: clamp(15rem, 40vw, 35rem);
    font-weight: 900;
    color: rgba(255, 255, 255, 0.015);
    line-height: 1;
    letter-spacing: -0.05em;
    user-select: none;
  }

  @media (max-width: 768px) {
    .error-page {
      min-height: 70vh;
      padding: 2rem 1rem 4rem;
    }
    .error-code {
      font-size: 5rem;
      margin-bottom: -1rem;
    }
    .error-title {
      font-size: 1.6rem;
    }
    .error-desc {
      font-size: 0.95rem;
    }
    .error-actions {
      flex-direction: column;
      align-items: center;
    }
    .error-actions a,
    .error-actions button {
      width: 100%;
      max-width: 280px;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .error-page {
      min-height: 60vh;
    }
    .error-code {
      font-size: 4rem;
    }
    .error-title {
      font-size: 1.4rem;
    }
    .error-desc {
      font-size: 0.88rem;
    }
  }
</style>
