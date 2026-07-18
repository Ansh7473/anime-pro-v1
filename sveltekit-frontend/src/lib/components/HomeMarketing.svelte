<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    Cpu,
    ShieldCheck,
    Smartphone,
    Monitor,
    Globe,
    MessageSquare,
    Zap,
    Users,
  } from "lucide-svelte";
</script>

<!-- Platform Stats -->
<section class="platform-stats container">
  <div class="analytics-grid">
    <div class="stat-card">
      <div class="stat-icon"><Cpu size={24} /></div>
      <div class="stat-info">
        <span class="stat-val">1.2ms</span>
        <span class="stat-label">Response Time</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><ShieldCheck size={24} /></div>
      <div class="stat-info">
        <span class="stat-val">SSL Secured</span>
        <span class="stat-label">Secure Connection</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><Users size={24} /></div>
      <div class="stat-info">
        <span class="stat-val">12.5k+</span>
        <span class="stat-label">Active Users</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon"><Zap size={24} /></div>
      <div class="stat-info">
        <span class="stat-val">99.9%</span>
        <span class="stat-label">Uptime</span>
      </div>
    </div>
  </div>
</section>

<!-- Cross-Platform Apps -->
<section class="deployment-hub container">
  <div class="section-header">
    <h2 class="section-title">Available on Every Device</h2>
    <p class="section-subtitle">Watch your favorite anime anywhere, anytime</p>
  </div>
  <div class="deployment-grid">
    <a href="/download" class="deploy-card glass">
      <Smartphone size={32} class="text-primary" />
      <h3>Android</h3>
      <p>Native app optimized for mobile viewing on the go.</p>
      <span class="ver-badge">v1.2.4</span>
    </a>
    <a href="/download" class="deploy-card glass">
      <Monitor size={32} class="text-primary" />
      <h3>Windows Desktop</h3>
      <p>Full-featured desktop experience with offline support.</p>
      <span class="ver-badge">v1.0.8</span>
    </a>
    <a href="/" class="deploy-card glass active">
      <Globe size={32} class="text-primary" />
      <h3>Web Browser</h3>
      <p>Stream instantly — no download required.</p>
      <span class="ver-badge">Stable</span>
    </a>
  </div>
</section>

<!-- Community CTA -->
<section class="community-signal container">
  <div class="signal-box glass">
    <div class="signal-content">
      <h2 class="signal-title">Join Our Community</h2>
      <p>
        Connect with thousands of anime fans. Share recommendations, report
        bugs, and be part of something amazing.
      </p>
      <div class="signal-actions">
        <a
          href="https://discord.gg/7v6ZzkJpXV"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-primary"
        >
          <MessageSquare size={18} /> Join Discord
        </a>
        <button class="btn-secondary" onclick={() => goto("/explore")}>
          Start Watching
        </button>
      </div>
    </div>
    <div class="signal-visual">
      <div class="pulse-ring"></div>
      <div class="pulse-ring delay-1"></div>
      <MessageSquare size={120} class="signal-icon" />
    </div>
  </div>
</section>

<!-- SEO Content Section -->
<section class="seo-content container">
  <div class="seo-content-inner">
    <h2 class="seo-heading">
      WatchAnimeX — Your Ultimate Anime Streaming Platform
    </h2>
    <div class="seo-text">
      <p>
        Welcome to <strong>WatchAnimeX</strong>, the premier destination for
        anime enthusiasts around the globe. Whether you are a seasoned otaku who
        has watched hundreds of series or a newcomer just beginning your anime
        journey, WatchAnimeX is designed to deliver the most comprehensive,
        fast, and enjoyable streaming experience available online today. Our
        platform aggregates anime data from multiple trusted sources, ensuring
        you always have access to the latest episodes, trending titles, seasonal
        releases, and all-time classics — all in one beautifully organized
        interface.
      </p>
      <p>
        At WatchAnimeX, we believe that great anime deserves a great platform.
        That is why we have built a service that prioritizes speed, reliability,
        and user experience above everything else. Our lightning-fast search
        engine lets you find any anime title in milliseconds, complete with
        detailed information including episode counts, ratings, genres, synopsis,
        and airing schedules. The intelligent recommendation system learns your
        preferences over time, surfacing personalized suggestions that match
        your unique taste — from action-packed shounen adventures and
        heartwarming slice-of-life stories to mind-bending psychological
        thrillers and breathtaking animated films.
      </p>
      <p>
        One of the standout features of WatchAnimeX is our cross-platform
        availability. You can start watching on your web browser at home, pick
        up exactly where you left off on our Android mobile app during your
        commute, and finish the episode on our Windows desktop application when
        you return. Your watchlist, favorites, and viewing history are
        seamlessly synchronized across all devices through your account, so you
        never lose your place. The platform supports multiple user profiles,
        making it easy for families and friends to share a single account while
        maintaining their own personalized experiences.
      </p>
      <p>
        Our catalog is continuously updated with the latest seasonal anime,
        ensuring you never miss a new episode of your favorite ongoing series.
        The built-in release schedule feature lets you plan your week by showing
        exactly when new episodes air. For movie lovers, we maintain a curated
        collection of the highest-rated anime films, from Studio Ghibli
        masterpieces to the latest theatrical releases. The explore section
        allows you to browse anime by genre, popularity, rating, season, and
        format — whether you prefer TV series, OVAs, specials, or feature films.
      </p>
      <p>
        WatchAnimeX is more than just a streaming platform — it is a community.
        Join thousands of active users who share recommendations, discuss their
        favorite series, and discover hidden gems together through our
        integrated Discord community. The platform also features a robust
        favorites system, detailed watch history tracking with progress
        indicators, and the ability to create and manage custom watchlists for
        different moods and occasions.
      </p>
      <p>
        Built with modern web technologies including SvelteKit, our platform
        delivers exceptional performance with minimal load times. The responsive
        design ensures a perfect viewing experience on any device — from large
        desktop monitors to tablets and smartphones. With SSL-encrypted
        connections, secure authentication, and a commitment to user privacy,
        you can enjoy your anime with complete peace of mind. Experience the
        future of anime streaming today with WatchAnimeX — where every frame is
        a masterpiece.
      </p>
    </div>
  </div>
