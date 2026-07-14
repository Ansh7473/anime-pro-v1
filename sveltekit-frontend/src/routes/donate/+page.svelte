<script lang="ts">
  import { Heart, Wallet } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Support WatchAnimez — Donate</title>
  <meta name="description" content="Support WatchAnimez development, hosting, and keep the platform ad-free for everyone." />
  <meta property="og:title" content="Support WatchAnimez — Donate" />
  <meta property="og:description" content="Support WatchAnimez development, hosting, and keep the platform ad-free for everyone." />
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
    <!-- Binance Crypto Card -->
    <section class="donation-card primary">
      <div class="crypto-badge">
        <Wallet size={14} />
        <span>Cryptocurrency Only</span>
      </div>

      <h2 class="method-title">Pay via Binance</h2>

      <div class="qr-container">
        <div class="qr-frame">
          <img src="/binance_qr.png" alt="Binance QR Code" class="qr-image" />
        </div>
      </div>

      <div class="crypto-details">
        <div class="crypto-label">Binance Pay</div>
        <p class="crypto-info">Scan the QR code above with your Binance app to send crypto directly.</p>

        <div class="crypto-note">
          <Wallet size={16} />
          <span>We only accept cryptocurrency via Binance</span>
        </div>
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
    border: 1px solid rgba(255, 138, 61, 0.22);
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
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
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
    padding: 0.6rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .qr-image {
    width: 220px;
    height: 220px;
    display: block;
    object-fit: cover;
    transform: scale(1.15);
  }

    .crypto-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: rgba(243, 186, 47, 0.1);
    border: 1px solid rgba(243, 186, 47, 0.25);
    padding: 0.35rem 0.9rem;
    border-radius: 50px;
    font-size: 0.78rem;
    font-weight: 600;
    color: #f3ba2f;
    margin-bottom: 1rem;
  }

  .crypto-details {
    width: 100%;
    background: rgba(0, 0, 0, 0.3);
    padding: 1.25rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }

  .crypto-label {
    font-size: 0.75rem;
    color: var(--net-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .crypto-info {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .crypto-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(243, 186, 47, 0.06);
    border: 1px solid rgba(243, 186, 47, 0.15);
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    color: #f3ba2f;
    margin-top: 0.25rem;
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
    .qr-image { width: 200px; height: 200px; }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.5rem; }
    .donation-grid { grid-template-columns: 1fr; }
    .donation-card { padding: 1.5rem; }
    .qr-image { width: 180px; height: 180px; }
  }
</style>
