import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	// Activate this new SW immediately instead of waiting for all old tabs to
	// close. Without this, a deploy leaves users pinned to the previous build
	// (stale JS chunks) until every tab is closed — which is why "pushed code"
	// didn't reach users.
	self.skipWaiting();
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function activate() {
		// Purge every cache that isn't the current version so stale build assets
		// can never be served again.
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
		// Take control of already-open pages right now so they start using the
		// fresh build without needing a manual hard-refresh.
		await self.clients.claim();
	}

	event.waitUntil(activate());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const requestURL = new URL(event.request.url);
	// SvelteKit data requests already carry explicit HTTP cache headers and are
	// never persisted by this worker. Let the browser send them directly so the
	// worker cannot add an extra cache-open/network-forwarding hop.
	if (requestURL.pathname.endsWith('/__data.json')) return;

	// Skip manifest and other metadata files to avoid syntax errors if they return stale HTML
	if (event.request.url.includes('manifest.json') || event.request.url.includes('favicon')) {
		return;
	}

	async function respond() {
		const url = requestURL;
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		const isNavigate = event.request.mode === 'navigate';
		const isPrivateRoute = ['/auth', '/profile', '/settings', '/watchlist', '/history', '/tv/profile', '/tv/settings']
			.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`));

		// Never persist account pages in the service-worker cache. Cloudflare and
		// the browser should both fetch these from the network for each visit.
		if (isNavigate && isPrivateRoute) {
			return fetchWithTimeout(event.request, 4000);
		}

		// Dynamic SSR routes can legitimately take longer on a cold worker because
		// their server loaders call upstream APIs. Keep an offline fallback, but do
		// not abort healthy navigations after only four seconds.
		if (isNavigate) {
			const cachedResponse = await cache.match(event.request);
			try {
				const response = await fetchWithTimeout(event.request, 12000);
				const cacheControl = response?.headers.get('Cache-Control') || '';
				const cacheable = response?.ok &&
					!cacheControl.toLowerCase().includes('no-store') &&
					!response.headers.has('Set-Cookie');
				if (cacheable) cache.put(event.request, response.clone());
				return response;
			} catch {
				if (cachedResponse) return cachedResponse;
				return new Response('Offline — please check your connection.', {
					status: 503,
					statusText: 'Service Unavailable',
					headers: { 'Content-Type': 'text/plain' }
				});
			}
		}

		// for everything else, try the network first, but fall back to the cache if we're offline
		try {
			const response = await fetch(event.request);
			return response;
		} catch {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;

			// Return a 404 response if not in cache either, to avoid respondWith(undefined) crash
			return new Response("Not available offline", {
				status: 404,
				statusText: "Not Found",
				headers: { "Content-Type": "text/plain" }
			});
		}
	}

	event.respondWith(respond());
});

// Fetch that rejects if the network takes longer than `ms`, so navigations
// never hang on a slow origin.
function fetchWithTimeout(request, ms) {
	return new Promise((resolve, reject) => {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), ms);
		fetch(request, { signal: controller.signal })
			.then((res) => { clearTimeout(timer); resolve(res); })
			.catch((err) => { clearTimeout(timer); reject(err); });
	});
}
