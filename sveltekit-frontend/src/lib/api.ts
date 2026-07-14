import { browser } from '$app/environment';
import { clearAuth } from '$lib/stores/auth';
import { expandAlias } from '$lib/searchEngine';


// Set VITE_BACKEND_URL to override with a single backend (e.g. local dev).
const BACKENDS = (
	import.meta.env.VITE_BACKEND_URL
		? [import.meta.env.VITE_BACKEND_URL]
		: ['https://api.watchanimez.me', 'https://api.watchanimez.me']
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

const AUTH_URL = `${BACKEND_URL}/api/v1/auth`;
const USER_URL = `${BACKEND_URL}/api/v1/user`;

// ─── fetchJSON response cache (browser-only) ─────────────────────────────────
const _fetchCache = new Map<string, { data: any; ts: number }>();
const FETCH_CACHE_TTL = 5 * 60_000; // 5 minutes

function fetchCacheGet(url: string): any | null {
	const entry = _fetchCache.get(url);
	if (!entry) return null;
	if (Date.now() - entry.ts > FETCH_CACHE_TTL) return null; // stale but keep for fallback
	return entry.data;
}

function fetchCacheGetStale(url: string): any | null {
	return _fetchCache.get(url)?.data ?? null;
}

function fetchCacheSet(url: string, data: any): void {
	if (_fetchCache.size > 200) {
		const first = _fetchCache.keys().next().value;
		if (first) _fetchCache.delete(first);
	}
	_fetchCache.set(url, { data, ts: Date.now() });
}

async function fetchJSON(url: string, options?: RequestInit & { fetch?: typeof fetch }) {
	const fetchFn = options?.fetch || fetch;
	const fetchOptions = { ...options };
	delete fetchOptions.fetch;
	const headers = { 'Content-Type': 'application/json', ...fetchOptions.headers };
	const isGet = !fetchOptions.method || fetchOptions.method === 'GET';

	// Serve from browser cache for GET requests
	if (browser && isGet) {
		const cached = fetchCacheGet(url);
		if (cached) return cached;
	}

	let lastError: unknown;
	// Start at the next backend in rotation (per-request distribution),
	// then fall through to the remaining backend(s) for failover.
	const start = rrCursor++ % POOL.length;
	const order = POOL.map((_, i) => POOL[(start + i) % POOL.length]);
	for (const backend of order) {
		// url is built from BACKEND_URL (POOL[0]); swap the host to target/fail over.
		const target = url.replace(BACKEND_URL, backend);
		let res: Response;
		const fetchOpts: RequestInit = { ...fetchOptions, headers };
		// On Cloudflare SSR, cache non-auth GET subrequests at the edge
		// so SSR loads don't hit origin on every request.
		if (!browser && isGet && !(headers as Record<string, string>).Authorization) {
			(fetchOpts as any).cf = { cacheEverything: true };
		}
		try {
			res = await fetchFn(target, fetchOpts);
		} catch (err) {
			// Single retry on network errors (timeout, DNS, etc.) before failing over
			if (browser && (err instanceof TypeError || (err as any)?.name === 'AbortError')) {
				await new Promise(r => setTimeout(r, 200));
				try {
					res = await fetchFn(target, fetchOpts);
				} catch (retryErr) {
					lastError = retryErr;
					continue;
				}
			} else {
				lastError = err;
				continue;
			}
		}
		if (res.ok) {
			const data = await res.json();
			if (browser && isGet) fetchCacheSet(url, data);
			return data;
		}
		if (res.status === 401 && browser) clearAuth();
		// Client errors (4xx) are deterministic — don't retry other backends.
		if (res.status < 500) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`);
		}
		lastError = new Error(`HTTP ${res.status}: ${res.statusText}`); // 5xx — try next
	}

	// All backends failed — try stale cache before throwing
	if (browser && isGet) {
		const stale = fetchCacheGetStale(url);
		if (stale) {
			console.warn('All backends failed, serving stale cached response for:', url);
			return stale;
		}
	}

	throw lastError ?? new Error('All backends failed');
}

/** Helper to create auth headers */
function authHeaders(token: string): HeadersInit {
	return { 'Authorization': `Bearer ${token}` };
}

// ─── Client-side AniList rate limiter + cache (miruro-style) ─────────────────
// AniList allows 90 req/min per IP. We conservatively budget 30 req/min on
// the client and cache responses for 10 minutes so pagination/back-navigation
// never re-fetches identical data.

const _aniCache = new Map<string, { data: any; ts: number }>();
const ANI_CACHE_TTL = 10 * 60 * 1000;

function aniCacheKey(query: string, variables: Record<string, any>): string {
	return JSON.stringify({ q: query.replace(/\s+/g, ' ').trim(), v: variables });
}

function aniCacheGet(key: string): any | null {
	const entry = _aniCache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.ts > ANI_CACHE_TTL) {
		_aniCache.delete(key);
		return null;
	}
	return entry.data;
}

function aniCacheSet(key: string, data: any): void {
	if (_aniCache.size > 300) {
		const first = _aniCache.keys().next().value;
		if (first) _aniCache.delete(first);
	}
	_aniCache.set(key, { data, ts: Date.now() });
}

// Token-bucket: max 30 tokens, refills at 30/min (0.5/sec)
let _aniTokens = 30;
let _aniLastRefill = Date.now();
const ANI_TOKEN_MAX = 30;
const ANI_REFILL_RATE = 30 / 60_000; // tokens per ms

function aniRefillTokens() {
	const now = Date.now();
	const elapsed = now - _aniLastRefill;
	_aniTokens = Math.min(ANI_TOKEN_MAX, _aniTokens + elapsed * ANI_REFILL_RATE);
	_aniLastRefill = now;
}

function aniWaitForToken(): Promise<void> {
	return new Promise((resolve) => {
		const tryAcquire = () => {
			aniRefillTokens();
			if (_aniTokens >= 1) {
				_aniTokens--;
				resolve();
			} else {
				setTimeout(tryAcquire, 1000);
			}
		};
		tryAcquire();
	});
}

	async function queryAnilist(query: string, variables: Record<string, any> = {}, customFetch?: typeof fetch) {
		const key = aniCacheKey(query, variables);
		const cached = aniCacheGet(key);
		if (cached) return cached;
	
		await aniWaitForToken();
	
		const fetchFn = customFetch || fetch;
		let data: any = null;
		
		const isLocalhost = browser && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
		
		if (isLocalhost) {
			// Query AniList directly on localhost to avoid hitting missing dev backend proxy
			const res = await fetchFn('https://graphql.anilist.co', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ query, variables })
			});
			if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
			const json = await res.json();
			if (json.errors) throw new Error(json.errors[0].message);
			data = json.data;
		} else {
			try {
				const res = await fetchFn('/api/anilist', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
					body: JSON.stringify({ query, variables })
				});
				if (!res.ok) throw new Error(`AniList edge HTTP ${res.status}`);
				data = await res.json();
				if (data?.errors) throw new Error(data.errors[0]?.message || 'AniList GraphQL error');
			} catch (edgeErr) {
				console.warn('AniList edge route failed, falling back to direct GraphQL:', edgeErr);
				const res = await fetchFn('https://graphql.anilist.co', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
					body: JSON.stringify({ query, variables })
				});
				if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
				const json = await res.json();
				if (json.errors) throw new Error(json.errors[0].message);
				data = json.data;
			}
		}
	
		aniCacheSet(key, data);
		return data;
	}

const mediaFieldsInline = `
    id idMal
    title { romaji english native userPreferred }
    synonyms
    coverImage { extraLarge large }
    description format status episodes
    averageScore seasonYear season genres popularity
    studios(isMain: true) { nodes { name } }
    trailer { id site thumbnail }
    nextAiringEpisode { episode airingAt timeUntilAiring }
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

	let formattedCharacters = [];
	if (media.characters?.edges) {
		formattedCharacters = media.characters.edges.map((edge: any) => ({
			role: edge.role,
			character: {
				id: edge.node?.id,
				name: edge.node?.name?.full || edge.node?.name?.native || 'Unknown',
				native: edge.node?.name?.native || '',
				images: {
					jpg: {
						image_url: edge.node?.image?.large || edge.node?.image?.medium || ''
					}
				}
			},
			voiceActors: edge.voiceActors?.map((va: any) => ({
				id: va.id,
				name: va.name?.full || va.name?.native,
				image: va.image?.large || va.image?.medium
			})) || []
		}));
	}

	let formattedRelations = [];
	if (media.relations?.edges) {
		formattedRelations = media.relations.edges
			.filter((edge: any) => edge?.node)
			.map((edge: any) => ({
				relation: edge.relationType,
				entry: transformMedia(edge.node)
			}));
	}

	let formattedRecommendations = [];
	if (media.recommendations?.nodes) {
		formattedRecommendations = media.recommendations.nodes
			.filter((node: any) => node?.mediaRecommendation)
			.map((node: any) => transformMedia(node.mediaRecommendation));
	}

	let formattedStudios = [];
	if (media.studios?.nodes) {
		formattedStudios = media.studios.nodes.map((node: any) => node?.name).filter(Boolean);
	}

	return {
		...media,
		id: media.id || media.mal_id,
		title: bestTitle,
		title_english: media.title?.english || media.title_english || '',
		title_japanese: media.title?.native || media.title_native || '',
		title_romaji: media.title?.romaji || media.title_romaji || '',
		score: media.score > 10 ? media.score / 10 : media.score,
		rating: media.rating > 10 ? media.rating / 10 : media.rating,
		poster: media.poster || media.image || (media.coverImage?.extraLarge || media.coverImage?.large) || '',
		synopsis: media.synopsis?.replace(/<[^>]*>?/gm, '') || '',
		characters: formattedCharacters.length ? formattedCharacters : (media.characters || []),
		relations: formattedRelations.length ? formattedRelations : (media.relations || []),
		recommendations: formattedRecommendations.length ? formattedRecommendations : (media.recommendations || []),
		studios: formattedStudios.length ? formattedStudios : (media.studios || [])
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

// ─── AniList episode list ────────────────────────────────────────────────────
// Builds an episode list from AniList: episode count drives how many rows to
// show, and streamingEpisodes supplies titles/thumbnails where available.
// Works during SSR (customFetch → AniList directly) and in the browser
// (queryAnilist, which is rate-limited + cached).
const _episodesCache = new Map<string, { data: any; ts: number }>();
const EPISODES_CACHE_TTL = 30 * 60 * 1000; // 30 min — episode lists change rarely

async function getEpisodesFromAnilist(
	animeId: string | number,
	customFetch?: typeof fetch
): Promise<{ data: { episodes: any[] } } | null> {
	const cacheKey = String(animeId);
	const cached = _episodesCache.get(cacheKey);
	if (cached && Date.now() - cached.ts < EPISODES_CACHE_TTL) return cached.data;

	const numId = parseInt(String(animeId), 10);
	if (isNaN(numId)) return null;

	const epFields = `id idMal episodes nextAiringEpisode { episode }`;

	// The incoming id may be an AniList id OR a MAL id, and we can't tell which.
	// We must NOT alias both lookups in one query: if one id 404s, AniList aborts
	// the WHOLE query and returns null for both. So try each as its own query.
	const runQuery = async (query: string): Promise<any> => {
		const data = await queryAnilist(query, { id: numId }, customFetch);
		return data?.Media ?? null;
	};

	let media: any = null;
	try {
		media = await runQuery(`query($id: Int) { Media(idMal: $id, type: ANIME) { ${epFields} } }`);
	} catch { /* try AniList id next */ }
	if (!media) {
		try {
			media = await runQuery(`query($id: Int) { Media(id: $id, type: ANIME) { ${epFields} } }`);
		} catch { /* fall through */ }
	}

	if (!media) return null;

	// Prefer the aired episode count; fall back to the total episode count.
	// (streamingEpisodes is unreliable — it's reverse-ordered and can span
	//  multiple seasons — so we don't use it for counting or titles.)
	const airedCount = media.nextAiringEpisode?.episode
		? media.nextAiringEpisode.episode - 1
		: 0;
	const total = airedCount > 0 ? airedCount : (media.episodes || 0);
	if (total <= 0) return null;

	const episodes = Array.from({ length: total }, (_, i) => ({
		number: i + 1,
		title: `Episode ${i + 1}`,
		image: '',
		thumbnail: ''
	}));

	const result = { data: { episodes } };
	_episodesCache.set(cacheKey, { data: result, ts: Date.now() });
	return result;
}

// Search Cache
const searchCache = new Map<string, { data: any; time: number }>();
const SEARCH_CACHE_TTL = 300_000; // 5 minutes

export const api = {
	getHomeBundle: async (customFetch?: typeof fetch, force = false) => {
		if (homeCache && !force && Date.now() - homeCacheTime < CACHE_TTL) return homeCache;

		const query = `
			query HomeDashboard($page: Int, $perPage: Int) {
				trending: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, sort: TRENDING_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
				popular: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, sort: POPULARITY_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
				topRated: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, sort: SCORE_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
				romance: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, genre: "Romance", sort: POPULARITY_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
				movies: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
				seasonal: Page(page: $page, perPage: $perPage) {
					pageInfo { currentPage hasNextPage perPage }
					media(type: ANIME, status: RELEASING, sort: TRENDING_DESC) { ${mediaFieldsInline} bannerImage duration }
				}
			}`;

		try {
			const data = await queryAnilist(query, { page: 1, perPage: 20 }, customFetch);
			homeCache = {
				trending: data?.trending?.media?.map(transformMedia) || [],
				popular: data?.popular?.media?.map(transformMedia) || [],
				topRated: data?.topRated?.media?.map(transformMedia) || [],
				romance: data?.romance?.media?.map(transformMedia) || [],
				movies: data?.movies?.media?.map(transformMedia) || [],
				seasonal: data?.seasonal?.media?.map(transformMedia) || [],
				pagination: {
					trending: data?.trending?.pageInfo,
					popular: data?.popular?.pageInfo,
					topRated: data?.topRated?.pageInfo,
					romance: data?.romance?.pageInfo,
					movies: data?.movies?.pageInfo,
					seasonal: data?.seasonal?.pageInfo
				}
			};
			homeCacheTime = Date.now();
			return homeCache;
		} catch (err) {
			console.warn('AniList home bundle failed, falling back to backend home:', err);
			const res = await fetchJSON(`${BASE_URL}/home`, { fetch: customFetch });
			homeCache = res?.data || res;
			homeCacheTime = Date.now();
			return homeCache;
		}
	},

	getHome: async (force = false, customFetch?: typeof fetch) => {
		return api.getHomeBundle(customFetch, force);
	},

	getAnime: async (id: string | number, customFetch?: typeof fetch) => {
		try {
			const numId = parseInt(String(id), 10);
			const detailFields = `
				id idMal
				title { romaji english native userPreferred }
				synonyms
				coverImage { extraLarge large }
				bannerImage
				description format status episodes duration
				averageScore seasonYear season genres popularity
				studios(isMain: true) { nodes { name } }
				trailer { id site thumbnail }
				nextAiringEpisode { episode airingAt timeUntilAiring }
				relations {
					edges {
						relationType(version: 2)
						node {
							id idMal
							title { romaji english native userPreferred }
							coverImage { extraLarge large }
							format status episodes averageScore seasonYear
						}
					}
				}
				recommendations(page: 1, perPage: 12, sort: [RATING_DESC, ID_DESC]) {
					nodes {
						mediaRecommendation {
							id idMal
							title { romaji english native userPreferred }
							coverImage { extraLarge large }
							format status episodes averageScore seasonYear
						}
					}
				}
				characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 24) {
					edges {
						role
						node {
							id
							name { full native }
							image { large medium }
						}
						voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
							id
							name { full native }
							image { large medium }
						}
					}
				}
			`;

			const runQuery = async (query: string, vars: Record<string, any>) => {
				const data = await queryAnilist(query, vars, customFetch);
				return data?.Media ?? null;
			};

			const baseQuery = `Media(type: ANIME) { ${detailFields} }`;
			const asIntQuery = `query($id: Int) { ${baseQuery.replace('Media(', 'Media(id: $id, ')} }`;
			const asMalQuery = `query($id: Int) { ${baseQuery.replace('Media(', 'Media(idMal: $id, ')} }`;

			if (!isNaN(numId)) {
				const byAnilist = await runQuery(asIntQuery, { id: numId });
				if (byAnilist && byAnilist.id) return transformMedia(byAnilist);
				// Try MAL id only if the integer id didn't resolve.
				const byMal = await runQuery(asMalQuery, { id: numId });
				if (byMal && byMal.id) return transformMedia(byMal);
			} else {
				const byMal = await runQuery(asMalQuery, { id: parseInt(String(id), 10) || 0 });
				if (byMal && byMal.id) return transformMedia(byMal);
			}
		} catch (err) {
			console.warn("Direct getAnime failed, falling back to backend:", err);
		}
		const res = await fetchJSON(`${BASE_URL}/anime/${id}`, { fetch: customFetch });
		return res?.data || res;
	},

	getRelations: async (id: string | number, customFetch?: typeof fetch) => {
		const numId = parseInt(String(id), 10);
		if (isNaN(numId)) return [];

		try {
			const query = `query($id: Int) {
				Media(id: $id, type: ANIME) {
					relations {
						edges {
							relationType(version: 2)
							node { ${mediaFieldsInline} }
						}
					}
				}
			}`;
			const data = await queryAnilist(query, { id: numId }, customFetch);
			return (data?.Media?.relations?.edges || [])
				.filter((edge: any) => edge?.node)
				.map((edge: any) => ({
					relation: edge.relationType,
					entry: transformMedia(edge.node)
				}));
		} catch (err) {
			console.warn('AniList relations failed:', err);
			return [];
		}
	},

	search: async (q: string, page = 1, limit = 20, filters: any = {}, customFetch?: typeof fetch) => {
		// Expand abbreviations ("aot" → "attack on titan") before hitting any API
		const expanded = expandAlias(q);
		const cacheKey = `${q.trim().toLowerCase()}:${page}:${limit}:${filters.sort?.[0] || filters.sort || ''}:${filters.format || ''}:${filters.status || ''}:${filters.genre || ''}`;
		const cached = searchCache.get(cacheKey);
		if (cached && Date.now() - cached.time < SEARCH_CACHE_TTL) {
			return cached.data;
		}

		// Official AniList pagination pattern: one Page(media) field per paginated request.
		try {
			const searchQuery = `
				query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort], $format: MediaFormat, $status: MediaStatus, $genre: String) {
					Page(page: $page, perPage: $perPage) {
						pageInfo { currentPage hasNextPage perPage }
						media(search: $search, type: ANIME, sort: $sort, format: $format, status: $status, genre: $genre) {
							${mediaFieldsInline}
							bannerImage duration
						}
					}
				}
			`;
			const variables: any = {
				page,
				perPage: limit,
				sort: Array.isArray(filters.sort) ? filters.sort : [filters.sort || 'POPULARITY_DESC']
			};
			if (expanded.trim()) variables.search = expanded.trim();
			if (filters.format) variables.format = filters.format.toUpperCase();
			if (filters.status) variables.status = filters.status.toUpperCase();
			if (filters.genre) variables.genre = filters.genre;

			const data = await queryAnilist(searchQuery, variables, customFetch);
			if (data?.Page?.media) {
				const formatted = {
					data: data.Page.media.map(transformMedia),
					pagination: {
						has_next_page: data.Page.pageInfo?.hasNextPage ?? false,
						current_page: data.Page.pageInfo?.currentPage ?? page,
						per_page: data.Page.pageInfo?.perPage ?? limit
					}
				};
				searchCache.set(cacheKey, { data: formatted, time: Date.now() });
				return formatted;
			}
		} catch (clientErr) {
			console.warn("Direct AniList Page(media) query failed, falling back to backend proxy:", clientErr);
		}

		// Fallback to backend server proxy if direct AniList query fails
				const params = new URLSearchParams({
					q: expanded,
					page: page.toString(),
					limit: limit.toString(),
					sort: Array.isArray(filters.sort) ? filters.sort[0] : (filters.sort || 'POPULARITY_DESC')
				});
				if (filters.format) params.append('format', filters.format);
				if (filters.status) params.append('status', filters.status);
				if (filters.genre) params.append('genre', filters.genre);

				try {
					const res = await fetchJSON(`${BASE_URL}/search?${params.toString()}`);
					if (res && res.data) {
						searchCache.set(cacheKey, { data: res, time: Date.now() });
					}
					return res;
				} catch (backendErr) {
					console.warn('AniList search proxy failed:', backendErr);
				}

				return { data: [], pagination: { has_next_page: false } };
			},

	getTopAnime: async (format = 'TV', page = 1, limit = 20, sort = 'POPULARITY_DESC', customFetch?: typeof fetch) => {
		return api.search('', page, limit, { format, sort: [sort] }, customFetch);
	},

	getAnilistSchedule: async (start: number, end: number, customFetch?: typeof fetch) => {
		try {
			const query = `
				query ($start: Int, $end: Int) {
					Page(page: 1, perPage: 50) {
						airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
							id airingAt timeUntilAiring episode mediaId
							media {
								id idMal
								title { romaji english native userPreferred }
								coverImage { extraLarge large }
								bannerImage format status episodes duration genres
								averageScore popularity seasonYear description
							}
						}
					}
				}
			`;
			const data = await queryAnilist(query, { start, end }, customFetch);
			if (data?.Page?.airingSchedules) {
				return data.Page.airingSchedules.map((item: any) => {
					const m = transformMedia(item.media);
					return {
						...m,
						airingAt: item.airingAt,
						episode: item.episode,
						mediaId: item.mediaId,
						airingScheduleId: item.id,
						nextAiringEpisode: { episode: item.episode, airingAt: item.airingAt }
					};
				});
			}
		} catch (err) {
			console.warn('AniList schedule query failed, falling back to backend:', err);
		}
		const res = await fetchJSON(`${BASE_URL}/schedule?start=${start}&end=${end}`, { fetch: customFetch });
		return res?.data || res;
	},

	getCurrentSeasonal: async (page = 1, limit = 20, customFetch?: typeof fetch) => {
		return api.search('', page, limit, { status: 'RELEASING', sort: ['TRENDING_DESC'] }, customFetch);
	},

	getUpcoming: async (page = 1, limit = 20, customFetch?: typeof fetch) => {
		return api.search('', page, limit, { status: 'NOT_YET_RELEASED', sort: ['POPULARITY_DESC'] }, customFetch);
	},

	getByGenre: async (genre: string, page = 1, limit = 20, customFetch?: typeof fetch) => {
		return api.search('', page, limit, { genre, sort: ['POPULARITY_DESC'] }, customFetch);
	},

	getRecommendations: async (id: string | number, customFetch?: typeof fetch) => {
		if (browser && !customFetch) {
			try {
				const numId = parseInt(String(id), 10);
				const recFields = `recommendations(page: 1, perPage: 12, sort: [RATING_DESC, ID_DESC]) {
					nodes { mediaRecommendation { ${mediaFieldsInline} } }
				}`;
				let media: any = null;
				if (!isNaN(numId)) {
					const query = `query($id: Int) {
						byAnilistId: Media(id: $id, type: ANIME) { ${recFields} }
						byMalId: Media(idMal: $id, type: ANIME) { ${recFields} }
					}`;
					const data = await queryAnilist(query, { id: numId });
					media = data?.byAnilistId || data?.byMalId;
				} else {
					const query = `query { Media(idMal: ${id}, type: ANIME) { ${recFields} } }`;
					const data = await queryAnilist(query);
					media = data?.Media;
				}
				if (media?.recommendations?.nodes) {
					return media.recommendations.nodes
						.map((n: any) => n.mediaRecommendation)
						.filter(Boolean)
						.map(transformMedia);
				}
			} catch (clientErr) {
				console.warn("Direct client getRecommendations failed, falling back to backend:", clientErr);
			}
		}
		try {
			const res = await fetchJSON(`${BASE_URL}/recommendations/${id}`, { fetch: customFetch });
			return res?.data?.map(transformMedia) || [];
		} catch { return []; }
	},

	getCharacters: async (id: string | number) => {
		if (browser) {
			try {
				const numId = parseInt(String(id), 10);
				const charFields = `characters(sort: [ROLE, RELEVANCE, ID], page: 1, perPage: 24) {
					edges {
						role
						node {
							id
							name { full native }
							image { large medium }
						}
						voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
							id
							name { full native }
							image { large medium }
						}
					}
				}`;
				let media: any = null;
				if (!isNaN(numId)) {
					const query = `query($id: Int) {
						byAnilistId: Media(id: $id, type: ANIME) { ${charFields} }
						byMalId: Media(idMal: $id, type: ANIME) { ${charFields} }
					}`;
					const data = await queryAnilist(query, { id: numId });
					media = data?.byAnilistId || data?.byMalId;
				} else {
					const query = `query { Media(idMal: ${id}, type: ANIME) { ${charFields} } }`;
					const data = await queryAnilist(query);
					media = data?.Media;
				}
				if (media?.characters?.edges) {
					return media.characters.edges.map((edge: any) => ({
                                                        role: edge.role,
                                                        character: {
                                                                id: edge.node?.id,
                                                                name: edge.node?.name?.full || edge.node?.name?.native || 'Unknown',
                                                                native: edge.node?.name?.native || '',
                                                                images: {
                                                                        jpg: {
                                                                                image_url: edge.node?.image?.large || edge.node?.image?.medium || ''
                                                                        }
                                                                }
                                                        },
                                                        voiceActors: edge.voiceActors?.map((va: any) => ({
                                                                id: va.id,
                                                                name: va.name?.full || va.name?.native,
                                                                image: va.image?.large || va.image?.medium
                                                        })) || []
                                                }));
				}
			} catch (clientErr) {
				console.warn("Direct client getCharacters failed, falling back to backend:", clientErr);
			}
		}
		try {
			const res = await fetchJSON(`${BASE_URL}/characters/${id}`);
			return res?.data || [];
		} catch { return []; }
	},


	getRandomAnime: async () => {
		if (browser) {
			try {
				const randomPage = Math.floor(Math.random() * 20) + 1;
				const query = `query($p:Int){Page(page:$p,perPage:25){media(type:ANIME,sort:[POPULARITY_DESC]){id idMal}}}`;
				const data = await queryAnilist(query, { p: randomPage });
				const list = data.Page?.media || [];
				const pick = list[Math.floor(Math.random() * list.length)];
				if (pick) return pick.idMal || pick.id;
			} catch (clientErr) {
				console.warn("Direct client getRandomAnime failed, falling back to backend:", clientErr);
			}
		}
		try {
			const res = await fetchJSON(`${BASE_URL}/random`);
			return res?.data?.id || res?.data?.idMal || res?.id || 1;
		} catch { return 1; }
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



	// Streaming
	// Episode list is sourced from AniList (episode count + streamingEpisodes for
	// titles/thumbnails) instead of the slow streaming-scraper backend. AniList is
	// fast and CDN-cached; we only fall back to the backend if AniList has no data.
	getEpisodeMetadata: async (animeId: string | number, page = 1, perPage = 50, customFetch?: typeof fetch) => {
		// Skip the direct AniList call from a localhost browser (CORS-blocked);
		// SSR already populates the list, so the client rarely reaches here.
		const canUseAnilist = !(browser && location.hostname === 'localhost');
		if (canUseAnilist) {
			try {
				const anilist = await getEpisodesFromAnilist(animeId, customFetch);
				if (anilist && anilist.data.episodes.length > 0) return anilist;
			} catch (err) {
				console.warn('AniList episode metadata failed, falling back to backend:', err);
			}
		}
		return fetchJSON(`${STREAMING_URL}/episode-metadata?animeId=${animeId}&page=${page}&perPage=${perPage}`, { fetch: customFetch });
	},

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

		/* ── New AniPlay-sourced providers ── */
		getHiAnimeSources: (animeId: string, ep: number) =>
			fetchJSON(`${STREAMING_URL}/sources/hianime?animeId=${animeId}&ep=${ep}`),

		getAniNekoSources: (animeId: string, ep: number) =>
			fetchJSON(`${STREAMING_URL}/sources/anineko?animeId=${animeId}&ep=${ep}`),

		getVidSrcSources: (animeId: string, ep: number) =>
			fetchJSON(`${STREAMING_URL}/sources/vidsrc?animeId=${animeId}&ep=${ep}`),

		getTatakaiSources: (animeId: string, ep: number) =>
			fetchJSON(`${STREAMING_URL}/sources/tatakai?animeId=${animeId}&ep=${ep}`),

		getAggregateSources: (animeId: string, ep: number) =>
		fetchJSON(`${STREAMING_URL}/sources?animeId=${animeId}&ep=${ep}`),


	// Legacy compatibility: episode lists are AniList-backed now.
	getEpisodes: (animeId: string | number, page = 1) =>
		api.getEpisodeMetadata(animeId, page, 50),

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
	// <img> tags don't need CORS for display — load directly from CDN.
	return url;
}
