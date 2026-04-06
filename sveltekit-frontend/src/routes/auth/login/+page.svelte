<script lang="ts">
  import { api } from "$lib/api";
  import { loginUser } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    error = "";
    try {
      const res = await api.login({ email, password });
      if (res?.token) {
        loginUser(res.user, res.token);
        goto("/");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (e: any) {
      error = e.message || "Failed to establish connection. Check your credentials.";
    } finally {
      loading = false;
    }
  }

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });
</script>

<svelte:head>
  <title>Login / AnimePro</title>
</svelte:head>

<div class="netflix-page" class:ready={mounted}>
  <!-- Cinematic Background -->
  <div class="hero-bg">
    <div class="poster-overlay"></div>
    <div class="gradient-overlay"></div>
  </div>

  <main class="login-wrapper">
    <div class="login-card glass">
      <header class="login-header">
        <h1>Welcome Back</h1>
        <p class="subtitle">Access your AnimePro operator profile</p>
      </header>

      {#if error}
        <div class="error-alert">
          <span>{error}</span>
        </div>
      {/if}

      <form onsubmit={handleLogin} class="login-form">
        <div class="form-group">
          <div class="input-container">
            <input
              type="email"
              id="email"
              bind:value={email}
              required
              autocomplete="email"
            />
            <label for="email" class:active={email}>Operator ID / Email</label>
            <div class="focus-border"></div>
          </div>
        </div>

        <div class="form-group">
          <div class="input-container">
            <input
              type="password"
              id="password"
              bind:value={password}
              required
              autocomplete="current-password"
            />
            <label for="password" class:active={password}>Access Key / Password</label>
            <div class="focus-border"></div>
          </div>
        </div>

        <button type="submit" class="submit-btn" disabled={loading}>
          {#if loading}
            <span class="loader"></span>
            INITIALIZING...
          {:else}
            ESTABLISH CONNECTION
          {/if}
        </button>
      </form>

      <footer class="login-footer">
        <div class="footer-links">
          <span class="new-text">New Operator?</span>
          <a href="/auth/register" class="signup-link">Register Account</a>
        </div>
      </footer>
    </div>
  </main>
</div>

<style>
  :global(:root) {
    --n-bg: #000;
    --n-card-bg: rgba(0, 0, 0, 0.75);
    --n-accent: #0088ff;
    --n-text: #fff;
    --n-text-muted: #8c8c8c;
    --n-input-bg: #333;
    --n-error: #e87c03;
  }

  .netflix-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--n-bg);
    color: var(--n-text);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .netflix-page.ready {
    opacity: 1;
  }

  /* Cinematic Background */
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .poster-overlay {
    position: absolute;
    inset: 0;
    background: url('https://images.unsplash.com/photo-1541562232579-512a21359920?auto=format&fit=crop&q=60&w=1200') center/cover;
    filter: blur(20px) brightness(0.3);
    transform: scale(1.1);
  }

  .gradient-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%),
                linear-gradient(to bottom, rgba(0,0,0,0.5), #000);
  }

  .login-wrapper {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 450px;
    padding: 1.5rem;
  }

  .login-card {
    background: var(--n-card-bg);
    padding: 3.5rem 4rem;
    border-radius: 8px;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  }

  .login-header {
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2.2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.5px;
  }

  .subtitle {
    color: var(--n-text-muted);
    font-size: 0.95rem;
    font-weight: 500;
  }

  .error-alert {
    background: var(--n-error);
    padding: 0.75rem 1rem;
    border-radius: 4px;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    position: relative;
  }

  .input-container {
    position: relative;
    background: var(--n-input-bg);
    border-radius: 4px;
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    padding: 1.5rem 1rem 0.5rem 1rem;
    color: #fff;
    font-size: 1rem;
    outline: none;
    height: 55px;
  }

  label {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--n-text-muted);
    font-size: 1rem;
    transition: 0.2s ease all;
    pointer-events: none;
  }

  label.active, input:focus + label {
    top: 15px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--n-text-muted);
  }

  .focus-border {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--n-accent);
    transition: 0.3s ease width;
  }

  input:focus ~ .focus-border {
    width: 100%;
  }

  .submit-btn {
    margin-top: 1.5rem;
    background: var(--n-accent);
    color: #fff;
    border: none;
    padding: 1rem;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.2s ease, filter 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    letter-spacing: 0.5px;
  }

  .submit-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: scale(1.02);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loader {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .login-footer {
    margin-top: 3rem;
  }

  .footer-links {
    display: flex;
    gap: 0.5rem;
    font-size: 0.95rem;
  }

  .new-text {
    color: var(--n-text-muted);
  }

  .signup-link {
    color: #fff;
    text-decoration: none;
    font-weight: 600;
  }

  .signup-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 3rem 1.5rem;
      background: #000;
      border-radius: 0;
    }
    .netflix-page {
      align-items: flex-start;
      background: #000;
    }
    .hero-bg {
      display: none;
    }
  }
</style>
