import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

const fallbackHomeData = { trending: [], popular: [], topRated: [], action: [], romance: [], movies: [] };

export const load: PageServerLoad = ({ fetch }) => {
	// Return the promise WITHOUT awaiting so SvelteKit streams it.
	// The HTML shell (hero + row skeletons) is flushed and painted immediately,
	// then the resolved data is streamed in and swapped via {#await} on the page.
	// withSeoTimeout falls back to empty data if the backend is slow, so the
	// stream never hangs (good for crawlers and TTFB).
	return {
		homeData: withSeoTimeout(api.getHome(false, fetch), fallbackHomeData).catch((error) => {
			console.error('Failed to load home data for SSR:', error);
			return fallbackHomeData;
		})
	};
};
