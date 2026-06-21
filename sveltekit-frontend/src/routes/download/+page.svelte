<script lang="ts">
  import { onMount } from "svelte";
  import { Monitor, Smartphone, Tv, Download, Cpu, HardDrive } from "lucide-svelte";
  import { api } from "$lib/api";

  let releases = $state<any[]>([]);
  let loading = $state(true);
  let downloading = $state<string | null>(null);

  onMount(async () => {
    try {
      const res = await api.getLatestReleases();
      if (res) {
        releases = res;
      }
    } catch (error) {
      console.error("Failed to fetch releases:", error);
    } finally {
      loading = false;
    }
  });

  function getLatest(platform: string) {
    const fallbacks: Record<string, string> = {
      windows: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
      mac: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
      linux: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
      android: "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
      tv: "https://drive.google.com/uc?export=download&id=1cAOt75WCIvy7WTwW7sSFgZKgRxMMGrUa",
    };
    return (
      releases.find((r) => r.platform === platform) || {
        version: "0.0.1",
        size: "N/A",
        download_url: fallbacks[platform] || "https://github.com/Ansh7473/anime-pro-v1/releases/latest",
      }
    );
  }

  function handleDownload(platform: string) {
    downloading = platform;
    setTimeout(() => {
      downloading = null;
    }, 3000);
  }
</script>

<svelte:head>
  <title>Download Apps — WatchAnimez</title>
  <meta name="description" content="Download WatchAnimez apps for Android, Windows, macOS, Linux, and Android TV. Native apps with offline support and seamless sync." />
</svelte:head>

