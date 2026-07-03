import { browser } from '$app/environment';
import { clearAuth } from '$lib/stores/auth';

// Backend pool — two Vercel deployments on separate free-tier accounts.
// Set VITE_BACKEND_URL to override with a single backend (e.g. local dev).
const BACKENDS = (
	import.meta.env.VITE_BACKEND_URL
		? [import.meta.env.VITE_BACKEND_URL]
		: ['https://animeback-d76691b0d2f2.herokuapp.com', 'https://animeback-d76691b0d2f2.herokuapp.com']
).map((u: string) => u.replace(/\/+$/, ''));

console.log("🔌 Loaded Backend URL:", BACKENDS[0]);

// Randomly order the pool so load spreads ~evenly across accounts per session,
// while keeping every backend available for failover.
const POOL = [...BACKENDS].sort(() => Math.random() - 0.5);
export const BACKEND_URL = POOL[0];

// Round-robin cursor so consecutive API calls alternate backends.
let rrCursor = 0;

const BASE_URL = `${BACKEND_URL}/api/v1/anilist`;
const STREAMING_URL = `${BACKEND_URL}/api/v1/streaming`;
const JIKAN_URL = `${BACKEND_URL}/api/v1/jikan`;
const AUTH_URL = `${BACKEND_URL}/api/v1/auth`;
const USER_URL = `${BACKEND_URL}/api/v1/user`;
const GENERAL_PROXY = `${STREAMING_URL}/proxy`;

async function fetchJSON(url: string, options?: RequestInit & { fetch?: typeof fetch }) {
	const fetchFn = options?.fetch || fetch;
	const fetchOptions = { ...options };
	delete fetchOptions.fetch;
	const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };

	let lastError: unknown;
	// Start at the next backend in rotation (per-request distribution),
	// then fall through to the remaining backend(s) for failover.
	const start = rrCursor++ % POOL.length;
	const order = POOL.map((_, i) => POOL[(start + i) % POOL.length]);
	for (const backend of order) {
		// url is built from BACKEND_URL (POOL[0]); swap the host to target/fail over.
		const target = url.replace(BACKEND_URL, backend);
		let res: Response;
		try {
			res = await fetchFn(target, { ...fetchOptions, headers });
		} catch (err) {
			lastError = err; // network/timeout — try the next backend
			continue;
		}
		if (res.ok) return res.json();
		if (res.status === 401 && browser) clearAuth();
		// Client errors (4xx) are deterministic — don't retry other backends.
		if (res.status < 500) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		lastError = new Error(`HTTP ${res.status}: ${res.statusText}`); // 5xx — try next
	}
	throw lastError ?? new Error('All backends failed');
}

/** Helper to create auth headers */
function authHeaders(token: string): HeadersInit {
	return { 'Authorization': `Bearer ${token}` };
}

async function queryAnilist(query: string, variables: Record<string, any> = {}) {
	const res = await fetch('https://graphql.anilist.co', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({ query, variables })
	});
	if (!res.ok) throw new Error('AniList Network Error');
	const json = await res.json();
	if (json.errors) throw new Error(json.errors[0].message);
	return json.data;
}

const mediaFragment = `
  fragment mediaFields on Media {
    id idMal
    title { romaji english native userPreferred }
    synonyms
    coverImage { extraLarge large }
    description format status episodes
    averageScore seasonYear season genres popularity
    studios(isMain: true) { nodes { name } }
    trailer { id site thumbnail }
    nextAiringEpisode { episode airingAt timeUntilAiring }
  }
`;

function transformMedia(media: any) {
	if (!media) return null;

	let bestTitle = "";
	if (typeof media.title === 'string' && media.title) {
		bestTitle = media.title;
	} else {
		const titleRaw = media.title || {};
		bestTitle = titleRaw.english || media.title_english || titleRaw.userPreferred || media.name;
		if (!bestTitle && media.synonyms && media.synonyms.length > 0) {
			bestTitle = media.synonyms[0];
		}
		if (!bestTitle) {
			bestTitle = titleRaw.romaji || titleRaw.native || "Unknown Anime";
		}
	}

	return {
		...media,
		id: media.id || media.mal_id,
		title: bestTitle,
		score: media.score > 10 ? media.score / 10 : media.score,
		rating: media.rating > 10 ? media.rating / 10 : media.rating,
		poster: media.poster || media.image || (media.coverImage?.extraLarge || media.coverImage?.large) || '',
		synopsis: media.synopsis?.replace(/<[^>]*>?/gm, '') || ''
	};
}

