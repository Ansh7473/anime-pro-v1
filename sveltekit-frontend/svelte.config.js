import adapterVercel from '@sveltejs/adapter-vercel';
import adapterStatic from '@sveltejs/adapter-static';
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
		// Use Vercel adapter for web, Static for mobile/desktop
		adapter: (() => {
			console.log('--- Svelte Config ---');
			console.log('APP_PLATFORM:', process.env.APP_PLATFORM);
			// Desktop and Mobile (Android) both need the static adapter
			if (process.env.APP_PLATFORM === 'desktop' || process.env.APP_PLATFORM === 'mobile') {
				console.log('Choosing Static Adapter for Platform Build');
				return adapterStatic({
					fallback: 'index.html',
					pages: 'build',
					assets: 'build',
					precompress: false,
					strict: false
				});
			}
			console.log('Choosing Vercel Adapter');
			return adapterVercel({
				runtime: 'nodejs20.x'
			});
		})()
	}
};

export default config;
