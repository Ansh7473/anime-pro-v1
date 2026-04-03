<script lang="ts">
	import { Heart, Server, Database, Shield, Zap, QrCode, Copy } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		// Minimalistic visual feedback could go here
	}
</script>

<div class=\"min-h-screen bg-[#0a0a0b] text-white pt-24 pb-16 px-6\">
	<div class=\"max-w-4xl mx-auto\">
		<!-- Hero -->
		<div class=\"text-center mb-16\" in:fade={{ delay: 200 }}>
			<div class=\"w-24 h-24 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-8\">\n				<Heart size={48} class=\"text-pink-500 animate-pulse\" />
			</div>
			<h1 class=\"text-5xl font-bold mb-6\">Support Anime Pro</h1>
			<p class=\"text-gray-400 text-lg max-w-xl mx-auto\">
				We are a small team dedicated to providing a free, high-quality anime experience. Your donations help us maintain our servers and database.
			</p>
		</div>

		<!-- Where its going -->
		<div class=\"grid md:grid-cols-3 gap-6 mb-16\">\n			<div class=\"bg-[#141417] p-6 rounded-2xl border border-white/5\">\n				<Server class=\"text-purple-500 mb-4\" size={32} />
				<h3 class=\"font-bold mb-2\">Advanced Infrastructure</h3>
				<p class=\"text-gray-500 text-sm\">Handling global traffic with low latency and high uptime.</p>
			</div>
			<div class=\"bg-[#141417] p-6 rounded-2xl border border-white/5\">\n				<Database class=\"text-blue-500 mb-4\" size={32} />
				<h3 class=\"font-bold mb-2\">Massive Database</h3>
				<p class=\"text-gray-500 text-sm\">Maintaining high-quality metadata for thousands of series.</p>
			</div>
			<div class=\"bg-[#141417] p-6 rounded-2xl border border-white/5\">\n				<Zap class=\"text-yellow-500 mb-4\" size={32} />
				<h3 class=\"font-bold mb-2\">Constant Updates</h3>
				<p class=\"text-gray-500 text-sm\">Developing new features and performance optimizations.</p>
			</div>
		</div>

		<!-- Donation Options -->
		<div class=\"bg-gradient-to-br from-[#1c1c21] to-[#141417] border border-white/10 rounded-3xl p-8 md:p-12\">\n			<h2 class=\"text-2xl font-bold mb-8 text-center\">Choose a Donation Method</h2>
			
			<div class=\"space-y-6\">\n				<!-- Crypto Example -->
				<div class=\"flex flex-col md:flex-row items-center gap-8 p-6 bg-black/40 rounded-2xl border border-white/5 group\">\n					<div class=\"bg-gray-800 p-4 rounded-xl\">\n						<QrCode size={120} class=\"opacity-50\" />
					</div>
					<div class=\"flex-1\">\n						<h3 class=\"text-lg font-bold mb-2\">Bitcoin (BTC)</h3>
						<code class=\"text-sm text-gray-500 block break-all bg-black/50 p-3 rounded-lg mb-4\">\n							bc1qxy2kgdy6jr56x7mxq7z77v5xxxxxxxxxx\n						</code>
						<button on:click={() => copyToClipboard('bc1qxy2kgdy6jr56x7mxq7z77v5xxxxxxxxxx')} class=\"flex items-center gap-2 text-pink-500 font-bold hover:text-pink-400 transition-colors\">\n							<Copy size={18} /> Copy Address\n						</button>
					</div>
				</div>

				<p class=\"text-center text-gray-500 text-sm mt-8\">\n					Thank you for keeping Anime Pro alive. ❤️\n				</p>
			</div>
		</div>
	</div>
</div>
