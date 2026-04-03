<script lang="ts">
	import { Heart, Server, Database, Zap, QrCode, Copy, Shield, Activity, BarChart3, Globe } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let copied = $state(false);
	let logs = $state([
		"SYS_INIT: SUPPORT_PROTOCOL_V3",
		"NET_SCAN: GLOBAL_NODES_ACTIVE",
		"SECURE_LAYER: AES256_ENABLED"
	]);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	$effect(() => {
		const interval = setInterval(() => {
			const actions = [
				"NODE_SYNC_COMPLETE", 
				"DATA_REPLICATION_SUCCESS", 
				"ENCRYPTION_HASH_VERIFIED", 
				"CLUSTER_LATENCY_OPTIMIZED",
				"UI_PROTOCOL_SYNCED"
			];
			const randomAction = actions[Math.floor(Math.random() * actions.length)];
			logs = [randomAction, ...logs.slice(0, 4)];
		}, 3000);
		return () => clearInterval(interval);
	});
</script>

<div class="tactical-page-container">
	<!-- Background HUD Elements -->
	<div class="tactical-hud-overlay">
		<div class="tactical-hud-circle dashed large" style="top: -15%; left: -10%; width: 700px; height: 700px; opacity: 0.1;"></div>
		<div class="tactical-hud-circle dashed medium" style="bottom: -10%; right: -5%; width: 450px; height: 450px; animation-direction: reverse; opacity: 0.1;"></div>
		<div class="tactical-grid absolute inset-0 opacity-30"></div>
	</div>

	<main class="tactical-content">
		<!-- Support Protocol Header -->
		<header class="tactical-header" in:fade={{ duration: 600 }}>
			<div class="status-badge pulse-red">
				<Heart size={14} class="text-red-500 fill-red-500" />
				<span class="status-label" style="color: #ff4d4d;">SUPPORT_PROTOCOL // ACTIVE_LINK</span>
			</div>
			<h1 class="tactical-title">
				CORE_SYNC <span class="version-tag">// MAINTENANCE</span>
			</h1>
			<p class="tactical-subtitle">
				Initialize infrastructure sustainment protocol. Your contributions directly power 
				our high-performance global nodes and encrypted database clusters.
			</p>
		</header>

		<!-- Impact Stats Section -->
		<div class="tactical-stats-grid" in:fade={{ delay: 200 }}>
			<div class="tactical-glass stat-card">
				<div class="stat-header">
					<Server size={20} class="text-purple-400" />
					<span class="stat-tag">INFRASTRUCTURE</span>
				</div>
				<h3 class="stat-title">NODE_GLOBAL</h3>
				<div class="stat-progress">
					<div class="progress-info">
						<span class="p-label text-purple-400">OPERATIONAL_CAPACITY</span>
						<span class="p-value">94.2%</span>
					</div>
					<div class="progress-bar">
						<div class="progress-fill shimmer" style="width: 94.2%; background: #a855f7;"></div>
					</div>
				</div>
			</div>

			<div class="tactical-glass stat-card">
				<div class="stat-header">
					<Database size={20} class="text-blue-400" />
					<span class="stat-tag">STORAGE_CORE</span>
				</div>
				<h3 class="stat-title">METADATA_CLUSTER</h3>
				<div class="stat-progress">
					<div class="progress-info">
						<span class="p-label text-blue-400">DATA_REPLICATION</span>
						<span class="p-value">82.1%</span>
					</div>
					<div class="progress-bar">
						<div class="progress-fill shimmer" style="width: 82.1%; background: #3b82f6;"></div>
					</div>
				</div>
			</div>

			<div class="tactical-glass stat-card">
				<div class="stat-header">
					<Zap size={20} class="text-yellow-400" />
					<span class="stat-tag">DEVELOPMENT</span>
				</div>
				<h3 class="stat-title">SYNC_PROTOCOL_V3</h3>
				<div class="stat-progress">
					<div class="progress-info">
						<span class="p-label text-yellow-400">AUTO_DEPLOYMENT</span>
						<span class="p-value">67.8%</span>
					</div>
					<div class="progress-bar">
						<div class="progress-fill shimmer" style="width: 67.8%; background: #eab308;"></div>
					</div>
				</div>
			</div>
		</div>

		<!-- Donation Method -->
		<section 
			class="tactical-glass donation-terminal"
			in:fly={{ y: 50, duration: 800, delay: 400 }}
		>
			<div class="terminal-header">
				<div class="t-line"></div>
				<h2 class="terminal-title">INITIALIZE_CONTRIBUTION_NODE</h2>
				<div class="t-line"></div>
			</div>

			<div class="terminal-body">
				<div class="qr-scanner-visual">
					<div class="qr-frame">
						<div class="scanner-line"></div>
						<QrCode size={180} class="qr-icon opacity-60" />
						<div class="corner t-l"></div>
						<div class="corner t-r"></div>
						<div class="corner b-l"></div>
						<div class="corner b-r"></div>
					</div>
					<div class="qr-status">
						<Shield size={12} />
						<span>DATA_ENCRYPTED_AES256</span>
					</div>
				</div>

				<div class="donation-details">
					<div class="method-header">
						<span class="m-label">PRIMARY_ASSET</span>
						<h3 class="m-value">BITCOIN_BTC</h3>
					</div>

					<div class="address-terminal">
						<div class="addr-head">
							<span class="addr-label">WALLET_ADDRESS // STATIC</span>
							<span class="addr-net">BTC_NETWORK</span>
						</div>
						<code class="addr-code">bc1qxy2kgdy6jr56x7mxq7z77v5xxxxxxxxxx</code>
						
						<button 
							on:click={() => copyToClipboard('bc1qxy2kgdy6jr56x7mxq7z77v5xxxxxxxxxx')} 
							class="tactical-btn copy-btn"
							class:copied
						>
							{#if copied}
								<span class="text-green-400">ADDRESS_COPIED_TOCLIPBOARD</span>
							{:else}
								<Copy size={18} />
								<span>SYNC_TO_CLIPBOARD</span>
							{/if}
						</button>
					</div>

					<!-- Operational Log Terminal -->
					<div class="log-terminal">
						<div class="log-header">
							<Activity size={12} class="animate-pulse" />
							<span>OPERATIONAL_TELEMETRY</span>
						</div>
						<div class="log-content">
							{#each logs as log, i}
								<div class="log-entry" in:fly={{ x: -10, duration: 300 }}>
									<span class="log-time">[{new Date().toLocaleTimeString()}]</span>
									<span class="log-text">{log}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Footer Telemetry -->
		<footer class="tactical-footer" in:fade={{ delay: 800 }}>
			<div class="footer-stat-card">
				<Globe size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">GLOBAL_REACH</span>
					<span class="stat-value">124_NODES</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<BarChart3 size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">SERVER_COST</span>
					<span class="stat-value">CRITICAL</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<Shield size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">SECURITY</span>
					<span class="stat-value">LEVEL_5</span>
				</div>
			</div>
			<div class="footer-stat-card">
				<Activity size={16} class="stat-icon" />
				<div class="stat-data">
					<span class="stat-label">LOAD_BAL</span>
					<span class="stat-value">HYPERLINK</span>
				</div>
			</div>
		</footer>

		<div class="tactical-guide" in:fade={{ delay: 1000 }}>
			<span>DEFEATING_ADS_EVERYWHERE // POWERED_BY_COMMUNITY_SYNC_PROTCOL // © 2024 ANIME_PRO_CORE</span>
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
		padding: 6rem 1.5rem;
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
		max-width: 1000px;
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
		background: rgba(239, 68, 68, 0.1);
		border-radius: 2rem;
		margin-bottom: 1.5rem;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.status-label {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
	}

	.pulse-red {
		animation: pulse-red 2s infinite;
	}

	@keyframes pulse-red {
		0%, 100% { border-color: rgba(239, 68, 68, 0.2); box-shadow: 0 0 5px rgba(239, 68, 68, 0.1); }
		50% { border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
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

	.tactical-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		width: 100%;
		margin-bottom: 3rem;
	}

	.stat-card {
		padding: 1.5rem;
		border-radius: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.stat-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.stat-tag {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: var(--tactical-outline);
	}

	.stat-title {
		font-size: 1.1rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
		letter-spacing: 0.05em;
	}

	.stat-progress {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.55rem;
	}

	.progress-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
	}

	.donation-terminal {
		width: 100%;
		border-radius: 2rem;
		padding: 3rem;
		margin-bottom: 3rem;
		position: relative;
	}

	.terminal-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.t-line { flex: 1; height: 1px; background: rgba(173, 199, 255, 0.1); }

	.terminal-title {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.3em;
		color: var(--tactical-primary);
		text-align: center;
	}

	.terminal-body {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4rem;
		align-items: center;
	}

	@media (max-width: 768px) {
		.donation-terminal { padding: 1.5rem; }
		.terminal-body { grid-template-columns: 1fr; gap: 2rem; }
		.terminal-header { margin-bottom: 2rem; }
	}

	.qr-scanner-visual {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
	}

	.qr-frame {
		position: relative;
		padding: 1.5rem;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(173, 199, 255, 0.1);
		border-radius: 1rem;
	}

	.scanner-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: var(--tactical-primary);
		box-shadow: 0 0 8px var(--tactical-primary);
		animation: scan 3s linear infinite;
		z-index: 2;
	}

	@keyframes scan {
		0%, 100% { top: 0%; opacity: 0; }
		10%, 90% { opacity: 0.6; }
		50% { top: 100%; opacity: 1; }
	}

	.corner {
		position: absolute;
		width: 12px;
		height: 12px;
		border: 2px solid var(--tactical-primary);
		opacity: 0.5;
	}
	.t-l { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
	.t-r { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
	.b-l { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
	.b-r { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

	.qr-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: var(--tactical-outline);
	}

	.donation-details {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.method-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.m-label {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--tactical-outline);
		letter-spacing: 0.2em;
	}

	.m-value {
		font-size: 2rem;
		font-weight: 800;
		color: var(--net-text);
	}

	.address-terminal {
		background: rgba(0, 0, 0, 0.4);
		padding: 1.5rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.addr-head {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.55rem;
	}

	.addr-label { color: var(--tactical-outline); }
	.addr-net { color: #f7931a; }

	.addr-code {
		font-family: var(--font-mono);
		font-size: clamp(0.75rem, 3vw, 1.1rem);
		color: var(--tactical-primary);
		background: rgba(173, 199, 255, 0.05);
		padding: 1rem;
		border-radius: 0.5rem;
		word-break: break-all;
	}

	.copy-btn {
		background: var(--tactical-primary-container);
		color: white;
		height: 3.5rem;
		border-radius: 0.75rem;
		font-size: 0.8rem;
	}

	.copy-btn.copied {
		background: rgba(0, 255, 0, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.3);
	}

	.terminal-meta {
		display: flex;
		gap: 2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	.meta-bit {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.mb-label { font-family: var(--font-mono); font-size: 0.5rem; color: var(--tactical-outline); letter-spacing: 0.1em; }
	.mb-val { font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700; color: var(--tactical-primary); }

	.tactical-footer {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		width: 100%;
	}

	@media (min-width: 768px) {
		.tactical-footer { grid-template-columns: repeat(4, 1fr); }
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

	.stat-icon { color: var(--tactical-outline); opacity: 0.4; }

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
		margin-top: 4rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--tactical-outline);
		opacity: 0.4;
		letter-spacing: 0.2em;
		text-align: center;
	}

	.shimmer {
		position: relative;
		overflow: hidden;
	}

	.shimmer::after {
		content: '';
		position: absolute;
		left: -100%;
		top: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		animation: shimmer-load 2s infinite;
	}

	@keyframes shimmer-load {
		100% { left: 100%; }
	}

	.tactical-tiers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		width: 100%;
		margin-bottom: 4rem;
	}

	.tier-card {
		padding: 2rem;
		border-radius: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		transition: all 0.4s var(--transition);
		position: relative;
		overflow: hidden;
	}

	.tier-card:hover {
		transform: translateY(-10px);
		border-color: var(--tactical-primary);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}

	.tier-card.featured {
		background: rgba(26, 115, 232, 0.1);
		border: 1px solid rgba(173, 199, 255, 0.3);
		box-shadow: 0 0 30px rgba(26, 115, 232, 0.1);
	}

	.tier-badge {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--tactical-primary);
		letter-spacing: 0.2em;
		background: rgba(173, 199, 255, 0.1);
		padding: 0.4rem 0.8rem;
		border-radius: 0.5rem;
		width: fit-content;
	}

	.tier-price {
		font-size: 2.5rem;
		font-weight: 800;
		color: white;
	}

	.tier-desc {
		font-size: 0.9rem;
		color: var(--net-text-muted);
		line-height: 1.5;
	}

	.tier-features {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--tactical-primary);
	}

	.log-terminal {
		margin-top: 1rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(173, 199, 255, 0.1);
		border-radius: 0.75rem;
		overflow: hidden;
	}

	.log-header {
		background: rgba(173, 199, 255, 0.05);
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid rgba(173, 199, 255, 0.1);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--tactical-outline);
	}

	.log-content {
		padding: 1rem;
		height: 120px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow: hidden;
	}

	.log-entry {
		display: flex;
		gap: 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.65rem;
	}

	.log-time { color: var(--tactical-outline); opacity: 0.5; }
	.log-text { color: var(--tactical-primary); }
</style>
