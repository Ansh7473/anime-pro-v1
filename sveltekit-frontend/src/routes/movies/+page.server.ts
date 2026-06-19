import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

export const load = async () => {
	const movies = await withSeoTimeout(api.getTopAnime('MOVIE', 1, 20, 'POPULARITY_DESC'), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: movies?.data || [],
		hasNext: movies?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/movies/')
	};
};