</section>

<style>
  /* Platform Stats */
  .platform-stats {
    margin: 4rem auto;
    padding: 0 1rem;
  }
  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  .stat-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    transition: var(--transition);
  }
  .stat-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--net-red);
    transform: translateY(-5px);
  }
  .stat-icon {
    color: var(--net-red);
    opacity: 0.8;
  }
  .stat-info {
    display: flex;
    flex-direction: column;
  }
  .stat-val {
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .stat-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--net-text-muted);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .deployment-hub {
    margin: 6rem auto;
    padding: 0 1rem;
  }
  .section-header {
    margin-bottom: 3rem;
  }
  .section-title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 2px;
    margin-bottom: 0.5rem;
  }
  .section-subtitle {
    color: var(--net-text-muted);
    font-size: 0.9rem;
  }
  .deployment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }
  .deploy-card {
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }
  .deploy-card h3 {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-top: 0.5rem;
  }
  .deploy-card p {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    line-height: 1.5;
  }
  .deploy-card.active {
    border-color: var(--net-red);
    background: rgba(229, 9, 20, 0.05);
  }
  .ver-badge {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 0.6rem;
    font-weight: 800;
    padding: 0.2rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--net-text-muted);
  }

  .community-signal {
    margin: 6rem auto 8rem;
    padding: 0 1rem;
  }
  .signal-box {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 3rem;
    padding: 4rem;
    border-radius: 32px;
    align-items: center;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    overflow: hidden;
    position: relative;
  }
  .signal-title {
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -2px;
    margin-bottom: 1rem;
  }
  .signal-content p {
    font-size: 1.1rem;
    color: var(--net-text-muted);
    margin-bottom: 2.5rem;
    max-width: 500px;
    line-height: 1.6;
  }
  .signal-actions {
    display: flex;
    gap: 1.5rem;
  }
  .signal-visual {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.signal-icon) {
    color: var(--net-red);
    opacity: 0.15;
    z-index: 1;
  }
  .pulse-ring {
    position: absolute;
    width: 200px;
    height: 200px;
    border: 1px solid var(--net-red);
    border-radius: 50%;
    opacity: 0;
    animation: signal-pulse 4s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  .pulse-ring.delay-1 {
    animation-delay: 2s;
  }
  @keyframes signal-pulse {
    0% { transform: scale(0.5); opacity: 0.5; }
    100% { transform: scale(2.5); opacity: 0; }
  }

  @media (max-width: 1024px) {
    .signal-box {
      grid-template-columns: 1fr;
      padding: 3rem;
      text-align: center;
    }
    .signal-content p {
      margin-inline: auto;
    }
    .signal-actions {
      justify-content: center;
    }
    .signal-visual {
      display: none;
    }
  }

  /* SEO Content */
  .seo-content {
    margin: 4rem auto 6rem;
    padding: 0 1rem;
  }
  .seo-content-inner {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 3rem;
  }
  .seo-heading {
    font-size: 1.6rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: white;
  }
  .seo-text p {
    color: var(--net-text-muted);
    font-size: 0.92rem;
    line-height: 1.75;
    margin-bottom: 1.25rem;
  }
  .seo-text p:last-child {
    margin-bottom: 0;
  }
  .seo-text strong {
    color: white;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .platform-stats {
      margin: 2rem auto;
    }
    .deployment-hub {
      margin: 3rem auto;
    }
    .community-signal {
      margin-bottom: 3rem;
    }
    .signal-title {
      font-size: 1.8rem;
    }
    .signal-content p {
      font-size: 0.95rem;
    }
  }

  /* Match the homepage's full-width content shell below the catalog. */
  .container {
    width: 100%;
    max-width: var(--page-max, 1600px);
    margin-inline: auto;
    padding-inline: var(--page-gutter, 2.5rem);
    box-sizing: border-box;
  }
  .platform-stats { margin-top: 0; margin-bottom: 2.5rem; }
  .deployment-hub { margin-top: 2.5rem; margin-bottom: 3rem; }
  .community-signal { margin-top: 3rem; margin-bottom: 3rem; }
  .seo-content { margin-top: 3rem; margin-bottom: 4rem; }
  .analytics-grid { gap: 1rem; }
  .stat-card, .deploy-card, .signal-box, .seo-content-inner {
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 1024px) {
    .container { padding-inline: var(--page-gutter-md, 1.25rem); }
  }
  @media (max-width: 720px) {
    .container { padding-inline: var(--page-gutter-sm, 0.75rem); }
    .analytics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .stat-card { padding: 1rem; gap: 0.75rem; }
    .deployment-grid { grid-template-columns: 1fr; gap: 1rem; }
    .deploy-card { padding: 2rem 1.25rem; }
    .signal-box { padding: 2rem 1.25rem; border-radius: 20px; }
    .signal-actions { flex-direction: column; gap: 0.75rem; }
    .seo-content-inner { padding: 1.5rem; }
    .seo-heading { font-size: 1.3rem; }
  }
  @media (max-width: 420px) {
    .analytics-grid { grid-template-columns: 1fr; }
  }
</style>
