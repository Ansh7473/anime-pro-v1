<script lang="ts">
	import { onMount } from "svelte";
	import {
		Monitor,
		Smartphone,
		Tv,
		Download,
		Info,
		Terminal,
		Cpu,
		Activity,
		ShieldCheck,
		Zap,
	} from "lucide-svelte";
	import { fade, fly } from "svelte/transition";
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
		return (
			releases.find((r) => r.platform === platform) || {
				version: "N/A",
				size: "N/A",
				download_url: "#",
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

<div class="tactical-page-container">
	<!-- Background HUD Elements -->
	<div class="tactical-hud-overlay">
		<div
			class="tactical-hud-circle dashed large"
			style="top: -10%; right: -5%; width: 600px; height: 600px;"
		></div>
		<div
			class="tactical-hud-circle dashed medium"
			style="bottom: 10%; left: -5%; width: 400px; height: 400px; animation-direction: reverse;"
		></div>
		<div class="tactical-grid absolute inset-0 opacity-40"></div>
	</div>

	<main class="tactical-content">
		<!-- Header -->
		<header class="tactical-header" in:fade={{ duration: 600 }}>
			<div class="status-badge">
				<span class="status-dot pulse"></span>
				<span class="status-label">SYSTEM_READY // UPTIME_100%</span>
			</div>
			<h1 class="tactical-title">
				ANIME_PRO <span class="version-tag">v2.0 // CORE</span>
			</h1>
			<p class="tactical-subtitle">
				Initialize high-performance streaming protocol on your primary
				devices. Low-latency, ad-free, encrypted anime synchronization.
			</p>
		</header>

		<!-- Cards Grid -->
		<div class="tactical-grid-system">
			<!-- Windows OS -->
			<section
				class="tactical-glass tactical-card group"
				in:fly={{ y: 40, duration: 800, delay: 200 }}
			>
				<div class="card-icon-overlay">
					<Monitor size={80} strokeWidth={1} />
				</div>

				<div class="card-content">
					<div class="release-indicator">
						<span class="indicator-dot primary"></span>
						<span class="indicator-label primary"
							>STABLE_RELEASE_X64</span
						>
					</div>

					<h2 class="card-title">WINDOWS_OS</h2>
					<p class="card-description">
						Hyper-threaded desktop architecture with native hardware
						acceleration and Picture-in-Picture protocol.
					</p>

					<div class="tech-specs">
						<div class="spec-item">
							<span class="spec-label">ARCHITECTURE</span>
							<span class="spec-value">X86_64_HYPER</span>
						</div>
						<div class="spec-item">
							<span class="spec-label">MEMORY_REQ</span>
							<span class="spec-value">4.0GB_VRAM</span>
						</div>
					</div>

					{#if loading}
						<div class="loading-placeholder">
							<div class="progress-bar">
								<div
									class="progress-fill shimmer"
									style="width: 65%;"
								></div>
							</div>
						</div>
					{:else}
						{@const win = getLatest("windows")}
						<div class="download-action">
							<a
								href="https://anime-pro-v1.anshsoni310.workers.dev/windows"
								class="tactical-btn primary-action {downloading === 'windows' ? 'is-downloading' : ''}"
								onclick={() => handleDownload("windows")}
							>
								{#if downloading === "windows"}
									<Terminal size={20} class="spinning" />
									<span>INITIALIZING_X64...</span>
								{:else}
									<Download size={20} />
									<span>DOWNLOAD FOR WINDOWS</span>
								{/if}
							</a>
							<div class="file-meta">
								<span class="meta-item">VER: {win?.version || "2.0.4"}</span>
								<span class="meta-item">SIZE: {win?.size || "412.8MB"}</span>
								<span class="meta-item">PROTO: AES_256</span>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<!-- TV OS -->
			<section
				class="tactical-glass tactical-card group"
				in:fly={{ y: 40, duration: 800, delay: 600 }}
			>
				<div class="card-icon-overlay">
					<Tv size={80} strokeWidth={1} />
				</div>

				<div class="card-content">
					<div class="release-indicator">
						<span class="indicator-dot accent"></span>
						<span class="indicator-label accent">TV_CORE_ARM64</span
						>
					</div>

					<h2 class="card-title">TV_OS</h2>
					<p class="card-description">
						Android TV optimized streaming client with leanback UI
						and remote control support.
					</p>

					<div class="tech-specs">
						<div class="spec-item">
							<span class="spec-label">ARCHITECTURE</span>
							<span class="spec-value">ARM64_TV</span>
						</div>
						<div class="spec-item">
							<span class="spec-label">API_LEVEL</span>
							<span class="spec-value">30+ (TV)</span>
						</div>
					</div>

					{#if loading}
						<div class="loading-placeholder">
							<div class="progress-bar">
								<div
									class="progress-fill shimmer"
									style="width: 75%;"
								></div>
							</div>
						</div>
					{:else}
						{@const tv = getLatest("tv")}
						<div class="download-action">
							<a
								href="https://drive.google.com/uc?export=download&id=1cAOt75WCIvy7WTwW7sSFgZKgRxMMGrUa"
								class="tactical-btn accent-action {downloading === 'tv' ? 'is-downloading' : ''}"
								download
								onclick={() => handleDownload("tv")}
							>
								{#if downloading === "tv"}
									<Activity size={20} class="spinning" />
									<span>SYNCING_CORE...</span>
								{:else}
									<Download size={20} />
									<span>DOWNLOAD FOR TV</span>
								{/if}
							</a>
							<div class="file-meta">
								<span class="meta-item">VER: {tv?.version || "1.0.0"}</span>
								<span class="meta-item">SIZE: {tv?.size || "50MB"}</span>
								<span class="meta-item">ENGINE: LEANBACK</span>
							</div>
						</div>
					{/if}
				</div>
			</section>

			<!-- Android OS -->
			<section
				class="tactical-glass tactical-card group"
				in:fly={{ y: 40, duration: 800, delay: 400 }}
			>
				<div class="card-icon-overlay">
					<Smartphone size={80} strokeWidth={1} />
				</div>

				<div class="card-content">
					<div class="release-indicator">
						<span class="indicator-dot secondary"></span>
						<span class="indicator-label secondary"
							>MOBILE_CORE_V8A</span
						>
					</div>

					<h2 class="card-title">ANDROID_OS</h2>
					<p class="card-description">
						Streamlined mobile interface optimized for low-latency
						data streaming and tactile synchronization.
					</p>

					<div class="tech-specs">
						<div class="spec-item">
							<span class="spec-label">ARCHITECTURE</span>
							<span class="spec-value">ARM64_V8A</span>
						</div>
						<div class="spec-item">
							<span class="spec-label">API_LEVEL</span>
							<span class="spec-value">30+ (R)</span>
						</div>
					</div>

					{#if loading}
						<div class="loading-placeholder">
							<div class="progress-bar">
								<div
									class="progress-fill shimmer"
									style="width: 45%;"
								></div>
							</div>
						</div>
					{:else}
						{@const apk = getLatest("android")}
						<div class="download-action">
							<a
								href="https://anime-pro-v1.anshsoni310.workers.dev/android"
								class="tactical-btn secondary-action {downloading === 'android' ? 'is-downloading' : ''}"
								onclick={() => handleDownload("android")}
							>
								{#if downloading === "android"}
									<Zap size={20} class="spinning" />
									<span>ARM64_UPLOADING...</span>
								{:else}
									<Zap size={20} />
									<span>DOWNLOAD FOR ANDROID</span>
								{/if}
							</a>
							<div class="file-meta">
								<span class="meta-item">VER: {apk?.version || "1.9.2"}</span>
								<span class="meta-item">SIZE: {apk?.size || "84.5MB"}</span>
								<span class="meta-item">ENGINE: V5_CORE</span>
							</div>
						</div>
					{/if}
				</div>
			</section>
		</div>

		<!-- Footer Stats -->
		<footer class="tactical-footer" in:fade={{ delay: 1000 }}>
			<div class="footer-stat-card">
				<Activity size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">NETWORK_LOAD</span>
					<span class="stat-value">OPTIMIZED</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<ShieldCheck size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">ENCRYPTION</span>
					<span class="stat-value">MIL_GRADE</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<Cpu size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">CORE_SYNC</span>
					<span class="stat-value">0.002MS</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<Terminal size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">TERMINAL</span>
					<span class="stat-value">ACTIVE</span>
				</div>
			</div>
		</footer>

		<!-- Guide Tip -->
		<div class="tactical-guide" in:fade={{ delay: 1200 }}>
			<Info size={18} />
			<span
				>INSTALLATION_TIP: Enable "Unknown Sources" in OS Security
				Settings for APK deployment.</span
			>
		</div>
	</main>
</div>

<style>
	.tactical-page-container {
		min-height: 100vh;
		background: var(--tactical-bg);
		color: var(--net-text);
		position: relative;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 1.5rem;
	}

	.tactical-hud-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 1;
	}

	.tactical-content {
		position: relative;
		z-index: 10;
		max-width: 1100px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.tactical-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		background: rgba(26, 115, 232, 0.1);
		border-radius: 2rem;
		margin-bottom: 1.5rem;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		background: var(--tactical-primary);
		border-radius: 50%;
	}

	.status-dot.pulse {
		box-shadow: 0 0 10px var(--tactical-primary);
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.2);
		}
	}

	.status-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: var(--tactical-primary);
	}

	.tactical-title {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		margin-bottom: 1rem;
		color: var(--tactical-primary);
		text-shadow: 0 0 15px rgba(26, 115, 232, 0.3);
	}

	.version-tag {
		font-size: 0.4em;
		vertical-align: middle;
		opacity: 0.6;
		font-weight: 400;
	}

	.tactical-subtitle {
		font-size: 1.1rem;
		color: var(--net-text-muted);
		max-width: 600px;
		line-height: 1.6;
	}

	.tactical-grid-system {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		width: 100%;
		margin-bottom: 4rem;
	}

	.tactical-card {
		position: relative;
		padding: 2.5rem;
		border-radius: 1.5rem;
		overflow: hidden;
		transition:
			transform 0.3s ease,
			border-color 0.3s ease;
	}

	.tactical-card:hover {
		transform: translateY(-5px);
		border-color: rgba(173, 199, 255, 0.4);
	}

	.card-icon-overlay {
		position: absolute;
		top: -1.5rem;
		right: -1.5rem;
		opacity: 0.05;
		color: var(--tactical-primary);
		transition: opacity 0.3s ease;
	}

	.tactical-card:hover .card-icon-overlay {
		opacity: 0.1;
	}

	.release-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.indicator-dot.primary {
		background: var(--tactical-primary);
		box-shadow: 0 0 8px var(--tactical-primary);
	}
	.indicator-dot.secondary {
		background: #4caf50;
		box-shadow: 0 0 8px #4caf50;
	}

	.indicator-label {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}
	.indicator-label.primary {
		color: var(--tactical-primary);
	}
	.indicator-label.secondary {
		color: #4caf50;
	}

	.card-title {
		font-size: 2.25rem;
		font-weight: 700;
		margin-bottom: 1rem;
		letter-spacing: -0.02em;
	}

	.card-description {
		color: var(--net-text-muted);
		font-size: 0.95rem;
		line-height: 1.6;
		margin-bottom: 2rem;
	}

	.tech-specs {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.spec-item {
		background: rgba(255, 255, 255, 0.03);
		padding: 0.75rem 1rem;
		border-left: 2px solid rgba(173, 199, 255, 0.2);
	}

	.spec-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: var(--tactical-outline);
		margin-bottom: 0.25rem;
		letter-spacing: 0.1em;
	}

	.spec-value {
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--net-text);
	}

	.download-action {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.primary-action {
		background: var(--tactical-primary-container);
		color: white;
		height: 4rem;
		border-radius: 0.75rem;
		box-shadow: 0 0 20px rgba(26, 115, 232, 0.3);
		transition: all 0.3s ease;
	}

	.primary-action:hover {
		background: var(--tactical-primary);
		box-shadow: 0 0 30px var(--tactical-primary);
		transform: translateY(-2px);
	}

	.secondary-action {
		background: rgba(255, 255, 255, 0.05);
		color: var(--tactical-primary);
		height: 4rem;
		border: 1px solid rgba(173, 199, 255, 0.2);
		border-radius: 0.75rem;
		transition: all 0.3s ease;
	}

	.secondary-action:hover {
		background: rgba(173, 199, 255, 0.1);
		box-shadow: 0 0 20px rgba(26, 115, 232, 0.2);
		transform: translateY(-2px);
		border-color: var(--tactical-primary);
	}

	.accent-action {
		background: rgba(255, 152, 0, 0.15);
		color: #ff9800;
		height: 4rem;
		border: 1px solid rgba(255, 152, 0, 0.3);
		border-radius: 0.75rem;
		transition: all 0.3s ease;
	}

	.accent-action:hover {
		background: rgba(255, 152, 0, 0.25);
		box-shadow: 0 0 25px rgba(255, 152, 0, 0.4);
		transform: translateY(-2px);
	}

	.is-downloading {
		pointer-events: none;
		opacity: 0.8;
		filter: brightness(1.2);
		animation: pulse-glow 1s infinite alternate;
	}

	@keyframes pulse-glow {
		from {
			box-shadow: 0 0 10px currentColor;
		}
		to {
			box-shadow: 0 0 40px currentColor;
		}
	}

	.spinning {
		animation: rotate 2s linear infinite;
	}

	@keyframes rotate {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.file-meta {
		display: flex;
		justify-content: space-between;
		padding: 0 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--tactical-outline);
		opacity: 0.6;
	}

	.tactical-footer {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		width: 100%;
		max-width: 800px;
	}

	@media (min-width: 768px) {
		.tactical-footer {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.footer-stat-card {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 1rem;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		color: var(--tactical-outline);
		opacity: 0.4;
	}

	.stat-label {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: var(--tactical-outline);
		letter-spacing: 0.1em;
	}

	.stat-value {
		font-weight: 700;
		font-size: 0.8rem;
		color: var(--tactical-primary);
	}

	.tactical-guide {
		margin-top: 3rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: rgba(26, 115, 232, 0.05);
		border: 1px solid rgba(26, 115, 232, 0.1);
		border-radius: 1rem;
		font-size: 0.8rem;
		color: var(--net-text-muted);
		text-align: center;
	}

	.loading-placeholder {
		height: 4rem;
		display: flex;
		align-items: center;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--tactical-primary);
		box-shadow: 0 0 10px var(--tactical-primary);
	}

	.shimmer {
		position: relative;
		overflow: hidden;
	}

	.indicator-dot.accent {
		background: #ff9800;
		box-shadow: 0 0 8px #ff9800;
	}

	.indicator-label.accent {
		color: #ff9800;
	}

	.accent-action {
		background: rgba(255, 152, 0, 0.15);
		color: #ff9800;
		height: 4rem;
		border: 1px solid rgba(255, 152, 0, 0.3);
		border-radius: 0.75rem;
	}

	.accent-action:hover {
		background: rgba(255, 152, 0, 0.25);
	}

	@keyframes shimmer-load {
		100% {
			left: 100%;
		}
	}

	@media (max-width: 480px) {
		.tactical-page-container {
			padding: 3rem 1rem;
		}
		.tactical-title {
			font-size: 2.5rem;
		}
		.tactical-card {
			padding: 1.5rem;
		}
		.card-title {
			font-size: 1.75rem;
		}
	}
</style>
