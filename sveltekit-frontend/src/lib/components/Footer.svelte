<script lang="ts">
  import { 
    Globe, 
    Send, 
    MessageSquare, 
    Shield, 
    Cpu, 
    Database, 
    Radio,
    Terminal
  } from 'lucide-svelte';
  
  const currentYear = new Date().getFullYear();
</script>

<footer class="tactical-footer">
  <div class="footer-grid container">
    <!-- Brand / Mission -->
    <div class="footer-section brand-section">
      <div class="footer-logo">
        <Terminal size={24} class="text-primary" />
        <span class="logo-text">ANIMEPRO<span class="dot">.</span></span>
      </div>
      <p class="mission-text">
        High-fidelity tactical interface for strategic anime distribution. 
        Advanced intelligence, seamless streaming, and operative-grade performance.
      </p>
      <div class="op-status">
        <div class="status-indicator online"></div>
        <span class="status-text">NETWORK_ONLINE // ENCRYPTED_AUTH</span>
      </div>
    </div>

    <!-- Navigation -->
    <div class="footer-section">
      <h3 class="section-title">ASSET_NAVIGATION</h3>
      <ul class="footer-links">
        <li><a href="/explore">EXPLORE_INDEX</a></li>
        <li><a href="/intel">INTEL_HUB</a></li>
        <li><a href="/schedule">DEPLOYMENT_SCHEDULE</a></li>
        <li><a href="/latest">NEW_ACQUISITIONS</a></li>
      </ul>
    </div>

    <!-- Community / Comms -->
    <div class="footer-section">
      <h3 class="section-title">COMMS_CHANNELS</h3>
      <ul class="footer-links">
        <li><a href="https://github.com" target="_blank"><Globe size={14} /> GITHUB_REPOSITORY</a></li>
        <li><a href="https://discord.com" target="_blank"><MessageSquare size={14} /> DISCORD_SERVER</a></li>
        <li><a href="https://twitter.com" target="_blank"><Send size={14} /> TWITTER_COMMS</a></li>
        <li><a href="/donate"><Shield size={14} /> SUPPORT_OPERATIONS</a></li>
      </ul>
    </div>

    <!-- Technical Specs -->
    <div class="footer-section">
      <h3 class="section-title">SYSTEM_DATA</h3>
      <div class="tech-specs">
        <div class="spec-item">
          <Cpu size={14} />
          <span>V1.0.8_STABLE</span>
        </div>
        <div class="spec-item">
          <Database size={14} />
          <span>FIRESTORE_SECURE</span>
        </div>
        <div class="spec-item">
          <Radio size={14} />
          <span>PROXY_LAYER_ACTIVE</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-bottom">
    <div class="container bottom-content">
      <p class="copyright">&copy; {currentYear} ANIMEPRO COMMAND. All operational data encrypted and distributed via secure channels.</p>
      <div class="legal-links">
        <a href="/tos">TERMS_OF_SERVICE</a>
        <span class="divider">//</span>
        <a href="/privacy">PRIVACY_PROTOCOL</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .tactical-footer {
    background: #050505;
    border-top: 1px solid rgba(173, 199, 255, 0.1);
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
    gap: 1.5rem;
  }

  .footer-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-text {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 2px;
    color: #fff;
  }

  .logo-text .dot { color: #ADC7FF; }

  .mission-text {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.6;
    max-width: 320px;
  }

  .op-status {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(173, 199, 255, 0.05);
    padding: 6px 12px;
    border-radius: 4px;
    width: fit-content;
    border: 0.5px solid rgba(173, 199, 255, 0.1);
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .status-indicator.online {
    background: #00ffcc;
    box-shadow: 0 0 8px #00ffcc;
  }

  .status-text {
    font-size: 0.6rem;
    font-weight: 800;
    color: rgba(173, 199, 255, 0.8);
    letter-spacing: 1px;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: 2px;
    position: relative;
    padding-bottom: 8px;
  }

  .section-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 30px;
    height: 2px;
    background: #ADC7FF;
  }

  .footer-links {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .footer-links a {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .footer-links a:hover {
    color: #ADC7FF;
    transform: translateX(4px);
  }

  .tech-specs {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .spec-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 700;
  }

  .footer-bottom {
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    padding: 2rem 0;
    background: #030303;
  }

  .bottom-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .copyright {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 500;
  }

  .legal-links {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .legal-links a {
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s;
  }

  .legal-links a:hover { color: #fff; }

  .divider { color: rgba(255, 255, 255, 0.1); }

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
      gap: 1.5rem;
    }
    .tactical-footer {
      padding-bottom: 80px; /* Space for mobile nav */
    }
  }
</style>
