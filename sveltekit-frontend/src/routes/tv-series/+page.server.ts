import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const series = await withSeoTimeout(api.getTopAnime('TV', 1, 20, 'POPULARITY_DESC', fetch), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: series?.data || [],
		hasNext: series?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/tv-series/')
	};
};
