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

<div class="netflix-container" class:ready={mounted}>
  <!-- Background Image Overlay (Mirror of Reference) -->
  <div class="bg-wrapper">
    <div class="bg-image"></div>
    <div class="bg-overlay"></div>
  </div>

  <!-- Header Section (Mirror of Reference) -->
  <header class="netflix-header">
    <div class="logo">ANIMEPRO</div>
  </header>

  <!-- Login Form Main (Mirror of Reference) -->
  <main class="auth-main">
    <div class="auth-card">
      <h1>Sign In</h1>

      {#if error}
        <div class="error-box">
          {error}
        </div>
      {/if}

      <form onsubmit={handleLogin} class="auth-form">
        <div class="form-group">
          <div class="input-wrapper">
            <input
              type="email"
              id="email"
              bind:value={email}
              placeholder=" "
              required
              autocomplete="email"
            />
            <label for="email">Email or phone number</label>
            <div class="focus-ring"></div>
          </div>
        </div>

        <div class="form-group">
          <div class="input-wrapper">
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder=" "
              required
              autocomplete="current-password"
            />
            <label for="password">Password</label>
            <div class="focus-ring"></div>
          </div>
        </div>

        <button type="submit" class="submit-btn" disabled={loading}>
          {#if loading}
            <div class="spinner"></div>
          {:else}
            Sign In
          {/if}
        </button>

        <div class="form-extras">
          <label class="remember">
            <input type="checkbox" />
            <span>Remember me</span>
          </label>
          <a href="#" class="help-link">Need help?</a>
        </div>
      </form>

      <div class="auth-footer-content">
        <p>
          New to AnimePro? 
          <a href="/auth/register" class="signup-link">Sign up now.</a>
        </p>
        <p class="captcha-text">
          This page is protected by Google reCAPTCHA to ensure you're not a bot. 
          <a href="#" class="learn-more">Learn more.</a>
        </p>
      </div>
    </div>
  </main>

  <!-- Global Footer (Mirror of Reference) -->
  <footer class="global-footer">
    <div class="footer-inner">
      <p>Questions? Contact us.</p>
      <div class="footer-links">
        <a href="#">FAQ</a>
        <a href="#">Help Center</a>
        <a href="#">Terms of Use</a>
        <a href="#">Privacy</a>
        <a href="#">Cookie Preferences</a>
        <a href="#">Corporate Information</a>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(:root) {
    --netflix-red: #e50914;
    --netflix-red-hover: #c11119;
    --netflix-dark: #333;
    --netflix-muted: #8c8c8c;
    --netflix-bg: #000;
  }

  .netflix-container {
    position: relative;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--netflix-bg);
    color: #fff;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .netflix-container.ready {
    opacity: 1;
  }

  /* Background Port */
  .bg-wrapper {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
  }

  .bg-image {
    position: absolute;
    inset: 0;
    background: url('https://picsum.photos/seed/anime/1920/1080?blur=2') center/cover;
    opacity: 0.5;
    background-color: #000;
  }

  .bg-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.8) 100%);
  }

  /* Header Port */
  .netflix-header {
    position: relative;
    z-index: 10;
    padding: 24px 48px;
  }

  .logo {
    color: var(--netflix-red);
    font-weight: 700;
    font-size: 2.5rem;
    letter-spacing: -1px;
    font-family: 'Arial Black', Gadget, sans-serif;
  }

  /* Main Card Port */
  .auth-main {
    position: relative;
    z-index: 10;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 20px 80px 20px;
  }

  .auth-card {
    width: 100%;
    max-width: 450px;
    min-height: 600px;
    background: rgba(0, 0, 0, 0.75);
    padding: 60px 68px 40px;
    border-radius: 4px;
    box-sizing: border-box;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 28px;
  }

  .error-box {
    background: #e87c03;
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 0.9rem;
    margin-bottom: 16px;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Input & Floating Label Port (Mirror of Reference) */
  .input-wrapper {
    position: relative;
    background: var(--netflix-dark);
    border-radius: 4px;
    min-height: 50px;
  }

  input {
    width: 100%;
    padding: 16px 20px 0;
    height: 50px;
    background: transparent;
    border: none;
    outline: none;
    color: #fff;
    font-size: 1rem;
    box-sizing: border-box;
  }

  label {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--netflix-muted);
    font-size: 1rem;
    transition: 0.15s ease all;
    pointer-events: none;
  }

  input:focus + label,
  input:not(:placeholder-shown) + label {
    top: 15px;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .focus-ring {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #fff;
    transform: scaleX(0);
    transition: 0.2s ease transform;
  }

  input:focus ~ .focus-ring {
    transform: scaleX(1);
    background: rgba(255, 255, 255, 0.3);
  }

  /* Button Port */
  .submit-btn {
    margin-top: 24px;
    background: var(--netflix-red);
    color: #fff;
    font-weight: 700;
    font-size: 1rem;
    padding: 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--netflix-red-hover);
  }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Extras Port */
  .form-extras {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #b3b3b3;
    margin-top: 8px;
  }

  .remember {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }

  .help-link {
    color: inherit;
    text-decoration: none;
  }

  .help-link:hover {
    text-decoration: underline;
  }

  /* Footer Content Port */
  .auth-footer-content {
    margin-top: 60px;
    color: var(--netflix-muted);
    font-size: 1rem;
  }

  .auth-footer-content p {
    margin-bottom: 12px;
  }

  .signup-link {
    color: #fff;
    text-decoration: none;
    font-weight: 500;
  }

  .signup-link:hover {
    text-decoration: underline;
  }

  .captcha-text {
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .learn-more {
    color: #0071eb;
    text-decoration: none;
  }

  .learn-more:hover {
    text-decoration: underline;
  }

  /* Global Footer Port */
  .global-footer {
    position: relative;
    z-index: 10;
    background: rgba(0, 0, 0, 0.75);
    padding: 30px 48px;
    border-top: 1px solid var(--netflix-dark);
    margin-top: auto;
  }

  .footer-inner {
    max-width: 1000px;
    margin: 0 auto;
    color: #737373;
  }

  .footer-inner p {
    margin-bottom: 30px;
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    font-size: 0.8rem;
  }

  .footer-links a {
    color: inherit;
    text-decoration: none;
  }

  .footer-links a:hover {
    text-decoration: underline;
  }

  /* Spinner Animation */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Mobile Adjustments */
  @media (max-width: 740px) {
    .bg-image, .bg-overlay { display: none; }
    .netflix-container { background: #000; }
    .auth-card {
      background: transparent;
      padding: 20px 0;
      max-width: none;
    }
    .netflix-header { padding: 20px; }
    .global-footer { border-top: 1px solid var(--netflix-dark); }
    .footer-links { grid-template-columns: repeat(2, 1fr); }
  }
</style>
