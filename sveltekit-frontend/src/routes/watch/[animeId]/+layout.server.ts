import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, fetch, setHeaders }) => {
	setHeaders({
		'Cache-Control':
			'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600, stale-if-error=86400'
	});

	const anime = await withSeoTimeout(api.getAnime(params.animeId, fetch), null, 2500);
	const metadataId = anime?.idMal || anime?.mal_id || params.animeId;
	const metadataResponse = anime
		? await withSeoTimeout(
			api.getEpisodeMetadata(metadataId, 1, 2000, fetch),
			{ data: { episodes: [] } },
			3500
		)
		: { data: { episodes: [] } };
	const realEpisodes = metadataResponse?.data?.episodes ?? metadataResponse?.episodes ?? [];
	const total = Number(anime?.episodes || 0);
	const count = total > 0 ? Math.min(total, 2000) : anime ? 12 : 0;
	const episodes = realEpisodes.length > 0
		? realEpisodes
		: Array.from({ length: count }, (_, index) => ({
			number: index + 1,
			title: `Episode ${index + 1}`,
			image: '',
			thumbnail: ''
		}));

	return {
		ssrAnime: anime,
		ssrEpisodes: episodes,
		ssrEpisodeMetadataLoaded: realEpisodes.length > 0,
		ssrRecommendations: anime?.recommendations || []
	};
};
