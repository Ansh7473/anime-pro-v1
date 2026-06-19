import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

export const load = async () => {
	const series = await withSeoTimeout(api.getTopAnime('TV', 1, 20, 'POPULARITY_DESC'), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: series?.data || [],
		hasNext: series?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/tv-series/')
	};
};