<div class="download-page container">
  <div class="page-header">
    <div class="header-badge">
      <Download size={16} />
      <span>Available for all platforms</span>
    </div>
    <h1 class="page-title">Download WatchAnimez</h1>
    <p class="page-subtitle">
      Get the native app for your device. Enjoy fast, ad-free anime streaming with offline support and cross-device sync.
    </p>
  </div>

  <div class="platforms-grid">
    <!-- Windows -->
    <section class="platform-card">
      <div class="platform-icon"><Monitor size={36} /></div>
      <div class="platform-info">
        <div class="platform-badge-row">
          <span class="platform-badge stable">Stable</span>
        </div>
        <h2>Windows</h2>
        <p>Full-featured desktop app with hardware acceleration and Picture-in-Picture support.</p>
        <div class="specs">
          <span>x86_64</span>
          <span>4GB+ RAM</span>
          <span>Windows 10+</span>
        </div>
      </div>
      <div class="platform-action">
        {#if loading}
          <div class="skeleton-btn"></div>
        {:else}
          {@const win = getLatest("windows")}
          <a href={win.download_url} class="download-btn" onclick={() => handleDownload("windows")}>
            {#if downloading === "windows"}
              <span class="spinner-small"></span> Downloading...
            {:else}
              <Download size={18} /> Download
            {/if}
          </a>
          <div class="file-meta">
            <span>v{win.version}</span>
            <span>{win.size}</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- macOS -->
    <section class="platform-card">
      <div class="platform-icon"><Cpu size={36} /></div>
      <div class="platform-info">
        <div class="platform-badge-row">
          <span class="platform-badge stable">Stable</span>
        </div>
        <h2>macOS</h2>
        <p>Optimized for Apple Silicon and Intel Macs with native Metal rendering.</p>
        <div class="specs">
          <span>Universal Binary</span>
          <span>macOS 11.0+</span>
        </div>
      </div>
      <div class="platform-action">
        {#if loading}
          <div class="skeleton-btn"></div>
        {:else}
          {@const mac = getLatest("mac")}
          <a href={mac.download_url} class="download-btn" onclick={() => handleDownload("mac")}>
            {#if downloading === "mac"}
              <span class="spinner-small"></span> Downloading...
            {:else}
              <Download size={18} /> Download
            {/if}
          </a>
          <div class="file-meta">
            <span>v{mac.version}</span>
            <span>{mac.size}</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Linux -->
    <section class="platform-card">
      <div class="platform-icon"><HardDrive size={36} /></div>
      <div class="platform-info">
        <div class="platform-badge-row">
          <span class="platform-badge beta">Beta</span>
        </div>
        <h2>Linux</h2>
        <p>AppImage and Debian packages for maximum desktop environment compatibility.</p>
        <div class="specs">
          <span>x86_64</span>
          <span>AppImage / .deb</span>
        </div>
      </div>
      <div class="platform-action">
        {#if loading}
          <div class="skeleton-btn"></div>
        {:else}
          {@const linux = getLatest("linux")}
          <a href={linux.download_url} class="download-btn" onclick={() => handleDownload("linux")}>
            {#if downloading === "linux"}
              <span class="spinner-small"></span> Downloading...
            {:else}
              <Download size={18} /> Download
            {/if}
          </a>
          <div class="file-meta">
            <span>v{linux.version}</span>
            <span>{linux.size}</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Android -->
    <section class="platform-card">
      <div class="platform-icon"><Smartphone size={36} /></div>
      <div class="platform-info">
        <div class="platform-badge-row">
          <span class="platform-badge stable">Stable</span>
        </div>
        <h2>Android</h2>
        <p>Native mobile app optimized for smooth streaming and offline viewing on the go.</p>
        <div class="specs">
          <span>ARM64</span>
          <span>Android 11+</span>
        </div>
      </div>
      <div class="platform-action">
        {#if loading}
          <div class="skeleton-btn"></div>
        {:else}
          {@const android = getLatest("android")}
          <a href={android.download_url} class="download-btn" onclick={() => handleDownload("android")}>
            {#if downloading === "android"}
              <span class="spinner-small"></span> Downloading...
            {:else}
              <Download size={18} /> Download
            {/if}
          </a>
          <div class="file-meta">
            <span>v{android.version}</span>
            <span>{android.size}</span>
          </div>
        {/if}
      </div>
    </section>

    <!-- Android TV -->
    <section class="platform-card">
      <div class="platform-icon"><Tv size={36} /></div>
      <div class="platform-info">
        <div class="platform-badge-row">
          <span class="platform-badge stable">Stable</span>
        </div>
        <h2>Android TV</h2>
        <p>Leanback UI optimized for TV screens with remote control navigation support.</p>
        <div class="specs">
          <span>ARM64</span>
          <span>Android TV 11+</span>
        </div>
      </div>
      <div class="platform-action">
        {#if loading}
          <div class="skeleton-btn"></div>
        {:else}
          {@const tv = getLatest("tv")}
          <a href={tv.download_url} class="download-btn" onclick={() => handleDownload("tv")}>
            {#if downloading === "tv"}
              <span class="spinner-small"></span> Downloading...
            {:else}
              <Download size={18} /> Download
            {/if}
          </a>
          <div class="file-meta">
            <span>v{tv.version}</span>
            <span>{tv.size}</span>
          </div>
        {/if}
      </div>
    </section>
  </div>

  <div class="install-tip">
    <p>💡 <strong>Tip for Android users:</strong> Enable "Install from Unknown Sources" in your device settings before installing the APK.</p>
  </div>
</div>

<style>
  .download-page {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 1000px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .header-badge {
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

  .platforms-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .platform-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1.5rem;
    align-items: center;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem 2rem;
    transition: all 0.25s;
  }

  .platform-card:hover {
    border-color: rgba(229, 9, 20, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  .platform-icon {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: rgba(229, 9, 20, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--net-red);
  }

  .platform-info {
    min-width: 0;
  }

  .platform-badge-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .platform-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .platform-badge.stable {
    background: rgba(74, 222, 128, 0.1);
    color: #4ade80;
    border: 1px solid rgba(74, 222, 128, 0.2);
  }

  .platform-badge.beta {
    background: rgba(251, 191, 36, 0.1);
    color: #fbbf24;
    border: 1px solid rgba(251, 191, 36, 0.2);
  }

  .platform-info h2 {
    font-size: 1.2rem;
    font-weight: 700;
    margin-bottom: 0.3rem;
    color: white;
  }

  .platform-info p {
    font-size: 0.85rem;
    color: var(--net-text-muted);
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }

  .specs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .specs span {
    font-size: 0.72rem;
    padding: 0.2rem 0.6rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--net-text-muted);
    font-weight: 500;
  }

  .platform-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    min-width: 140px;
  }

  .download-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--net-red);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    white-space: nowrap;
    font-family: inherit;
    width: 100%;
    justify-content: center;
  }

  .download-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }

  .file-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.72rem;
    color: var(--net-text-muted);
  }

  .skeleton-btn {
    width: 140px;
    height: 42px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }

  .spinner-small {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .install-tip {
    text-align: center;
    padding: 1.25rem 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .install-tip p {
    color: var(--net-text-muted);
    font-size: 0.88rem;
    margin: 0;
  }

  .install-tip strong {
    color: white;
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.8rem; }
    .page-subtitle { font-size: 0.92rem; }

    .platform-card {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1.5rem;
      text-align: center;
    }

    .platform-icon {
      margin: 0 auto;
    }

    .specs {
      justify-content: center;
    }

    .platform-action {
      width: 100%;
    }

    .download-btn {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.5rem; }
    .platform-card { padding: 1.25rem; }
    .platform-info h2 { font-size: 1.1rem; }
    .platform-info p { font-size: 0.82rem; }
  }
</style>
