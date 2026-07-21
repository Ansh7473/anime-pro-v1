import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { unwrapTMDB } from '$lib/tmdb';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch, url, setHeaders }) => {
	if (!/^[1-9]\d*$/.test(params.id)) error(400, 'Invalid TMDB movie ID');

	const requestedRegion = url.searchParams.get('region') || 'US';
	const region = /^[a-z]{2}$/i.test(requestedRegion) ? requestedRegion.toUpperCase() : 'US';

	let movie: any;
	try {
		movie = unwrapTMDB(await api.getTMDBMovie(params.id, fetch));
	} catch (cause) {
		console.error(`Failed to load TMDB movie ${params.id}:`, cause);
		error(404, 'Film not found');
	}
	if (!movie?.id) error(404, 'Film not found');

	let providers: any = null;
	try {
		providers = unwrapTMDB(await api.getTMDBWatchProviders(params.id, region, fetch));
	} catch (cause) {
		console.warn(`Failed to load watch providers for TMDB movie ${params.id}:`, cause);
	}

	setHeaders({
		'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400'
	});

	return {
		id: params.id,
		movie,
		providers,
		region,
		canonicalUrl: absoluteUrl(`/film/${params.id}/`)
	};
};
