<script lang="ts">
  import { Heart, Copy, Shield, QrCode } from 'lucide-svelte';

  let copied = $state(false);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }
</script>

<svelte:head>
  <title>Support WatchAnimez</title>
  <meta name="description" content="Support WatchAnimez development, hosting, and keep the platform ad-free for everyone." />
</svelte:head>

<div class="donate-page container">
  <div class="page-header">
    <div class="heart-badge">
      <Heart size={18} fill="currentColor" />
      <span>Support Us</span>
    </div>
    <h1 class="page-title">Support WatchAnimez</h1>
    <p class="page-subtitle">
      Help us keep WatchAnimez free, fast, and ad-free for everyone.
      Your support goes directly toward server costs, development, and keeping the platform running smoothly.
    </p>
  </div>

  <div class="donation-grid">
    <!-- UPI / Paytm Card -->
    <section class="donation-card primary">
      <div class="profile-header">
        <div class="avatar-ring">
          <img src="/profile_avatar.png" alt="Profile" class="avatar-img" />
        </div>
        <div class="profile-name">
          <span>Ansh Soni</span>
          <div class="verified-badge">
            <Shield size={10} class="text-white" fill="currentColor" />
          </div>
        </div>
        <span class="profile-role">Developer & Maintainer</span>
      </div>

      <h2 class="method-title">Pay via UPI</h2>

      <div class="qr-container">
        <div class="qr-frame">
          <img src="/paytm_qr.jpg" alt="UPI QR Code" class="qr-image"
            onerror={(e) => { (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=9516611492@ptsbi&pn=Ansh%20Soni&cu=INR' }} />
        </div>
      </div>

      <div class="upi-details">
        <div class="upi-label">UPI ID</div>
        <code class="upi-code">9516611492@ptsbi</code>

        <button
          onclick={() => copyToClipboard('9516611492@ptsbi')}
          class="copy-btn"
          class:copied
        >
          {#if copied}
            <span>✓ Copied!</span>
          {:else}
            <Copy size={16} />
            <span>Copy UPI ID</span>
          {/if}
        </button>

        <div class="app-logos">
          <span class="app-label">Scan with any UPI app</span>
          <div class="logo-row">
            <img src="/paytm_logo.png" alt="Paytm" loading="lazy" decoding="async" />
            <img src="/phonepe_logo.png" alt="PhonePe" loading="lazy" decoding="async" />
            <img src="/googlepay_logo.png" alt="Google Pay" loading="lazy" decoding="async" />
            <img src="/bhim_logo.png" alt="BHIM" />
          </div>
        </div>
      </div>
    </section>

    <!-- Crypto Card (Coming Soon) -->
    <section class="donation-card secondary">
      <div class="coming-soon-content">
        <div class="coming-icon">
          <QrCode size={48} />
        </div>
        <h2 class="method-title">Cryptocurrency</h2>
        <p class="coming-text">Crypto donation support is coming soon. We're working on integrating secure crypto payment options.</p>
        <span class="coming-badge">Coming Soon</span>
      </div>
    </section>
  </div>

  <div class="thank-you">
    <p>Thank you for supporting WatchAnimez! Every contribution helps us stay ad-free and keep the platform running. 💙</p>
  </div>
</div>

<style>
  .donate-page {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 900px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .heart-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.2);
    padding: 0.4rem 1rem;
    border-radius: 50px;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--net-red);
    margin-bottom: 1rem;
  }

  .page-title {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.75rem;
  }

  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 1rem;
    max-width: 550px;
    margin: 0 auto;
    line-height: 1.7;
  }

  .donation-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .donation-card {
    padding: 2.5rem;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.3s ease;
  }

  .donation-card:hover {
    transform: translateY(-4px);
  }

  .donation-card.primary {
    background: rgba(229, 9, 20, 0.04);
    border: 1px solid rgba(229, 9, 20, 0.15);
  }

  .donation-card.secondary {
    background: rgba(255, 255, 255, 0.02);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    justify-content: center;
  }

  .profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.5rem;
    gap: 0.5rem;
  }

  .avatar-ring {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    padding: 3px;
    background: linear-gradient(135deg, var(--net-red), #7c040a);
    overflow: hidden;
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #0a0a0a;
  }

  .profile-name {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
  }

  .verified-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: var(--net-red);
    border-radius: 50%;
  }

  .profile-role {
    font-size: 0.78rem;
    color: var(--net-text-muted);
  }

  .method-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: white;
  }

  .qr-container {
    margin-bottom: 1.5rem;
  }

  .qr-frame {
    padding: 1rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .qr-image {
    width: 200px;
    height: 200px;
    display: block;
    object-fit: contain;
  }

  .upi-details {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .upi-label {
    font-size: 0.75rem;
    color: var(--net-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .upi-code {
    font-family: monospace;
    font-size: 1rem;
    color: white;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    border-radius: 8px;
    text-align: center;
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: var(--net-red);
    color: white;
    border: none;
    padding: 0.85rem;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .copy-btn:hover {
    filter: brightness(1.1);
  }

  .copy-btn.copied {
    background: rgba(74, 222, 128, 0.15);
    border: 1px solid rgba(74, 222, 128, 0.3);
    color: #4ade80;
  }

  .app-logos {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .app-label {
    font-size: 0.72rem;
    color: var(--net-text-muted);
    letter-spacing: 0.05em;
  }

  .logo-row {
    display: flex;
    gap: 1.25rem;
    align-items: center;
  }

  .logo-row img {
    height: 22px;
    opacity: 0.7;
    transition: all 0.2s;
  }

  .logo-row img:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .coming-soon-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }

  .coming-icon {
    color: var(--net-text-muted);
    opacity: 0.3;
  }

  .coming-text {
    color: var(--net-text-muted);
    font-size: 0.88rem;
    line-height: 1.6;
    max-width: 280px;
  }

  .coming-badge {
    font-size: 0.75rem;
    padding: 0.35rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50px;
    color: var(--net-text-muted);
    font-weight: 600;
  }

  .thank-you {
    text-align: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
  }

  .thank-you p {
    color: var(--net-text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.8rem; }
    .page-subtitle { font-size: 0.92rem; }
    .donation-card { padding: 2rem 1.5rem; }
    .qr-image { width: 180px; height: 180px; }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.5rem; }
    .donation-grid { grid-template-columns: 1fr; }
    .donation-card { padding: 1.5rem; }
    .qr-image { width: 160px; height: 160px; }
  }
</style>
