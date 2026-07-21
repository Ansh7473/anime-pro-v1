import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { unwrapTMDB } from '$lib/tmdb';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch }) => {
	if (!/^[1-9]\d*$/.test(params.id)) error(400, 'Invalid TMDB movie ID');

	let movie: any = null;
	try {
		movie = unwrapTMDB(await api.getTMDBMovie(params.id, fetch));
	} catch (cause) {
		console.warn(`Could not load player metadata for TMDB movie ${params.id}:`, cause);
	}

	return {
		id: params.id,
		movie,
		canonicalUrl: absoluteUrl(`/watch/movie/${params.id}/`)
	};
};
