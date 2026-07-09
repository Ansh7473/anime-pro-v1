import { api } from '$lib/api';
import type { PageServerLoad } from './$types';

const fallback = { data: { episodes: [] } };

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
	const animeId = params.animeId;

	// SSR-load the three cacheable data sources so Cloudflare can cache the
	// rendered page + subrequest responses at the edge.  Streaming source
	// URLs are NOT loaded here — they're live/tokenized and must stay client-side.
	const [anime, metaRes, recommendations] = await Promise.allSettled([
		api.getAnime(animeId, fetch),
		api.getEpisodeMetadata(animeId, 1, 2000, fetch),
		api.getRecommendations(animeId, fetch)
	]);

	// Cache the watch page HTML at the edge for 10 min (browser 2 min).
	// Anime metadata + episode lists change rarely; SWR keeps it fresh.
	setHeaders({
		'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	return {
		animeId: params.animeId,
		ep: params.ep,
		ssrAnime: anime.status === 'fulfilled' ? anime.value : null,
		ssrEpisodes: metaRes.status === 'fulfilled' ? (metaRes.value?.data?.episodes || []) : [],
		ssrRecommendations: recommendations.status === 'fulfilled' ? recommendations.value : []
	};
};
