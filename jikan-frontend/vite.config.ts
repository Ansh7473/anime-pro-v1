import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						if (id.includes('hls.js')) return 'hls';
						if (id.includes('lucide-svelte')) return 'icons';
						return 'vendor';
					}
				}
			}
		}
	},
	server: {
		port: 5174,
	}
});
