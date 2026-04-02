import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5174,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			'/animelok-api': {
				target: 'https://animelok.xyz',
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/animelok-api/, '/api/anime'),
				headers: {
					'Origin': 'https://animelok.xyz',
					'Referer': 'https://animelok.xyz/',
					'Accept': 'application/json, text/plain, */*',
				},
			}
		}
	}
});
