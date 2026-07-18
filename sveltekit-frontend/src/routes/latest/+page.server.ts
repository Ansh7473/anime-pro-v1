import { api } from '$lib/api';
import { absoluteUrl } from '$lib/seo';
import { withSeoTimeout } from '$lib/server/seo-load';

import type { PageServerLoad } from './$types';

const tabs = ['recently-updated', 'subbed-anime', 'dubbed-anime'] as const;
type CatalogTab = (typeof tabs)[number];

const fallback = {
	data: [],
	pagination: { has_next_page: false, current_page: 1, per_page: 24, total: 0, last_page: 1 }
};

export const load: PageServerLoad = ({ fetch, url, setHeaders }) => {
	const requestedTab = url.searchParams.get('tab');
	const tab: CatalogTab = tabs.includes(requestedTab as CatalogTab)
		? (requestedTab as CatalogTab)
		: 'recently-updated';
	const parsedPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
	const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

	const request = tab === 'recently-updated'
		? api.getCurrentSeasonal(page, 24, fetch)
		: tab === 'subbed-anime'
			? api.getTopAnime('TV', page, 24, 'POPULARITY_DESC', fetch)
			: api.getTopAnime('TV', page, 24, 'SCORE_DESC', fetch);

	setHeaders({
		'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	return {
		canonicalUrl: absoluteUrl('/latest/'),
		tab,
		page,
		initial: withSeoTimeout(request, fallback)
			.then((result) => ({
				items: result?.data || [],
				hasNext: result?.pagination?.has_next_page || false,
				lastPage: Math.max(page, Number(result?.pagination?.last_page) || page)
			}))
			.catch(() => ({ items: [], hasNext: false, lastPage: page }))
	};
};