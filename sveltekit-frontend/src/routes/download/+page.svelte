<script lang="ts">
  import { onMount } from "svelte";
  import {
    Monitor,
    Smartphone,
    Tv,
    Download,
    Cpu,
    HardDrive,
    Zap,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    ArrowDown,
  } from "lucide-svelte";
  import { api } from "$lib/api";

  type Platform = {
    key: string;
    name: string;
    icon: any;
    badge: "Stable" | "Beta";
    blurb: string;
    specs: string[];
  };

  const PLATFORMS: Platform[] = [
    {
      key: "windows",
      name: "Windows",
      icon: Monitor,
      badge: "Beta",
      blurb: "Full desktop app with hardware acceleration and Picture-in-Picture.",
      specs: ["x86_64", "Windows 10+"],
    },
    {
      key: "mac",
      name: "macOS",
      icon: Cpu,
      badge: "Beta",
      blurb: "Universal build for Apple Silicon and Intel with native Metal rendering.",
      specs: ["Universal", "macOS 11+"],
    },
    {
      key: "linux",
      name: "Linux",
      icon: HardDrive,
      badge: "Beta",
      blurb: "AppImage and .deb packages for broad desktop compatibility.",
      specs: ["x86_64", "AppImage / .deb"],
    },
    {
      key: "android",
      name: "Android",
      icon: Smartphone,
      badge: "Beta",
      blurb: "Native mobile app tuned for smooth streaming and offline viewing.",
      specs: ["ARM64", "Android 11+"],
    },
    {
      key: "tv",
      name: "Android TV",
      icon: Tv,
      badge: "Beta",
      blurb: "Leanback UI built for the big screen and remote navigation.",
      specs: ["ARM64", "Android TV 11+"],
    },
  ];

  const FEATURES = [
    { icon: Zap, label: "Buttery-smooth playback" },
    { icon: RefreshCw, label: "Synced across devices" },
    { icon: ShieldCheck, label: "Ad-free & private" },
  ];

  let releases = $state<any[]>([]);
  let loading = $state(true);
  let downloading = $state<string | null>(null);
  let primaryKey = $state("windows");

  const fallbacks: Record<string, string> = {
    windows: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
    mac: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
    linux: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
    android: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
    tv: "https://drive.google.com/uc?export=download&id=1cAOt75WCIvy7WTwW7sSFgZKgRxMMGrUa",
  };

  function getLatest(platform: string) {
    return (
      releases.find((r) => r.platform === platform) || {
        version: "0.0.1",
        size: "",
        download_url: fallbacks[platform] || fallbacks.windows,
      }
    );
  }

  function hasRelease(platform: string) {
    return releases.some((r) => r.platform === platform);
  }

  function verText(rel: { version?: string; size?: string }) {
    const v = (rel.version || "").trim();
    const ver = !v ? "" : /^\d/.test(v) ? `v${v}` : v.charAt(0).toUpperCase() + v.slice(1);
    return rel.size ? (ver ? `${ver} · ${rel.size}` : rel.size) : ver;
  }

  function detectOS(): string {
    if (typeof navigator === "undefined") return "windows";
    const ua = navigator.userAgent.toLowerCase();
    if (/android tv|googletv|smarttv|crkey/.test(ua)) return "tv";
    if (/android/.test(ua)) return "android";
    if (/iphone|ipad|ipod/.test(ua)) return "android";
    if (/mac os x|macintosh/.test(ua)) return "mac";
    if (/linux/.test(ua) && !/android/.test(ua)) return "linux";
    return "windows";
  }

  function handleDownload(platform: string) {
    downloading = platform;
    setTimeout(() => (downloading = null), 3000);
  }

  const primary = $derived(PLATFORMS.find((p) => p.key === primaryKey) ?? PLATFORMS[0]);
  const others = $derived(PLATFORMS.filter((p) => p.key !== primaryKey));

  onMount(async () => {
    primaryKey = detectOS();
    try {
      const res = await api.getLatestReleases();
      if (res) releases = res;
    } catch (error) {
      console.error("Failed to fetch releases:", error);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Download Apps — WatchAnimez</title>
  <meta
    name="description"
    content="Download WatchAnimez apps for Android, Windows, macOS, Linux, and Android TV. Fast, ad-free anime streaming with offline support and cross-device sync."
  />
  <meta property="og:title" content="Download Apps — WatchAnimez" />
  <meta property="og:description" content="Download WatchAnimez apps for Android, Windows, macOS, Linux, and Android TV. Fast, ad-free anime streaming with offline support and cross-device sync." />
</svelte:head>

<div class="dl container">
  <!-- Hero -->
  <header class="dl-hero">
    <span class="dl-kicker"><Download size={13} /> Native apps</span>
    <h1 class="dl-title">Watch anime, <span class="accent">your way</span>.</h1>
    <p class="dl-sub">
      Get the WatchAnimez app for your device — fast, ad-free streaming with offline
      downloads and cross-device sync.
    </p>

    <!-- Recommended pick -->
    {#key primaryKey}
      {@const rec = getLatest(primary.key)}
      <div class="dl-pick">
        <div class="pick-icon">
          <primary.icon size={26} />
        </div>
        <div class="pick-info">
          <span class="pick-reco"><Sparkles size={12} /> Recommended for your device</span>
          <span class="pick-name">{primary.name}</span>
          <span class="pick-meta">
            {#if loading}
              Checking latest release…
            {:else}
              {verText(rec)}
            {/if}
          </span>
        </div>
        <a
          class="pick-btn"
          href={rec.download_url}
          onclick={() => handleDownload(primary.key)}
        >
          {#if downloading === primary.key}
            <span class="spinner"></span> Starting…
          {:else}
            <Download size={18} /> Download
          {/if}
        </a>
      </div>
    {/key}

    <a class="dl-jump" href="#all-platforms">
      Not your platform? See all <ArrowDown size={13} />
    </a>
  </header>

  <!-- Feature strip -->
  <ul class="dl-features">
    {#each FEATURES as f}
      <li><f.icon size={16} /> {f.label}</li>
    {/each}
  </ul>

  <!-- Other platforms -->
  <section id="all-platforms" class="dl-all">
    <h2 class="dl-all-title">All platforms</h2>
    <div class="dl-grid">
      {#each others as p}
        {@const rel = getLatest(p.key)}
        <article class="dl-card">
          <div class="card-top">
            <div class="card-icon"><p.icon size={22} /></div>
            <span class="card-badge {p.badge.toLowerCase()}">{p.badge}</span>
          </div>
          <h3 class="card-name">{p.name}</h3>
          <p class="card-blurb">{p.blurb}</p>
          <div class="card-specs">
            {#each p.specs as s}<span>{s}</span>{/each}
          </div>
          <div class="card-foot">
            {#if loading}
              <div class="skel"></div>
            {:else if hasRelease(p.key)}
              <a class="card-btn" href={rel.download_url} onclick={() => handleDownload(p.key)}>
                {#if downloading === p.key}
                  <span class="spinner"></span> Starting…
                {:else}
                  <Download size={16} /> Download
                {/if}
              </a>
              <span class="card-ver">{verText(rel)}</span>
            {:else}
              <a class="card-btn ghost" href={rel.download_url} onclick={() => handleDownload(p.key)}>
                <Download size={16} /> Get latest
              </a>
              <span class="card-ver">via Releases</span>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </section>

  <p class="dl-note">
    <Smartphone size={14} />
    <span>Android: enable <strong>Install from unknown sources</strong> before opening the APK.</span>
  </p>
</div>

<style>
  .dl {
    --s1: #121214;
    --s2: #0d0d0f;
    --hair: rgba(245, 245, 245, 0.08);
    --hair-strong: rgba(245, 245, 245, 0.14);
    --r: 12px;
    padding-top: 1.5rem;
    padding-bottom: 4rem;
    max-width: 940px;
  }

  /* ---------- Hero ---------- */
  .dl-hero {
    position: relative;
    text-align: center;
    padding: 2.5rem 0 1.75rem;
  }
  .dl-hero::before {
    content: "";
    position: absolute;
    top: -10%;
    left: 50%;
    width: 460px;
    height: 280px;
    transform: translateX(-50%);
    background: radial-gradient(closest-side, rgba(229, 9, 20, 0.16), transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .dl-hero > * {
    position: relative;
    z-index: 1;
  }

  .dl-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
    border: 1px solid rgba(229, 9, 20, 0.22);
    padding: 0.35rem 0.7rem;
    border-radius: 50px;
    margin-bottom: 1rem;
  }

  .dl-title {
    font-size: clamp(1.9rem, 4.5vw, 2.6rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.08;
    margin: 0 0 0.6rem;
  }
  .dl-title .accent {
    color: var(--net-red);
  }

  .dl-sub {
    color: var(--net-text-muted);
    font-size: 0.98rem;
    line-height: 1.6;
    max-width: 520px;
    margin: 0 auto 1.75rem;
  }

  /* ---------- Recommended pick ---------- */
  .dl-pick {
    display: flex;
    align-items: center;
    gap: 1rem;
    max-width: 520px;
    margin: 0 auto;
    padding: 0.85rem 0.95rem;
    background: var(--s1);
    border: 1px solid var(--hair-strong);
    border-radius: 14px;
    text-align: left;
  }
  .pick-icon {
    flex: none;
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--net-red);
  }
  .pick-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .pick-reco {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--net-red);
  }
  .pick-name {
    font-size: 1.15rem;
    font-weight: 700;
    color: #fff;
    line-height: 1.1;
  }
  .pick-meta {
    font-size: 0.78rem;
    color: var(--net-text-muted);
  }
  .pick-btn {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    background: #ffffff;
    color: #0d0d0f;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.9rem;
    padding: 0.7rem 1.25rem;
    border-radius: 10px;
    transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    white-space: nowrap;
  }
  .pick-btn:hover {
    background: #ededf0;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }

  .dl-jump {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 1.1rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--net-text-muted);
    text-decoration: none;
    transition: color 0.2s;
  }
  .dl-jump:hover {
    color: #fff;
  }

  /* ---------- Feature strip ---------- */
  .dl-features {
    list-style: none;
    margin: 1.75rem 0 2.5rem;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem 0.6rem;
  }
  .dl-features li {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--net-text-muted);
    background: var(--s1);
    border: 1px solid var(--hair);
    padding: 0.5rem 0.85rem;
    border-radius: 50px;
  }
  .dl-features li :global(svg) {
    color: var(--net-red);
  }

  /* ---------- All platforms ---------- */
  .dl-all-title {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
  }
  .dl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.85rem;
  }
  .dl-card {
    display: flex;
    flex-direction: column;
    background: var(--s1);
    border: 1px solid var(--hair);
    border-radius: var(--r);
    padding: 1.1rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .dl-card:hover {
    border-color: rgba(229, 9, 20, 0.4);
    transform: translateY(-2px);
  }
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: var(--net-red);
    background: rgba(229, 9, 20, 0.1);
  }
  .card-badge {
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.5rem;
    border-radius: 5px;
  }
  .card-badge.stable {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
  }
  .card-badge.beta {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.12);
  }
  .card-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #fff;
    margin: 0 0 0.3rem;
  }
  .card-blurb {
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--net-text-muted);
    margin: 0 0 0.7rem;
  }
  .card-specs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.95rem;
  }
  .card-specs span {
    font-size: 0.68rem;
    font-weight: 500;
    color: var(--net-text-muted);
    background: var(--s2);
    border: 1px solid var(--hair);
    padding: 0.18rem 0.5rem;
    border-radius: 5px;
  }
  .card-foot {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .card-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    background: #ffffff;
    color: #0d0d0f;
    text-decoration: none;
    font-weight: 700;
    font-size: 0.84rem;
    padding: 0.6rem 1rem;
    border-radius: 9px;
    transition: background 0.2s, transform 0.2s;
  }
  .card-btn:hover {
    background: #ededf0;
    transform: translateY(-1px);
  }
  .card-btn.ghost {
    background: var(--s2);
    color: #fff;
    border: 1px solid var(--hair-strong);
  }
  .card-btn.ghost:hover {
    border-color: var(--net-red);
    filter: none;
  }
  .card-ver {
    font-size: 0.7rem;
    color: var(--net-text-muted);
    text-align: center;
  }
  .skel {
    height: 38px;
    border-radius: 9px;
    background: var(--s2);
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 1; }
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(0, 0, 0, 0.25);
    border-top-color: #0d0d0f;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dl-note {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin: 2rem 0 0;
    padding: 0.85rem 1rem;
    background: var(--s1);
    border: 1px solid var(--hair);
    border-radius: 10px;
    font-size: 0.82rem;
    color: var(--net-text-muted);
  }
  .dl-note :global(svg) {
    color: var(--net-red);
    flex: none;
  }
  .dl-note strong {
    color: #fff;
  }

  @media (max-width: 560px) {
    .dl-pick {
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .pick-btn {
      width: 100%;
      justify-content: center;
    }
    .dl-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 400px) {
    .dl-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
