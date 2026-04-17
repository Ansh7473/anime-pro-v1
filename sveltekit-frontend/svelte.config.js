import adapterStatic from '@sveltejs/adapter-static';
import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import { relative, sep } from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// defaults to rune mode for the project, except for `node_modules`. Can be removed in svelte 6.
		runes: ({ filename }) => {
			const relativePath = relative(import.meta.dirname, filename);
			const pathSegments = relativePath.toLowerCase().split(sep);
			const isExternalLibrary = pathSegments.includes('node_modules');

			return isExternalLibrary ? undefined : true;
		}
	},
	kit: {
		// Ensure relative paths for platform builds (Capacitor/Electron)
		// This converts absolute links like "/_app/..." to "./_app/..."
		paths: {
			relative: (process.env.APP_PLATFORM === 'desktop' || process.env.APP_PLATFORM === 'mobile')
		},
		// Choose adapter based on platform
		adapter: (() => {
			console.log('--- Svelte Hub Config ---');
			console.log('PLATFORM:', process.env.APP_PLATFORM);
			
			if (process.env.APP_PLATFORM === 'desktop' || process.env.APP_PLATFORM === 'mobile') {
				return adapterStatic({
					fallback: 'index.html',
					pages: 'build',
					assets: 'build',
					precompress: false,
					strict: false
				});
			}

			// Default to Cloudflare for web deployments
			return adapterCloudflare();
		})()
	}
};

export default config;
