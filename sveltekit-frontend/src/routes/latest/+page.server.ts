import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const latest = await withSeoTimeout(api.getCurrentSeasonal(1, 24, fetch), {
		data: [],
		pagination: { has_next_page: false }
	});

	return {
		initialItems: latest?.data || [],
		hasNext: latest?.pagination?.has_next_page || false,
		canonicalUrl: absoluteUrl('/latest/')
	};
};
