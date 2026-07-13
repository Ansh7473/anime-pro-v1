import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

/**
 * Watch-page SSR load.
 *
 * CRITICAL: client-side navigation waits for this function before changing the
 * URL / painting the next page. If we await unbounded backend calls here, a
 * click on "Watch Episode 1" freezes the current page for 30–60s.
 *
 * Cap each subrequest at 2.5s. Empty fallbacks are fine — the client already
 * re-fetches anime/episodes when ssrAnime is null or ssrEpisodes is empty, and
 * streaming sources are always client-side.
 */
export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
	const animeId = params.animeId;

	setHeaders({
		'Cache-Control':
			'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	const emptyEpisodes = { data: { episodes: [] as any[] } };

	const [anime, metaRes, recommendations] = await Promise.allSettled([
		withSeoTimeout(api.getAnime(animeId, fetch), null, 2500),
		withSeoTimeout(api.getEpisodeMetadata(animeId, 1, 2000, fetch), emptyEpisodes, 2500),
		withSeoTimeout(api.getRecommendations(animeId, fetch), [], 2500)
	]);

	return {
		animeId: params.animeId,
		ep: params.ep,
		ssrAnime: anime.status === 'fulfilled' ? anime.value : null,
		ssrEpisodes:
			metaRes.status === 'fulfilled' ? metaRes.value?.data?.episodes || [] : [],
		ssrRecommendations:
			recommendations.status === 'fulfilled' ? recommendations.value : []
	};
};
