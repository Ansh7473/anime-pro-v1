import { build, files, version } from '$service-worker';

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	// Skip manifest and other metadata files to avoid syntax errors if they return stale HTML
	if (event.request.url.includes('manifest.json') || event.request.url.includes('favicon')) {
		return;
	}

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `build`/`files` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		const isNavigate = event.request.mode === 'navigate';

		// For navigations, race the network against a timeout so a slow or hung
		// origin can't leave the user staring at a blank screen — fall back to
		// the cached page (stale-while-revalidate) instead.
		if (isNavigate) {
			const cachedResponse = await cache.match(event.request);
			try {
				const response = await fetchWithTimeout(event.request, 4000);
				if (response && response.ok) cache.put(event.request, response.clone());
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