function getCurrentSeason() {
	const month = new Date().getMonth() + 1;
	let season: string;
	if (month >= 1 && month <= 3) season = 'WINTER';
	else if (month >= 4 && month <= 6) season = 'SPRING';
	else if (month >= 7 && month <= 9) season = 'SUMMER';
	else season = 'FALL';
	return { season, year: new Date().getFullYear() };
}

// Cache
let homeCache: any = null;
let homeCacheTime = 0;
const CACHE_TTL = 60_000;

export const api = {
	getHome: async (force = false, customFetch?: typeof fetch) => {
		if (homeCache && !force && Date.now() - homeCacheTime < CACHE_TTL) return homeCache;
		const res = await fetchJSON(`${BASE_URL}/home`, { fetch: customFetch });
		homeCache = res?.data || res;
		homeCacheTime = Date.now();
		return homeCache;
	},

	getAnime: async (id: string | number, customFetch?: typeof fetch) => {
		const res = await fetchJSON(`${BASE_URL}/anime/${id}`, { fetch: customFetch });
		return res?.data || res;
	},

	getRelations: async (id: string | number) => {
		const res = await fetchJSON(`${JIKAN_URL}/anime/${id}/relations`);
		return res?.data || [];
	},

	search: async (q: string, page = 1, limit = 20, filters: any = {}) => {
		const params = new URLSearchParams({
			q,
			page: page.toString(),
			limit: limit.toString(),
			sort: filters.sort?.[0] || 'POPULARITY_DESC'
		});
		const res = await fetchJSON(`${BASE_URL}/search?${params.toString()}`);
		return res;
	},

	getTopAnime: async (format = 'TV', page = 1, limit = 20, sort = 'POPULARITY_DESC', customFetch?: typeof fetch) => {
		const params = new URLSearchParams({
			format: format.toUpperCase(),
			page: page.toString(),
			limit: limit.toString(),
			sort: sort
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`, { fetch: customFetch });
	},

	getAnilistSchedule: async (start: number, end: number) => {
		const res = await fetchJSON(`${BASE_URL}/schedule?start=${start}&end=${end}`);
		return res?.data || res;
	},

	getCurrentSeasonal: async (page = 1, limit = 20, customFetch?: typeof fetch) => {
		const params = new URLSearchParams({
			status: 'RELEASING',
			page: page.toString(),
			limit: limit.toString(),
			sort: 'TRENDING_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`, { fetch: customFetch });
	},

	getUpcoming: async (page = 1, limit = 20, customFetch?: typeof fetch) => {
		const params = new URLSearchParams({
			status: 'NOT_YET_RELEASED',
			page: page.toString(),
			limit: limit.toString(),
			sort: 'POPULARITY_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`, { fetch: customFetch });
	},

	getByGenre: async (genre: string, page = 1, limit = 20, customFetch?: typeof fetch) => {
		const params = new URLSearchParams({
			genre,
			page: page.toString(),
			limit: limit.toString(),
			sort: 'POPULARITY_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`, { fetch: customFetch });
	},

	getRecommendations: async (id: string | number) => {
		try {
			const res = await fetchJSON(`${BASE_URL}/recommendations/${id}`);
			return res?.data?.map(transformMedia) || [];
		} catch { return []; }
	},

	getCharacters: async (id: string | number) => {
		try {
			const res = await fetchJSON(`${BASE_URL}/characters/${id}`);
			return res?.data || [];
		} catch { return []; }
	},

	getStaff: async (id: string | number) => {
		try {
			const query = `query($id:Int){Media(idMal:$id,type:ANIME){staff(sort:[RELEVANCE,ID_DESC],page:1,perPage:12){edges{role node{id name{full}image{large}}}}}}`;
			const data = await queryAnilist(query, { id: parseInt(String(id)) });
			return data.Media?.staff?.edges?.map((e: any) => ({ name: e.node.name.full, role: e.role, image: e.node.image.large })) || [];
		} catch { return []; }
	},

	getRandomAnime: async () => {
		const randomPage = Math.floor(Math.random() * 20) + 1;
		const query = `query($p:Int){Page(page:$p,perPage:25){media(type:ANIME,sort:[POPULARITY_DESC]){id idMal}}}`;
		const data = await queryAnilist(query, { p: randomPage });
		const list = data.Page?.media || [];
		const pick = list[Math.floor(Math.random() * list.length)];
		return pick?.idMal || pick?.id;
	},

	getCategory: async (type: string, page = 1, customFetch?: typeof fetch) => {
		switch (type) {
			case 'trending-now': case 'trending': return api.getCurrentSeasonal(page, 20, customFetch);
			case 'seasonal': case 'top-airing': return api.getCurrentSeasonal(page, 20, customFetch);
			case 'upcoming': return api.getUpcoming(page, 20, customFetch);
			case 'popular': case 'most-popular': case 'all-time-popular': return api.getTopAnime('TV', page, 20, 'POPULARITY_DESC', customFetch);
			case 'highest-rated': case 'top-rated': return api.getTopAnime('TV', page, 20, 'SCORE_DESC', customFetch);
			case 'movies': return api.getTopAnime('MOVIE', page, 20, 'POPULARITY_DESC', customFetch);
			case 'action': return api.getByGenre('Action', page, 20, customFetch);
			case 'romance': return api.getByGenre('Romance', page, 20, customFetch);
			case 'comedy': return api.getByGenre('Comedy', page, 20, customFetch);
			case 'adventure': return api.getByGenre('Adventure', page, 20, customFetch);
			case 'fantasy': return api.getByGenre('Fantasy', page, 20, customFetch);
			case 'sci-fi': return api.getByGenre('Sci-Fi', page, 20, customFetch);
			case 'supernatural': return api.getByGenre('Supernatural', page, 20, customFetch);
			case 'drama': return api.getByGenre('Drama', page, 20, customFetch);
			case 'slice-of-life': return api.getByGenre('Slice of Life', page, 20, customFetch);
			case 'mystery': return api.getByGenre('Mystery', page, 20, customFetch);
			case 'horror': return api.getByGenre('Horror', page, 20, customFetch);
			case 'sports': return api.getByGenre('Sports', page, 20, customFetch);
			case 'mecha': return api.getByGenre('Mecha', page, 20, customFetch);
			case 'music': return api.getByGenre('Music', page, 20, customFetch);
			case 'psychological': return api.getByGenre('Psychological', page, 20, customFetch);
			default: return api.getTopAnime('TV', page, 20, 'POPULARITY_DESC', customFetch);
		}
	},

	getAiringSchedule: async (page = 1, limit = 20) => {
		const params = new URLSearchParams({
			status: 'RELEASING',
			page: page.toString(),
			limit: limit.toString(),
			sort: 'POPULARITY_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`);
	},

	getSchedule: async (day?: string) => {
		const url = day ? `${JIKAN_URL}/schedule?filter=${day}` : `${JIKAN_URL}/schedule`;
		const res = await fetchJSON(url);
		return res;
	},

	// Streaming
	getEpisodeMetadata: (animeId: string | number, page = 1, perPage = 50) =>
		fetchJSON(`${STREAMING_URL}/episode-metadata?animeId=${animeId}&page=${page}&perPage=${perPage}`),

	getAnimelokSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/animelok?animeId=${animeId}&ep=${ep}`),

	getNineAnimeSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/nineanime?animeId=${animeId}&ep=${ep}`),

	getDesiDubSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/desidub?animeId=${animeId}&ep=${ep}`),

	getAHDSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/ahd?animeId=${animeId}&ep=${ep}`),

	getToonstreamSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/toonstream?animeId=${animeId}&ep=${ep}`),

	getWatchAnimeWorldSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/watchanimeworld?animeId=${animeId}&ep=${ep}`),

	getAniwavesSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/aniwaves?animeId=${animeId}&ep=${ep}`),

	getAnimenSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/animen?animeId=${animeId}&ep=${ep}`),

	getAnimixStreamSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/animixstream?animeId=${animeId}&ep=${ep}`),

	getAnimePaheSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources/animepahe?animeId=${animeId}&ep=${ep}`),

	getAggregateSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources?animeId=${animeId}&ep=${ep}`),

	getAnimelokSlug: (animeId: string) =>
		fetchJSON(`${STREAMING_URL}/animelok-slug?animeId=${animeId}`),

	// Jikan
	getEpisodes: (animeId: string | number, page = 1) =>
		fetchJSON(`${JIKAN_URL}/anime/${animeId}/episodes?page=${page}`),

	// ==========================================
	// Auth & User API
	// ==========================================

	register: (data: any) => fetchJSON(`${AUTH_URL}/register`, { method: 'POST', body: JSON.stringify(data) }),
	login: (data: any) => fetchJSON(`${AUTH_URL}/login`, { method: 'POST', body: JSON.stringify(data) }),

	getCurrentUser: (token: string) =>
		fetchJSON(`${USER_URL}/me`, { headers: authHeaders(token) }),

	getHistory: async (token: string, profileId?: number | string) => {
		const res = await fetchJSON(`${USER_URL}/history${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		});
		return res || [];
	},

	updateHistory: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/history`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	deleteHistory: (token: string, animeId: string) =>
		fetchJSON(`${USER_URL}/history/${animeId}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),

	getWatchlist: async (token: string) => {
		const res = await fetchJSON(`${USER_URL}/watchlist`, {
			headers: authHeaders(token)
		});
		return res || [];
	},

	addToWatchlist: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/watchlist`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	removeFromWatchlist: (token: string, animeId: string, profileId?: number | string) =>
		fetchJSON(`${USER_URL}/watchlist/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),

	getWatchlistStatus: (token: string, animeId: string, profileId?: number | string) =>
		fetchJSON(`${USER_URL}/watchlist/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		}),

	// 10. Favorites
	getFavorites: async (token: string, profileId?: number | string) => {
		const res = await fetchJSON(`${USER_URL}/favorites${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		});
		return res || [];
	},
	addToFavorites: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/favorites`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),
	removeFromFavorites: (token: string, animeId: string, profileId?: number | string) =>
		fetchJSON(`${USER_URL}/favorites/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),
	getFavoriteStatus: (token: string, animeId: string, profileId?: number | string) =>
		fetchJSON(`${USER_URL}/favorites/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		}),

	// 11. Profile Management
	createProfile: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/profiles`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),
	updateProfile: (token: string, id: number | string, data: any) =>
		fetchJSON(`${USER_URL}/profiles/${id}`, {
			method: 'PUT',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),
	deleteProfile: (token: string, id: number | string) =>
		fetchJSON(`${USER_URL}/profiles/${id}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),

	// 12. Security
	changePassword: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/change-password`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	// 10. Social & Community
	toggleReaction: (token: string, data: { animeId: string; episode: number; type: string; profileId?: number | string }) =>
		fetchJSON(`${BACKEND_URL}/api/v1/reactions`, {
			method: 'POST',
			headers: token ? authHeaders(token) : {},
			body: JSON.stringify(data)
		}),

	getReactions: (animeId: string, episode: number, token?: string, profileId?: number | string) =>
		fetchJSON(`${BACKEND_URL}/api/v1/reactions/${animeId}/${episode}${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: token ? authHeaders(token) : {}
		}),

	postComment: (token: string, data: { animeId: string; episode: number; content: string; parentId?: string | number; profileId?: number | string }) =>
		fetchJSON(`${USER_URL}/comments`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	getComments: (animeId: string, episode: number) =>
		fetchJSON(`${BACKEND_URL}/api/v1/comments/${animeId}/${episode}`),

	deleteComment: (token: string, commentId: number | string) =>
		fetchJSON(`${USER_URL}/comments/${commentId}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),

	getUserStats: (token: string) =>
		fetchJSON(`${USER_URL}/stats`, { headers: authHeaders(token) }),

	getAIRecommendations: (token: string) =>
		fetchJSON(`${USER_URL}/recommendations`, { headers: authHeaders(token) }),

	getLatestReleases: () => fetchJSON(`${BACKEND_URL}/api/v1/releases/latest`)
};

export function getProxiedUrl(url: string, referer = ''): string {
	// Disable automatic proxy wrapping for stream URLs as requested.
	// The player will handle specific segment proxying via HLS.js xhrSetup if necessary.
	return url;
}

export function getProxiedImage(url: string, fallback = ''): string {
	if (!url) return fallback;
	// Use our smart proxy for external images to handle CORS and self-healing
	if (url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
		return `${GENERAL_PROXY}?url=${encodeURIComponent(url)}`;
	}
	return url || fallback;
}
