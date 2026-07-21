import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { normalizeTMDBPage } from '$lib/tmdb';
import { absoluteUrl } from '$lib/seo';

const categories = new Set(['popular', 'now_playing', 'top_rated', 'upcoming']);

export const load: PageServerLoad = async ({ fetch, url, setHeaders }) => {
	const requestedCategory = url.searchParams.get('category') || 'popular';
	const category = categories.has(requestedCategory) ? requestedCategory : 'popular';
	const requestedPage = Number(url.searchParams.get('page'));
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	try {
		const response = await api.getTMDBMovies(category, page, fetch);
		setHeaders({
			'Cache-Control': 'public, max-age=120, s-maxage=900, stale-while-revalidate=3600'
		});
		return {
			catalog: normalizeTMDBPage(response, page),
			category,
			canonicalUrl: absoluteUrl('/films/'),
			loadError: ''
		};
	} catch (loadError) {
		console.error('Failed to load TMDB films:', loadError);
		// An outage response must never become the cached catalog page.
		setHeaders({ 'Cache-Control': 'no-store' });
		return {
			catalog: normalizeTMDBPage(null, page),
			category,
			canonicalUrl: absoluteUrl('/films/'),
			loadError: 'The film desk is temporarily unavailable.'
		};
	}
};
