 <script lang="ts">
  import { onMount } from 'svelte';

  const { onDone }: { onDone: () => void } = $props();

  let visible = $state(true);
  let videoEl: HTMLVideoElement;

  function dismiss() {
    if (!visible) return;
    visible = false;
    setTimeout(onDone, 650);
  }

  onMount(() => {
    if (videoEl) {
      videoEl.play().catch(() => dismiss());
    }

    // Skip on any keypress too
    const onKey = () => dismiss();
    window.addEventListener('keydown', onKey, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="splash-overlay"
  class:hidden={!visible}
  onclick={dismiss}
  role="presentation"
  aria-hidden="true"
>
  <video
    bind:this={videoEl}
    src="/logo-anim-wide.mp4"
    class="splash-video"
    muted
    playsinline
    autoplay
    preload="auto"
    onended={dismiss}
  ></video>

  <p class="skip-hint">Tap anywhere to skip</p>
</div>

<style>
  /* Full-viewport fixed layer — nothing shifts it */
  .splash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: #000;
    margin: 0;
    padding: 0;
    opacity: 1;
    transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  .splash-overlay.hidden {
    opacity: 0;
    pointer-events: none;
  }

  /*
   * Video absolutely fills the overlay.
   * object-fit: contain = black letterbox bars keep 16:9 intact on every
   * screen size — desktop wide, mobile portrait, tablet, TV, all good.
   */
  .splash-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
    display: block;
  }

  /* Skip hint floats above the video */
  .skip-hint {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-family: inherit;
    pointer-events: none;
    white-space: nowrap;
    animation: pulse-hint 2s ease-in-out infinite;
  }

  @keyframes pulse-hint {
    0%, 100% { opacity: 0.5; }
    50%       { opacity: 1;   }
  }

  @media (max-width: 480px) {
    .skip-hint {
      bottom: 1.5rem;
      font-size: 0.72rem;
    }
  }
</style>
