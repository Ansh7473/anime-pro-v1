<script lang="ts">
  import { api } from "$lib/api";
  import { loginUser } from "$lib/stores/auth";
  import { goto } from "$app/navigation";
  import { Shield, Mail, Lock, User, Terminal, Cpu, UserPlus } from "lucide-svelte";
  import { onMount } from "svelte";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleRegister(e: Event) {
    e.preventDefault();
    loading = true;
    error = "";
    try {
      const res = await api.register({ name, email, password });
      // Auto-login if backend returns token
      if (res.token && res.user) {
        loginUser(res.user, res.token);
        goto("/");
      } else {
        goto("/auth/login");
      }
    } catch (e: any) {
      error = e.message || "REGISTRATION_FAILED: ACCESS_DENIED";
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
  <title>SIGN_UP // ANIMEPRO</title>
</svelte:head>

<div class="auth-page" class:ready={mounted}>
  <!-- Background Elements -->
  <div class="tactical-bg">
    <div class="grid-overlay"></div>
    <div class="vignette"></div>
    <div class="glow-point"></div>
  </div>

  <main class="auth-container">
    <div class="auth-card glass">
      <!-- Decorative Corner Brackets -->
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <!-- Card Header -->
      <header class="card-header">
        <div class="header-status">
          <span class="pulse-dot"></span>
          <span class="status-text">INITIALIZING_NEW_OPERATOR // SECURE_ENROLLMENT</span>
        </div>
        <div class="title-group">
          <h1>JOIN THE UNIT</h1>
          <div class="subtitle">
            <UserPlus size={14} />
            <span>COMMENCE_DATA_INPUT_FOR_ACCESS</span>
          </div>
        </div>
      </header>

      {#if error}
        <div class="error-box glass">
          <Shield size={18} class="error-icon" />
          <div class="error-content">
            <span class="error-title">ENROLLMENT_ERROR</span>
            <span class="error-msg">{error}</span>
          </div>
        </div>
      {/if}

      <form onsubmit={handleRegister} class="auth-form">
        <div class="form-group">
          <label for="name">
            <span class="label-text">OPERATOR_ALIAS</span>
            <span class="label-desc">Display Name for Communication</span>
          </label>
          <div class="input-wrapper">
            <User size={18} class="input-icon" />
            <input
              type="text"
              id="name"
              bind:value={name}
              placeholder="Ghost_01"
              required
              autocomplete="name"
            />
            <div class="input-focus-line"></div>
          </div>
        </div>

        <div class="form-group">
          <label for="email">
            <span class="label-text">COMMS_LINK</span>
            <span class="label-desc">Primary Email Protocol</span>
          </label>
          <div class="input-wrapper">
            <Mail size={18} class="input-icon" />
            <input
              type="email"
              id="email"
              bind:value={email}
              placeholder="operator@animepro.net"
              required
              autocomplete="email"
            />
            <div class="input-focus-line"></div>
          </div>
        </div>

        <div class="form-group">
          <label for="password">
            <span class="label-text">ACCESS_KEY</span>
            <span class="label-desc">Minimum 6 Character Encryption</span>
          </label>
          <div class="input-wrapper">
            <Lock size={18} class="input-icon" />
            <input
              type="password"
              id="password"
              bind:value={password}
              placeholder="••••••••••••"
              required
              minlength="6"
              autocomplete="new-password"
            />
            <div class="input-focus-line"></div>
          </div>
        </div>

        <button type="submit" class="submit-btn" disabled={loading}>
          <div class="btn-content">
            <Cpu size={20} class={loading ? 'spin' : ''} />
            <span>
              {loading ? "ENROLLING_OPERATOR..." : "FINALIZE_ENROLLMENT"}
            </span>
          </div>
          <div class="btn-background"></div>
        </button>
      </form>

      <footer class="card-footer">
        <div class="footer-divider">
          <span>OR</span>
        </div>
        <div class="footer-links">
          <span class="footer-text">EXISTING_OPERATOR?</span>
          <a href="/auth/login" class="accent-link">AUTHENTICATE_SESSION</a>
        </div>
      </footer>
    </div>

    <!-- Extra UI Decos -->
    <div class="tactical-meta hide-mobile">
      <div class="meta-item">
        <span class="label">SEC:</span>
        <span class="value">LEVEL_ALPHA</span>
      </div>
      <div class="meta-item">
        <span class="label">HUB:</span>
        <span class="value">ASIA_NEO_07</span>
      </div>
    </div>
  </main>
</div>

<style>
  :global(:root) {
    --auth-bg: #030708;
    --auth-accent: #00f2ff;
    --auth-accent-dim: rgba(0, 242, 255, 0.2);
    --auth-glass: rgba(10, 15, 20, 0.7);
    --auth-border: rgba(0, 242, 255, 0.15);
    --auth-text: #e0f2f1;
    --auth-text-dim: #70808a;
    --auth-error: #ff3d00;
  }

  .auth-page {
    position: relative;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--auth-bg);
    color: var(--auth-text);
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    opacity: 0;
    transition: opacity 0.8s ease;
  }

  .auth-page.ready {
    opacity: 1;
  }

  /* Background Aesthetics */
  .tactical-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
  }

  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(var(--auth-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--auth-border) 1px, transparent 1px);
    background-size: 50px 50px;
    opacity: 0.1;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, transparent 20%, var(--auth-bg) 90%);
  }

  .glow-point {
    position: absolute;
    top: 20%;
    left: 40%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(168, 85, 247, 0.15), transparent 70%);
    filter: blur(80px);
    opacity: 0.3;
  }

  .auth-container {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 480px;
    padding: 2rem;
  }

  .auth-card {
    position: relative;
    background: var(--auth-glass);
    backdrop-filter: blur(20px);
    border: 1px solid var(--auth-border);
    padding: 3rem 2.5rem;
    border-radius: 4px;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
  }

  /* Brackets */
  .corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--auth-accent);
    opacity: 0.5;
  }
  .corner.tl { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
  .corner.tr { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
  .corner.bl { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
  .corner.br { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

  /* Header */
  .card-header {
    margin-bottom: 2.5rem;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.7rem;
    letter-spacing: 2px;
    color: var(--auth-accent);
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--auth-accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(0.8); opacity: 0.5; }
  }

  h1 {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0;
    background: linear-gradient(to bottom, #fff, #b0bec5);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--auth-text-dim);
    font-size: 0.75rem;
    margin-top: 0.4rem;
    font-weight: 600;
  }

  /* Error Box */
  .error-box {
    display: flex;
    gap: 1rem;
    background: rgba(255, 61, 0, 0.05);
    border: 1px solid rgba(255, 61, 0, 0.2);
    padding: 1rem;
    margin-bottom: 2rem;
    border-radius: 4px;
    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  }

  @keyframes shake {
    10%, 90% { transform: translate3d(-1px, 0, 0); }
    20%, 80% { transform: translate3d(2px, 0, 0); }
    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
    40%, 60% { transform: translate3d(4px, 0, 0); }
  }

  .error-icon { color: var(--auth-error); }
  .error-title { display: block; font-size: 0.65rem; font-weight: 900; color: var(--auth-error); letter-spacing: 1px; }
  .error-msg { font-size: 0.85rem; font-weight: 500; }

  /* Form */
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group label {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 0.5rem;
  }

  .label-text { font-size: 0.8rem; font-weight: 800; letter-spacing: 1px; }
  .label-desc { font-size: 0.6rem; color: var(--auth-text-dim); }

  .input-wrapper {
    position: relative;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    border-radius: 4px;
  }

  .input-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--auth-text-dim);
    transition: color 0.3s ease;
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    padding: 0.85rem 1rem 0.85rem 3rem;
    color: white;
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
  }

  input::placeholder { color: rgba(255, 255, 255, 0.15); }

  .input-focus-line {
    position: absolute;
    bottom: -1px;
    left: 50%;
    width: 0;
    height: 1px;
    background: var(--auth-accent);
    transition: all 0.3s ease;
    transform: translateX(-50%);
  }

  .input-wrapper:focus-within {
    border-color: var(--auth-accent-dim);
    background: rgba(0, 242, 255, 0.02);
  }

  .input-wrapper:focus-within .input-icon { color: var(--auth-accent); }
  .input-wrapper:focus-within .input-focus-line { width: 100%; }

  /* Submit Button */
  .submit-btn {
    position: relative;
    margin-top: 1rem;
    padding: 1.2rem;
    background: transparent;
    border: 1px solid var(--auth-accent);
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s ease;
    border-radius: 4px;
  }

  .btn-content {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
    color: white;
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 1px;
  }

  .btn-background {
    position: absolute;
    inset: 0;
    background: var(--auth-accent);
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 1;
  }

  .submit-btn:hover {
    box-shadow: 0 0 20px var(--auth-accent-dim);
  }

  .submit-btn:hover .btn-background { transform: translateY(0); }
  .submit-btn:hover .btn-content { color: black; }

  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  /* Footer */
  .card-footer {
    margin-top: 2.5rem;
    text-align: center;
  }

  .footer-divider {
    position: relative;
    margin-bottom: 2rem;
    opacity: 0.3;
  }
  .footer-divider::before, .footer-divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: white;
  }
  .footer-divider::before { left: 0; }
  .footer-divider::after { right: 0; }
  .footer-divider span { font-size: 0.7rem; font-weight: 900; }

  .footer-links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .footer-text { font-size: 0.75rem; color: var(--auth-text-dim); font-weight: 600; }
  .accent-link {
    color: var(--auth-accent);
    text-decoration: none;
    font-weight: 900;
    font-size: 0.9rem;
    letter-spacing: 1px;
    transition: text-shadow 0.3s ease;
  }
  .accent-link:hover { text-shadow: 0 0 10px var(--auth-accent-dim); }

  /* Meta Decos */
  .tactical-meta {
    position: absolute;
    bottom: -2rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 0.5rem;
  }

  .meta-item { display: flex; gap: 0.5rem; font-size: 0.6rem; font-weight: 900; opacity: 0.4; }
  .meta-item .label { color: var(--auth-accent); }

  @media (max-width: 480px) {
    .auth-container { padding: 1rem; }
    .auth-card { padding: 2rem 1.5rem; }
    h1 { font-size: 1.5rem; }
    .hide-mobile { display: none; }
  }
</style>
