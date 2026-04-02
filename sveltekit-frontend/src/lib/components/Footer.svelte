<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-logo">ANIME<span class="accent">PRO</span></span>
      <p class="footer-tagline">
        Your premium anime streaming destination. Built with SvelteKit + Go.
      </p>
    </div>
    <div class="footer-links">
      <a href="/">Home</a>
      <a href="/search">Search</a>
      <a href="/tv-series">TV Series</a>
      <a href="/movies">Movies</a>
    </div>
    <p class="footer-copy">
      © {new Date().getFullYear()} AnimePro. All rights reserved.
    </p>
  </div>
</footer>

<style>
  .footer {
    background: var(--net-bg-lite);
    padding: 3rem 2rem 1.5rem;
    margin-top: 4rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .footer-inner {
    max-width: 1400px;
    margin: 0 auto;
    text-align: center;
  }
  .footer-logo {
    font-size: 1.4rem;
    font-weight: 800;
  }
  .accent {
    color: var(--net-red);
  }
  .footer-tagline {
    color: var(--net-text-muted);
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
  .footer-links {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin: 1.5rem 0;
    flex-wrap: wrap;
  }
  .footer-links a {
    color: var(--net-text-muted);
    font-size: 0.9rem;
    transition: color 0.2s;
    padding: 0.5rem;
  }
  .footer-links a:hover {
    color: white;
  }
  .footer-copy {
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.8rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .footer {
      padding: 2rem 1.5rem 1.25rem;
      margin-top: 3rem;
    }
    .footer-logo {
      font-size: 1.2rem;
    }
    .footer-tagline {
      font-size: 0.8rem;
    }
    .footer-links {
      gap: 1rem;
      margin: 1.25rem 0;
    }
    .footer-links a {
      font-size: 0.85rem;
    }
    .footer-copy {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .footer {
      padding: 1.5rem 1rem 1rem;
      margin-top: 2rem;
    }
    .footer-logo {
      font-size: 1.1rem;
    }
    .footer-tagline {
      font-size: 0.75rem;
    }
    .footer-links {
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .footer-links a {
      font-size: 0.8rem;
      padding: 0.4rem;
    }
    .footer-copy {
      font-size: 0.7rem;
    }
  }
</style>
