import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.hostname === 'www.watchanimez.me') {
		event.url.hostname = 'watchanimez.me';
		throw redirect(308, event.url.toString());
	}

	const response = await resolve(event);

	// Skip cache headers for non-GET, auth pages, and user pages
	const path = event.url.pathname;
	const isGet = event.request.method === 'GET';
	const isPrivate = ['/auth', '/profile', '/settings', '/watchlist', '/history', '/tv/profile', '/tv/settings']
		.some((privatePath) => path === privatePath || path.startsWith(`${privatePath}/`));
	const isApi = path.startsWith('/api/');
	const isPersonalized = event.request.headers.has('authorization') || response.headers.has('set-cookie');

	if (isPrivate || isPersonalized) {
		response.headers.set('Cache-Control', 'private, no-store');
	} else if (isGet && !isApi && !response.headers.has('Cache-Control')) {
		// CDN (Cloudflare Pages): cache SSR HTML for 5 min, stale-while-revalidate 1h
		// Browser: cache for 60 seconds
		response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400');
		response.headers.set('Vary', 'Accept-Encoding');
	}

	return response;
};
