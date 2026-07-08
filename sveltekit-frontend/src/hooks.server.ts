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
	const isPrivate = path.startsWith('/profile') || path.startsWith('/settings') || path.startsWith('/watchlist') || path.startsWith('/history');
	const isApi = path.startsWith('/api/');

	if (isGet && !isPrivate && !isApi && !response.headers.has('Cache-Control')) {
		// CDN (Cloudflare Pages): cache SSR HTML for 5 min, stale-while-revalidate 1h
		// Browser: cache for 60 seconds
		response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400');
		response.headers.set('Vary', 'Accept-Encoding');
	}

	return response;
};
