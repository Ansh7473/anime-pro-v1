<script lang="ts">
	import { onMount } from 'svelte';
	import { Monitor, Smartphone, Download, CheckCircle2, ChevronRight, Info } from 'lucide-svelte';
	import { fade, fly, scale } from 'svelte/transition';

	let releases = $state<any[]>([]);
	let loading = $state(true);
	const BACKEND_URL = 'https://anime-pro-v1-backend-go.vercel.app';

	onMount(async () => {
		try {
			const res = await fetch(`${BACKEND_URL}/api/v1/releases/latest`);
			if (res.ok) {
				releases = await res.json();
			}
		} catch (error) {
			console.error('Failed to fetch releases:', error);
		} finally {
			loading = false;
		}
	});

	function getLatest(platform: string) {
		return releases.find((r) => r.platform === platform);
	}
</script>

<div class="min-h-screen bg-[#0a0a0b] text-white pt-24 pb-16 px-6">
	<div class="max-w-6xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-16" in:fade={{ duration: 400 }}>
			<h1 class="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
				Get <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Anime Pro</span> Everywhere
			</h1>
			<p class="text-gray-400 text-lg max-w-2xl mx-auto">
				Experience your favorite anime with our high-performance desktop and mobile applications. 
				Sync your watchlist, get native notifications, and enjoy ad-free streaming.
			</p>
		</div>

		<!-- Grid -->
		<div class="grid md:grid-cols-2 gap-8 mb-20">
			<!-- Windows Card -->
			<div 
				class="group relative bg-[#141417] border border-white/5 rounded-[2.5rem] p-10 overflow-hidden transition-all hover:border-white/20"
				in:fly={{ y: 30, duration: 500, delay: 200 }}
			>
				<div class="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
				
				<div class="relative z-10">
					<div class="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
						<Monitor class="text-blue-500" size={32} />
					</div>
					
					<h2 class="text-3xl font-bold mb-4">Windows Desktop</h2>
					<p class="text-gray-400 mb-8 leading-relaxed">
						The ultimate way to watch on your PC. Supports Picture-in-Picture, native media keys, and hardware acceleration.
					</p>

					<div class="space-y-4 mb-10">
						<div class="flex items-center gap-3 text-sm text-gray-400">
							<CheckCircle2 size={18} class="text-blue-500" />
							<span>Auto-updates enabled</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-gray-400">
							<CheckCircle2 size={18} class="text-blue-500" />
							<span>Multi-window support</span>
						</div>
					</div>

					{#if loading}
						<div class="h-14 bg-white/5 animate-pulse rounded-2xl w-full"></div>
					{:else}
						{@const win = getLatest('windows')}
						<div class="flex flex-col gap-4">
							<a 
								href={win?.download_url || '#'} 
								class="flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
							>
								<Download size={20} /> Download for Windows
							</a>
							<span class="text-center text-xs text-gray-500 font-medium tracking-wider uppercase">
								Version {win?.version || '1.0.0'} • Stable Build
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Android Card -->
			<div 
				class="group relative bg-[#141417] border border-white/5 rounded-[2.5rem] p-10 overflow-hidden transition-all hover:border-white/20"
				in:fly={{ y: 30, duration: 500, delay: 400 }}
			>
				<div class="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all"></div>
				
				<div class="relative z-10">
					<div class="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mb-8">
						<Smartphone class="text-green-500" size={32} />
					</div>
					
					<h2 class="text-3xl font-bold mb-4">Android Mobile</h2>
					<p class="text-gray-400 mb-8 leading-relaxed">
						Take your anime anywhere. Optimized for battery life, offline watchlist, and fast mobile data streaming.
					</p>

					<div class="space-y-4 mb-10">
						<div class="flex items-center gap-3 text-sm text-gray-400">
							<CheckCircle2 size={18} class="text-green-500" />
							<span>V5 Engine Optimized</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-gray-400">
							<CheckCircle2 size={18} class="text-green-500" />
							<span>Cast to Smart TV</span>
						</div>
					</div>

					{#if loading}
						<div class="h-14 bg-white/5 animate-pulse rounded-2xl w-full"></div>
					{:else}
						{@const apk = getLatest('android')}
						<div class="flex flex-col gap-4">
							<a 
								href={apk?.download_url || '#'} 
								class="flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
							>
								<Smartphone size={20} /> Download APK
							</a>
							<span class="text-center text-xs text-gray-500 font-medium tracking-wider uppercase">
								Version {apk?.version || '1.0.0'} • Latest APK
							</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Guide -->
		<div 
			class="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6"
			in:fade={{ delay: 800 }}
		>
			<div class="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
				<Info class="text-blue-400" size={24} />
			</div>
			<div class="flex-1">
				<h4 class="font-bold text-lg mb-1">Android Installation Tip</h4>
				<p class="text-gray-400 text-sm">
					Since we are not on the Play Store yet, you may need to enable "Install from Unknown Sources" in your phone settings to install the APK.
				</p>
			</div>
			<ChevronRight class="text-gray-600 hidden md:block" />
		</div>
	</div>
</div>

<style>
	/* Custom styles to match the premium design */
</style>
