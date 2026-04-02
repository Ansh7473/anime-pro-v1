<script lang="ts">
  import "../app.css";
  import Navbar from "$lib/components/Navbar.svelte";
  import Footer from "$lib/components/Footer.svelte";

  let { children } = $props();
</script>

<div class="app">
  <Navbar />
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

  @media (max-width: 768px) {
    .main-content {
      padding-top: 56px;
    }
  }

  @media (max-width: 480px) {
    .main-content {
      padding-top: 52px;
    }
  }
</style>
