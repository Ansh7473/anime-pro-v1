<svelte:head>
  <title>About Us — WatchAnimeX</title>
  <meta name="description" content="Learn about WatchAnimeX — our mission, team, and commitment to delivering the best anime streaming experience." />
  <meta property="og:title" content="About Us — WatchAnimeX" />
  <meta property="og:description" content="Learn about WatchAnimeX — our mission, team, and commitment to delivering the best anime streaming experience." />
</svelte:head>

<div class="page-container container">
  <div class="page-header">
    <h1>About WatchAnimeX</h1>
    <p class="subtitle">A focused catalog for seasonal anime, films, airing times, and saved viewing progress.</p>
  </div>

  <div class="content-section">
    <section class="about-block">
      <h2>Our Mission</h2>
      <p>At WatchAnimeX, we are passionate about bringing the world's best anime to fans everywhere. Our mission is simple: provide a fast, reliable, and beautifully designed platform where anime lovers can discover, track, and enjoy their favorite series and movies — anytime, on any device.</p>
      <p>We believe anime is more than entertainment; it is an art form that connects cultures, inspires creativity, and builds communities. That belief drives everything we build.</p>
    </section>

    <section class="about-block">
      <h2>What We Offer</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🎬</div>
          <h3>Extensive Library</h3>
          <p>Browse anime across seasons, formats, and genres, including series, OVAs, and feature films.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Lightning Fast</h3>
          <p>Built on modern web technology (SvelteKit), our platform delivers exceptional performance with minimal load times and smooth navigation.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>Cross-Platform</h3>
          <p>Watch on web, Android, or Windows desktop. Your watchlist, favorites, and progress sync seamlessly across all your devices.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Secure & Private</h3>
          <p>Your data is protected with SSL encryption and secure authentication. We take your privacy seriously and never sell your personal information.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🤖</div>
          <h3>Smart Recommendations</h3>
          <p>Our intelligent system learns your preferences and surfaces personalized anime suggestions tailored to your unique taste.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">👥</div>
          <h3>Community</h3>
          <p>Join thousands of anime fans in our Discord community. Share recommendations, discuss episodes, and discover hidden gems together.</p>
        </div>
      </div>
    </section>

    <section class="about-block">
      <h2>Our Story</h2>
      <p>WatchAnimeX began as a project to make anime discovery and episode navigation less cluttered. The interface is built around clear catalogs, airing schedules, and a direct route back to the next episode.</p>
      <p>Development continues through bug reports and community feedback, with changes focused on catalog accuracy, playback reliability, and accessibility.</p>
    </section>

    <section class="about-block">
      <h2>Technology</h2>
      <p>Our platform is built with cutting-edge technologies including SvelteKit for the frontend, Go for high-performance backend services, and Firebase for secure authentication and data storage. We use CDN-backed image delivery and intelligent caching to ensure fast load times globally.</p>
    </section>

    <section class="about-block cta-section">
      <h2>Get In Touch</h2>
      <p>We love hearing from our community. Whether you have a feature request, found a bug, or just want to say hello — reach out to us.</p>
      <div class="cta-buttons">
        <a href="/contact" class="btn-primary">Contact Us</a>
        <a href="/faq" class="btn-secondary">FAQ</a>
      </div>
    </section>
  </div>
</div>

<style>
  .page-container {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 960px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem 0;
  }
  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.75rem;
  }
  .subtitle {
    color: var(--net-text-muted);
    font-size: 1.1rem;
    max-width: 600px;
    margin: 0 auto;
  }

  .content-section {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .about-block h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: white;
    position: relative;
    padding-left: 1rem;
  }
  .about-block h2::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.15em;
    bottom: 0.15em;
    width: 3px;
    background: var(--net-red);
    border-radius: 2px;
  }
  .about-block p {
    color: var(--net-text-muted);
    font-size: 1rem;
    line-height: 1.8;
    margin-bottom: 1rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
  }
  .feature-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 2rem;
    transition: all 0.3s;
  }
  .feature-card:hover {
    border-color: var(--net-red);
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.05);
  }
  .feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  .feature-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: white;
  }
  .feature-card p {
    font-size: 0.9rem;
    color: var(--net-text-muted);
    line-height: 1.6;
    margin-bottom: 0;
  }

  .cta-section {
    text-align: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 3rem 2rem;
  }
  .cta-section h2 {
    padding-left: 0;
  }
  .cta-section h2::before {
    display: none;
  }
  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 1.8rem;
    }
    .subtitle {
      font-size: 0.95rem;
    }
    .about-block h2 {
      font-size: 1.25rem;
    }
    .about-block p {
      font-size: 0.92rem;
    }
    .features-grid {
      grid-template-columns: 1fr;
    }
    .cta-section {
      padding: 2rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .page-header h1 { font-size: 1.5rem; }
    .cta-buttons { flex-direction: column; }
  }
  .page-container{max-width:var(--page-max,1500px);padding-top:3rem}.page-header{text-align:left;padding:1rem 0 2rem;border-bottom:1px solid var(--editorial-line,#28231f)}.subtitle{margin:0;max-width:65ch}.content-section{gap:4rem;max-width:1100px}.about-block h2{padding-left:0;color:var(--editorial-text,#f1ece4);font-size:clamp(1.35rem,2vw,1.8rem);letter-spacing:-.03em}.about-block h2::before{display:none}.features-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border-top:1px solid var(--editorial-line,#28231f)}.feature-card{padding:1.5rem;border:0;border-bottom:1px solid var(--editorial-line,#28231f);border-right:1px solid var(--editorial-line,#28231f);border-radius:0;background:transparent}.feature-card:nth-child(3n){border-right:0}.feature-card:hover{transform:none;background:var(--editorial-surface,#0d0c0b);border-color:var(--editorial-line,#28231f)}.feature-icon{font-size:1.3rem}.cta-section{text-align:left;border-radius:4px;background:var(--editorial-surface,#0d0c0b);border-color:var(--editorial-line,#28231f);padding:2rem}.cta-buttons{justify-content:flex-start}@media(max-width:800px){.features-grid{grid-template-columns:1fr}.feature-card{border-right:0}}
</style>
