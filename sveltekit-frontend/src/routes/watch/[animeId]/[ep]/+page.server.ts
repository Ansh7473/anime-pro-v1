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

	const anime = await withSeoTimeout(api.getAnime(animeId, fetch), null, 2500);

	let episodes: any[] = [];
	if (anime) {
		// SSR gives a fast first paint; the client resolves the accurate aired
		// count from AniList on mount (handles 1000+ series like One Piece).
		const n = Number(anime.episodes || 0);
		const count = n > 0 ? Math.min(n, 2000) : 12;
		episodes = Array.from({ length: count }, (_, i) => ({
			number: i + 1,
			title: `Episode ${i + 1}`,
			image: '',
			thumbnail: ''
		}));
	}

	return {
		animeId: params.animeId,
		ep: params.ep,
		ssrAnime: anime,
		ssrEpisodes: episodes,
		ssrRecommendations: anime?.recommendations || []
	};
};
