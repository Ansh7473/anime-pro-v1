import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

const fallback = { data: [], pagination: { has_next_page: false } };

export const load: PageServerLoad = ({ fetch, setHeaders }) => {
	// Movie listings rarely change — cache for 30 min at the edge.
	setHeaders({
		'Cache-Control': 'public, max-age=120, s-maxage=1800, stale-while-revalidate=3600, stale-if-error=86400'
	});
	// Stream the initial list: shell + skeleton grid paint instantly, data swaps in.
	return {
		canonicalUrl: absoluteUrl('/movies/'),
		initial: withSeoTimeout(api.getTopAnime('MOVIE', 1, 20, 'POPULARITY_DESC', fetch), fallback)
			.then((res) => ({ items: res?.data || [], hasNext: res?.pagination?.has_next_page || false }))
			.catch(() => ({ items: [], hasNext: false }))
	};
};
