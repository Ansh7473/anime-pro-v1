<script lang="ts">
	import { Heart, Server, Database, Zap, QrCode, Copy, Shield, Activity, BarChart3, Globe } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	let copied = $state(false);

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<div class="tactical-page-container">
	<!-- Background HUD Elements -->
	<div class="tactical-hud-overlay">
		<div class="tactical-hud-circle dashed large" style="top: -15%; left: -10%; width: 700px; height: 700px; opacity: 0.1;"></div>
		<div class="tactical-hud-circle dashed medium" style="bottom: -10%; right: -5%; width: 450px; height: 450px; opacity: 0.1;"></div>
		<div class="tactical-grid absolute inset-0 opacity-20"></div>
	</div>

	<main class="tactical-content">
		<!-- Support Protocol Header -->
		<header class="tactical-header" in:fade={{ duration: 600 }}>
			<div class="status-badge pulse-red">
				<Heart size={14} class="text-red-500 fill-red-500" />
				<span class="status-label" style="color: #ff4d4d;">DONATION_PROTOCOL // ACTIVE</span>
			</div>
			<h1 class="tactical-title">
				SUPPORT <span class="version-tag">// CORE_DRIVE</span>
			</h1>
			<p class="tactical-subtitle">
				Power our high-performance global nodes and help us stay ad-free forever. 
				Directly sync your support to our core.
			</p>
		</header>

		<!-- Donation Selection -->
		<div class="donation-grid" in:fade={{ delay: 200 }}>
			<!-- Paytm / UPI Card -->
			<section class="tactical-glass donation-card primary">
				<div class="card-tag">PAYMENT_METHOD // 01</div>
				
				<!-- Profile Header -->
				<div class="profile-header">
					<div class="avatar-ring">
						<img src="/profile_avatar.png" alt="Profile" class="avatar-img" />
					</div>
					<div class="profile-name">
						<span>Ansh Soni</span>
						<div class="check-container">
							<Shield size={10} class="text-white fill-blue-400" />
						</div>
					</div>
				</div>

				<h2 class="method-title">PAYTM / UPI</h2>
				
				<div class="qr-container">
					<div class="qr-frame">
						<div class="scanner-line"></div>
						<!-- User provided QR image should be placed at /paytm_qr.jpg -->
						<img src="/paytm_qr.jpg" alt="Paytm QR Code" class="qr-image" 
							onerror={(e) => { (e.target as HTMLImageElement).src = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=9516611492@ptsbi&pn=Ansh%20Soni&cu=INR' }} />
						<div class="corner t-l"></div>
						<div class="corner t-r"></div>
						<div class="corner b-l"></div>
						<div class="corner b-r"></div>
					</div>
					<div class="status-indicator">
						<Shield size={12} />
						<span>ENCRYPTED_TRANSACTION</span>
					</div>
				</div>

				<div class="upi-details">
					<div class="addr-head">
						<span class="addr-label">UPI_ID // STATIC</span>
						<span class="addr-net">PRIMARY_LINK</span>
					</div>
					<code class="addr-code">9516611492@ptsbi</code>
					
					<button 
						onclick={() => copyToClipboard('9516611492@ptsbi')} 
						class="tactical-btn copy-btn"
						class:copied
					>
						{#if copied}
							<span class="text-green-400">SYNC_SUCCESSFUL</span>
						{:else}
							<Copy size={18} />
							<span>COPY_UPI_ID</span>
						{/if}
					</button>

					<!-- App Logos -->
					<div class="app-logos">
						<span>SCAN WITH ANY UPI APP</span>
						<div class="logo-row">
							<img src="/paytm_logo.png" alt="Paytm" />
							<img src="/phonepe_logo.png" alt="PhonePe" />
							<img src="/googlepay_logo.png" alt="GPay" />
							<img src="/bhim_logo.png" alt="BHIM" />
						</div>
					</div>
				</div>
			</section>

			<!-- Crypto Card (Coming Soon) -->
			<section class="tactical-glass donation-card secondary blur">
				<div class="card-tag">PAYMENT_METHOD // 02</div>
				<h2 class="method-title">CRYPTO_ASSETS</h2>
				<div class="placeholder-content">
					<Zap size={48} class="text-blue-400 opacity-20" />
					<p class="placeholder-text">NODESECURE_CRYPTO_PROTOCOL</p>
					<span class="coming-soon">INITIALIZING_SOON...</span>
				</div>
			</section>
		</div>

		<div class="tactical-guide" in:fade={{ delay: 1000 }}>
			<span>DEFEATING_ADS_EVERYWHERE // POWERED_BY_COMMUNITY // © 2024 ANIME_PRO_CORE</span>
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
		max-width: 900px;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.tactical-header {
		text-align: center;
		margin-bottom: 3rem;
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

	.donation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 2rem;
		width: 100%;
		margin-bottom: 3rem;
	}

	.donation-card {
		padding: 2.5rem;
		border-radius: 2rem;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: transform 0.3s ease;
	}

	.donation-card:hover {
		transform: translateY(-5px);
	}

	.donation-card.primary {
		background: rgba(26, 115, 232, 0.05);
		border: 1px solid rgba(26, 115, 232, 0.2);
	}

	.donation-card.secondary.blur {
		background: rgba(255, 255, 255, 0.02);
		border: 1px dashed rgba(255, 255, 255, 0.1);
		justify-content: center;
	}

	.card-tag {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.2em;
		color: var(--tactical-outline);
		margin-bottom: 0.5rem;
	}

	.method-title {
		font-size: 1.5rem;
		font-weight: 800;
		margin-bottom: 2rem;
		letter-spacing: 0.1em;
		opacity: 0.8;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1.5rem;
		gap: 0.75rem;
	}

	.avatar-ring {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		padding: 3px;
		background: linear-gradient(135deg, #00baf2, #1a73e8);
		position: relative;
		overflow: hidden;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid var(--tactical-bg);
	}

	.profile-name {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 1.25rem;
		font-weight: 700;
		color: #ffffff;
	}

	.check-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: #00baf2;
		border-radius: 50%;
	}

	.qr-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.qr-frame {
		position: relative;
		padding: 1.5rem;
		background: white; /* Clean background for QR */
		border-radius: 1.5rem;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
		overflow: hidden;
	}

	.qr-image {
		width: 220px;
		height: 220px;
		display: block;
		object-fit: contain;
	}

	.scanner-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: #00baf2; /* Paytm Blue */
		box-shadow: 0 0 15px #00baf2;
		animation: scan 4s linear infinite;
		z-index: 2;
	}

	@keyframes scan {
		0%, 100% { top: 0%; opacity: 0; }
		10%, 90% { opacity: 0.8; }
		50% { top: 100%; opacity: 1; }
	}

	.corner {
		position: absolute;
		width: 15px;
		height: 15px;
		border: 3px solid #00baf2;
		opacity: 0.5;
	}
	.t-l { top: 1rem; left: 1rem; border-right: 0; border-bottom: 0; }
	.t-r { top: 1rem; right: 1rem; border-left: 0; border-bottom: 0; }
	.b-l { bottom: 1rem; left: 1rem; border-right: 0; border-top: 0; }
	.b-r { bottom: 1rem; right: 1rem; border-left: 0; border-top: 0; }

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--tactical-outline);
	}

	.upi-details {
		width: 100%;
		background: rgba(0, 0, 0, 0.3);
		padding: 1.25rem;
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.addr-head {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 0.55rem;
	}

	.addr-label { color: var(--tactical-outline); }
	.addr-net { color: #00baf2; }

	.addr-code {
		font-family: var(--font-mono);
		font-size: 1rem;
		color: var(--tactical-primary);
		background: rgba(173, 199, 255, 0.05);
		padding: 0.75rem;
		border-radius: 0.5rem;
		text-align: center;
	}

	.copy-btn {
		background: var(--tactical-primary-container);
		color: white;
		height: 3rem;
		border-radius: 0.75rem;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.copy-btn.copied {
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.3);
		color: #4ade80;
	}

	.app-logos {
		margin-top: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.app-logos span {
		font-size: 0.55rem;
		font-family: var(--font-mono);
		color: var(--tactical-outline);
		letter-spacing: 0.1em;
	}

	.logo-row {
		display: flex;
		gap: 1.25rem;
		align-items: center;
		opacity: 0.7;
	}

	.logo-row img {
		height: 18px;
		filter: brightness(0) invert(1);
		transition: opacity 0.3s ease;
	}

	.logo-row img:hover {
		opacity: 1;
	}

	.placeholder-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		opacity: 0.6;
	}

	.placeholder-text {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		letter-spacing: 0.1em;
	}

	.coming-soon {
		font-size: 0.6rem;
		padding: 0.25rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 1rem;
		color: var(--tactical-outline);
	}

	.tactical-guide {
		margin-top: 3rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--tactical-outline);
		opacity: 0.4;
		letter-spacing: 0.2em;
		text-align: center;
	}
</style>
