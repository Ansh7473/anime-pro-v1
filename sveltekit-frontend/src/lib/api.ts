const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const BASE_URL = `${BACKEND_URL}/api/v1/anilist`;
const STREAMING_URL = `${BACKEND_URL}/api/v1/streaming`;
const JIKAN_URL = `${BACKEND_URL}/api/v1/jikan`;
const AUTH_URL = `${BACKEND_URL}/api/v1/auth`;
const USER_URL = `${BACKEND_URL}/api/v1/user`;
const GENERAL_PROXY = `${STREAMING_URL}/proxy`;

async function fetchJSON(url: string, options?: RequestInit) {
	const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
	return res.json();
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
    title { romaji english native }
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
	return {
		...media,
		id: media.id || media.mal_id,
		score: media.score > 10 ? media.score / 10 : media.score,
		rating: media.rating > 10 ? media.rating / 10 : media.rating,
		poster: media.poster || media.image || '',
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
	getHome: async (force = false) => {
		if (homeCache && !force && Date.now() - homeCacheTime < CACHE_TTL) return homeCache;
		const res = await fetchJSON(`${BASE_URL}/home`);
		homeCache = res?.data || res;
		homeCacheTime = Date.now();
		return homeCache;
	},

	getAnime: async (id: string | number) => {
		const res = await fetchJSON(`${BASE_URL}/anime/${id}`);
		return res?.data || res;
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

	getTopAnime: async (format = 'TV', page = 1, limit = 20, sort = 'POPULARITY_DESC') => {
		const params = new URLSearchParams({
			format: format.toUpperCase(),
			page: page.toString(),
			limit: limit.toString(),
			sort: sort
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`);
	},

	getAnilistSchedule: async (start: number, end: number) => {
		const res = await fetchJSON(`${BASE_URL}/schedule?start=${start}&end=${end}`);
		return res?.data || res;
	},

	getCurrentSeasonal: async (page = 1, limit = 20) => {
		const params = new URLSearchParams({
			status: 'RELEASING',
			page: page.toString(),
			limit: limit.toString(),
			sort: 'TRENDING_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`);
	},

	getUpcoming: async (page = 1, limit = 20) => {
		const params = new URLSearchParams({
			status: 'NOT_YET_RELEASED',
			page: page.toString(),
			limit: limit.toString(),
			sort: 'POPULARITY_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`);
	},

	getByGenre: async (genre: string, page = 1, limit = 20) => {
		const params = new URLSearchParams({
			genre,
			page: page.toString(),
			limit: limit.toString(),
			sort: 'POPULARITY_DESC'
		});
		return fetchJSON(`${BASE_URL}/search?${params.toString()}`);
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
			const data = await queryAnilist(query, { id: parseInt(id.toString()) });
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

	getCategory: async (type: string, page = 1) => {
		switch (type) {
			case 'trending-now': case 'trending': return api.getCurrentSeasonal(page);
			case 'seasonal': case 'top-airing': return api.getCurrentSeasonal(page);
			case 'upcoming': return api.getUpcoming(page);
			case 'popular': case 'most-popular': case 'all-time-popular': return api.getTopAnime('TV', page);
			case 'movies': return api.getTopAnime('MOVIE', page);
			case 'action': return api.getByGenre('Action', page);
			case 'romance': return api.getByGenre('Romance', page);
			default: return api.getTopAnime('TV', page);
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

	getAggregateSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources?animeId=${animeId}&ep=${ep}`),

	getAnimelokSlug: (animeId: string) =>
		fetchJSON(`${STREAMING_URL}/animelok-slug?animeId=${animeId}`),

	// Jikan
	getRelations: (animeId: string | number) =>
		fetchJSON(`${JIKAN_URL}/anime/${animeId}/relations`),

	getEpisodes: (animeId: string | number, page = 1) =>
		fetchJSON(`${JIKAN_URL}/anime/${animeId}/episodes?page=${page}`),

	// ==========================================
	// Auth & User API
	// ==========================================

	register: (data: any) => fetchJSON(`${AUTH_URL}/register`, { method: 'POST', body: JSON.stringify(data) }),
	login: (data: any) => fetchJSON(`${AUTH_URL}/login`, { method: 'POST', body: JSON.stringify(data) }),

	getCurrentUser: (token: string) =>
		fetchJSON(`${USER_URL}/me`, { headers: authHeaders(token) }),

	getHistory: (token: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/history${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		}),

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

	getWatchlist: (token: string) =>
		fetchJSON(`${USER_URL}/watchlist`, {
			headers: authHeaders(token)
		}),

	addToWatchlist: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/watchlist`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	removeFromWatchlist: (token: string, animeId: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/watchlist/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),

	getWatchlistStatus: (token: string, animeId: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/watchlist/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		}),

	// 10. Favorites
	getFavorites: (token: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/favorites${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: authHeaders(token)
		}),
	addToFavorites: (token: string, data: any) =>
		fetchJSON(`${USER_URL}/favorites`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),
	removeFromFavorites: (token: string, animeId: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/favorites/${animeId}${profileId ? `?profileId=${profileId}` : ''}`, {
			method: 'DELETE',
			headers: authHeaders(token)
		}),
	getFavoriteStatus: (token: string, animeId: string, profileId?: number) =>
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
	toggleReaction: (token: string, data: { animeId: string; episode: number; type: string; profileId?: number }) =>
		fetchJSON(`${USER_URL}/reactions`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	getReactions: (animeId: string, episode: number, token?: string, profileId?: number) =>
		fetchJSON(`${USER_URL}/reactions/${animeId}/${episode}${profileId ? `?profileId=${profileId}` : ''}`, {
			headers: token ? authHeaders(token) : {}
		}),

	postComment: (token: string, data: { animeId: string; episode: number; content: string; parentId?: number; profileId?: number }) =>
		fetchJSON(`${USER_URL}/comments`, {
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(data)
		}),

	getComments: (animeId: string, episode: number) =>
		fetchJSON(`${USER_URL}/comments/${animeId}/${episode}`),

	deleteComment: (token: string, commentId: number) =>
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
