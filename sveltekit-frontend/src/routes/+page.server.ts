import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

const fallbackHomeData = { trending: [], popular: [], topRated: [], action: [], romance: [], movies: [] };
const fallbackEmpty = { data: [], pagination: { has_next_page: false } };

export const load: PageServerLoad = ({ fetch, setHeaders }) => {
	// Home data (trending/popular) changes occasionally, not minute-to-minute.
	setHeaders({
		'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600, stale-if-error=86400'
	});
	// Return the promise WITHOUT awaiting so SvelteKit streams it.
	// The HTML shell (hero + row skeletons) is flushed and painted immediately,
	// then the resolved data is streamed in and swapped via {#await} on the page.
	// withSeoTimeout falls back to empty data if the backend is slow, so the
	// stream never hangs (good for crawlers and TTFB).
	return {
		homeData: withSeoTimeout(api.getHome(false, fetch), fallbackHomeData).catch((error) => {
			console.error('Failed to load home data for SSR:', error);
			return fallbackHomeData;
		}),
		// Fetch seasonal server-side so client doesn't make an extra API call on mount
		seasonal: withSeoTimeout(api.getCurrentSeasonal(1, 20, fetch), fallbackEmpty)
			.then((r: any) => ({ items: r?.data || [], href: '/explore/seasonal', title: 'New This Season' }))
			.catch(() => ({ items: [], href: '/explore/seasonal', title: 'New This Season' }))
	};
};
