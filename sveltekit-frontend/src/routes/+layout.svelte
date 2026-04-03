<script lang="ts">
  import "../app.css";
  import Navbar from "$lib/components/Navbar.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { page } from "$app/state";

  let { children } = $props();

  // Check if we can go back (not on home page)
  let canGoBack = $derived(page.url.pathname !== "/");

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  }
</script>

<div class="app">
  <Navbar />

  <!-- Floating back button for Android -->
  {#if canGoBack}
    <button class="back-fab" onclick={handleBack} aria-label="Go back" title="Go back">
      ←
    </button>
  {/if}

  <main class="main-content">
    {@render children()}
  </main>
  <Footer />
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main-content {
    padding-top: 64px;
    min-height: 100vh;
    flex: 1;
  }

  /* Floating back button — mobile/Android APK */
  .back-fab {
    display: none;
  }

  @media (max-width: 768px) {
    .main-content {
      padding-top: 56px;
    }

    .back-fab {
      display: flex;
      position: fixed;
      bottom: 1.5rem;
      left: 1rem;
      z-index: 999;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(229, 9, 20, 0.85);
      color: white;
      font-size: 1.3rem;
      font-weight: 700;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 44px;
      min-width: 44px;
    }
    .back-fab:active {
      transform: scale(0.9);
      background: rgba(229, 9, 20, 1);
    }
  }

  @media (max-width: 480px) {
    .main-content {
      padding-top: 52px;
    }
    .back-fab {
      bottom: 1.25rem;
      left: 0.75rem;
      width: 40px;
      height: 40px;
      font-size: 1.2rem;
      min-height: 40px;
      min-width: 40px;
    }
  }
</style>
