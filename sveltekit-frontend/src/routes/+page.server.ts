import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

const fallbackHomeData = { trending: [], popular: [], topRated: [], action: [], romance: [], movies: [], seasonal: [] };

export const load: PageServerLoad = ({ fetch, setHeaders }) => {
	// Home rows are fetched with one bundled AniList GraphQL operation.
	setHeaders({
		'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	// Return the promise WITHOUT awaiting so SvelteKit streams it. Reuse the same
	// promise for home rows and seasonal so the homepage makes one AniList request,
	// not two separate paginated calls.
	const homeBundle = withSeoTimeout(api.getHomeBundle(fetch), fallbackHomeData).catch((error) => {
		console.error('Failed to load home bundle for SSR:', error);
		return fallbackHomeData;
	});

	return {
		homeData: homeBundle.then((bundle: any) => ({
			trending: bundle.trending || [],
			popular: bundle.popular || [],
			topRated: bundle.topRated || [],
			action: bundle.action || [],
			romance: bundle.romance || [],
			movies: bundle.movies || []
		})),
		seasonal: homeBundle.then((bundle: any) => ({
			items: bundle.seasonal || [],
			href: '/explore/seasonal',
			title: 'New This Season'
		}))
	};
};
