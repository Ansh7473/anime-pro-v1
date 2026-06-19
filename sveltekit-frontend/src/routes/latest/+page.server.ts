import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

export const load = async () => {
	const latest = await withSeoTimeout(api.getCurrentSeasonal(1, 24), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: latest?.data || [],
		hasNext: latest?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/latest/')
	};
};
