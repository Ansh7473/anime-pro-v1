<script lang="ts">
  import {
    Globe,
    Send,
    MessageSquare,
    Shield,
    Mail,
    Heart,
    ExternalLink
  } from 'lucide-svelte';

  const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer">
  <div class="footer-grid container">
    <!-- Brand -->
    <div class="footer-section brand-section">
      <div class="footer-logo">
        <span class="logo-text">WATCH<span class="accent">ANIMEZ</span></span>
      </div>
      <p class="footer-desc">
        Your premium anime streaming destination. Discover trending series, seasonal hits, classic favorites, and the latest movies — all in one place with fast, reliable streaming.
      </p>
      <div class="social-links">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" class="social-icon">
          <Globe size={18} />
        </a>
        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord" class="social-icon">
          <MessageSquare size={18} />
        </a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" class="social-icon">
          <Send size={18} />
        </a>
        <a href="mailto:support@watchanimez.me" aria-label="Email" class="social-icon">
          <Mail size={18} />
        </a>
      </div>
    </div>

    <!-- Browse -->
    <div class="footer-section">
      <h3 class="section-title">Browse</h3>
      <ul class="footer-links">
        <li><a href="/explore">Explore</a></li>
        <li><a href="/latest">Latest Releases</a></li>
        <li><a href="/schedule">Schedule</a></li>
        <li><a href="/movies">Movies</a></li>
        <li><a href="/tv-series">TV Series</a></li>
      </ul>
    </div>

    <!-- Community -->
    <div class="footer-section">
      <h3 class="section-title">Community</h3>
      <ul class="footer-links">
        <li><a href="https://github.com" target="_blank" rel="noopener noreferrer"><Globe size={14} /> GitHub</a></li>
        <li><a href="https://discord.com" target="_blank" rel="noopener noreferrer"><MessageSquare size={14} /> Discord</a></li>
        <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><Send size={14} /> Twitter</a></li>
        <li><a href="/donate"><Heart size={14} /> Support Us</a></li>
      </ul>
    </div>

    <!-- Legal -->
    <div class="footer-section">
      <h3 class="section-title">Legal</h3>
      <ul class="footer-links">
        <li><a href="/about">About Us</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms & Conditions</a></li>
        <li><a href="/dmca">DMCA Policy</a></li>
        <li><a href="/faq">FAQ</a></li>
      </ul>
    </div>
  </div>

  <div class="footer-bottom">
    <div class="container bottom-content">
      <p class="copyright">&copy; {currentYear} WatchAnimez. All rights reserved.</p>
      <div class="legal-links">
        <a href="/terms">Terms of Service</a>
        <span class="divider">·</span>
        <a href="/privacy">Privacy Policy</a>
        <span class="divider">·</span>
        <a href="/dmca">DMCA</a>
        <span class="divider">·</span>
        <a href="/faq">FAQ</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    background: #050505;
    border-top: 1px solid rgba(229, 9, 20, 0.1);
    padding-top: 4rem;
    margin-top: 2rem;
    position: relative;
    z-index: 10;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 3rem;
    padding-bottom: 4rem;
  }

  .footer-section {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .footer-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-text {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .logo-text .accent { color: var(--net-red); }

  .footer-desc {
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.7;
    max-width: 340px;
  }

  .social-links {
    display: flex;
    gap: 0.75rem;
  }

  .social-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
    transition: all 0.2s;
    text-decoration: none;
  }
  .social-icon:hover {
    background: rgba(229, 9, 20, 0.1);
    border-color: var(--net-red);
    color: var(--net-red);
    transform: translateY(-2px);
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    position: relative;
    padding-bottom: 10px;
  }

  .section-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 2px;
    background: var(--net-red);
  }

  .footer-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .footer-links a {
    font-size: 0.88rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    text-decoration: none;
  }

  .footer-links a:hover {
    color: var(--net-red);
    transform: translateX(4px);
  }

  .footer-bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.5rem 0;
    background: #030303;
  }

  .bottom-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .copyright {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.35);
    font-weight: 500;
  }

  .legal-links {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .legal-links a {
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s;
    text-decoration: none;
  }

  .legal-links a:hover { color: #fff; }

  .divider { color: rgba(255, 255, 255, 0.15); }

  @media (max-width: 1024px) {
    .footer-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 600px) {
    .footer-grid {
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
    .bottom-content {
      flex-direction: column;
      text-align: center;
      gap: 1rem;
    }
    .site-footer {
      padding-bottom: 80px;
    }
  }
</style>
