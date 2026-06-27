import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

const fallback = { data: [], pagination: { has_next_page: false } };

export const load: PageServerLoad = ({ fetch }) => {
	// Stream the initial list: shell + skeleton grid paint instantly, data swaps in.
	return {
		canonicalUrl: absoluteUrl('/tv-series/'),
		initial: withSeoTimeout(api.getTopAnime('TV', 1, 20, 'POPULARITY_DESC', fetch), fallback)
			.then((res) => ({ items: res?.data || [], hasNext: res?.pagination?.has_next_page || false }))
			.catch(() => ({ items: [], hasNext: false }))
	};
};
