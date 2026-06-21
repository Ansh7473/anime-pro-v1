import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const movies = await withSeoTimeout(api.getTopAnime('MOVIE', 1, 20, 'POPULARITY_DESC', fetch), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: movies?.data || [],
		hasNext: movies?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/movies/')
	};
};
