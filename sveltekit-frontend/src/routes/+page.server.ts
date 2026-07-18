import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

const fallbackHomeData = { trending: [], popular: [], topRated: [], action: [], romance: [], movies: [], seasonal: [] };

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	// Home rows are fetched with one bundled AniList GraphQL operation.
	setHeaders({
		'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	// Await event.fetch while load is active. Reusing this single result keeps
	// the one-request home bundle without triggering SvelteKit's post-load fetch
	// warning from streamed promise handlers.
	const bundle = await withSeoTimeout(api.getHomeBundle(fetch), fallbackHomeData).catch((error) => {
		console.error('Failed to load home bundle for SSR:', error);
		return fallbackHomeData;
	});

	return {
		homeData: {
			trending: bundle.trending || [],
			popular: bundle.popular || [],
			topRated: bundle.topRated || [],
			action: bundle.action || [],
			romance: bundle.romance || [],
			movies: bundle.movies || []
		},
		seasonal: {
			items: bundle.seasonal || [],
			href: '/explore/seasonal',
			title: 'New This Season'
		}
	};
};
