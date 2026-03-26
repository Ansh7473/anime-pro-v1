import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const BASE_URL = '/api/v1/jikan';
const STREAMING_BASE_URL = '/api/v1/streaming';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

export const streamingClient = axios.create({
  baseURL: STREAMING_BASE_URL,
  timeout: 30000,
});

export const animelokClient = axios.create({ baseURL: '/api/v1/animelok', timeout: 30000 });
export const desidubClient = axios.create({ baseURL: '/api/v1/desidubanime', timeout: 30000 });
export const animehindiClient = axios.create({ baseURL: '/api/v1/animehindidubbed', timeout: 30000 });

// Consumet HiAnime API — proxied through Vite dev server to avoid CORS
export const hianimeClient = axios.create({ baseURL: '/consumet/anime/hianime', timeout: 15000 });

// Global request queue to prevent ANY parallel requests
let requestQueue: Promise<any> = Promise.resolve();
const MIN_REQUEST_INTERVAL = 500;

// Global request queue that ensures only one request at a time
const queuedRequest = async <T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return new Promise<AxiosResponse<T>>((resolve, reject) => {
    // Add request to queue
    requestQueue = requestQueue.then(async () => {
      try {
        // Wait minimum interval before processing
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));

        // Make the actual request
        const response = await apiClient.request<T>(config);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }).catch(reject);
  });
};

// Define response types for Jikan API
interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  images?: {
    jpg?: {
      image_url?: string;
      large_image_url?: string;
    };
  };
  score?: number;
  episodes?: number;
  status?: string;
  year?: number;
  genres?: Array<{ name: string }>;
  synopsis?: string;
  type?: string;
  aired?: {
    string?: string;
    prop?: {
      from?: {
        year?: number;
      };
    };
  };
  duration?: string;
  studios?: Array<{ name: string }>;
  source?: string;
  data?: any;
  themes?: Array<{ name: string }>;
  demographics?: Array<{ name: string }>;
  rating?: string;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  season?: string;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
  };
}

// Normalize Jikan anime object to the shape the frontend expects
export const normalize = (anime: any) => {
  const poster = anime.images?.jpg?.large_image_url ||
    anime.images?.jpg?.image_url ||
    anime.image_url ||
    '';
  return {
    ...anime,
    id: anime.mal_id?.toString() || anime.id?.toString(),
    title: anime.title || anime.name || 'Unknown Title',
    title_english: anime.title_english || '',
    title_japanese: anime.title_japanese || '',
    poster: poster,
    image: poster,
    rating: anime.score || 0,
    episodes: anime.episodes || 0,
    status: anime.status || 'Unknown',
    year: anime.year || anime.aired?.prop?.from?.year || 'N/A',
    genres: anime.genres?.map((g: any) => g.name) || [],
    synopsis: anime.synopsis || 'No description available.',
    type: anime.type || 'TV',
    duration: anime.duration || '',
    source: anime.source || 'Unknown',
    themes: anime.themes?.map((t: any) => t.name) || [],
    demographics: anime.demographics?.map((d: any) => d.name) || [],
    studios: anime.studios?.map((s: any) => s.name) || [],
    scored_by: anime.scored_by || 0,
    rank: anime.rank || 0,
    popularity: anime.popularity || 0,
    members: anime.members || 0,
    favorites: anime.favorites || 0,
    season: anime.season || '',
    broadcast: anime.broadcast || null,
  };
};

// Jikan API via our proxy backend
export const jikanAPI = {
  // Get homepage data
  getHome: async () => {
    const topAnimeRes = await queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: '/top?type=tv&limit=15' });
    const topAnime = topAnimeRes.data?.data || [];
    const searchRes = await queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: '/search?q=anime&limit=15' });
    const popular = searchRes.data?.data || [];

    const currentYear = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    let currentSeason = 'winter';
    if (month >= 3 && month <= 5) currentSeason = 'spring';
    else if (month >= 6 && month <= 8) currentSeason = 'summer';
    else if (month >= 9 && month <= 11) currentSeason = 'fall';

    const seasonalRes = await queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/seasonal/${currentYear}/${currentSeason}?limit=10` });
    const seasonal = seasonalRes.data?.data || [];

    const homeData = {
      data: {
        featured: popular.slice(0, 5),
        trendingGlobal: topAnime.slice(0, 10),
        topAnime: topAnime.slice(0, 10),
        recommendations: seasonal.slice(0, 10),
        latest: topAnime.slice(0, 10),
        tvShows: topAnime.filter((a: Anime) => a.type === 'TV').slice(0, 10),
        movies: topAnime.filter((a: Anime) => a.type === 'Movie').slice(0, 10),
        todaySchedule: [],
        topAiring: topAnime.filter((a: Anime) => a.status === 'Currently Airing').slice(0, 10),
        mostPopular: popular.slice(0, 10),
        topCompleted: topAnime.filter((a: Anime) => a.status === 'Finished Airing').slice(0, 10)
      }
    };
    return { data: homeData };
  },

  getAnimeById: (id: string | number) => queuedRequest<JikanResponse<Anime>>({ method: 'get', url: `/anime/${id}` }),
  getAnimeFullById: (id: string | number) => queuedRequest<JikanResponse<Anime>>({ method: 'get', url: `/anime/${id}` }), // Backend /anime/:id already returns full details

  // Batch fetch full anime details for multiple anime IDs
  // This helps avoid rate limiting by fetching details sequentially
  getAnimeFullBatch: async (ids: (string | number)[]): Promise<Anime[]> => {
    const results: Anime[] = [];
    for (const id of ids) {
      try {
        const response = await queuedRequest<JikanResponse<Anime>>({
          method: 'get',
          url: `/anime/${id}` // Backend /anime/:id already returns full details
        });
        if (response.data?.data) {
          results.push(response.data.data);
        }
      } catch (error) {
        console.error(`Failed to fetch full details for anime ${id}:`, error);
      }
    }
    return results;
  },
  searchAnime: (query: string, page: number = 1, limit: number = 20) =>
    queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}` }),
  search: (query: string) => queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/search?q=${encodeURIComponent(query)}&limit=20` }),
  getTopAnime: (type: string = 'tv', page: number = 1, limit: number = 20) =>
    queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/top?type=${type}&page=${page}&limit=${limit}` }),
  getSeasonalAnime: (year: number, season: string, page: number = 1, limit: number = 20) =>
    queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/seasonal/${year}/${season}?page=${page}&limit=${limit}` }),
  getCurrentSeasonalAnime: (page: number = 1, limit: number = 20) =>
    queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/seasons/now?page=${page}&limit=${limit}` }),
  getUpcomingSeasonalAnime: (page: number = 1, limit: number = 20) =>
    queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/seasons/upcoming?page=${page}&limit=${limit}` }),
  getRecommendations: (id: string | number) => queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/anime/${id}/recommendations` }),
  getCharacters: (id: string | number) => queuedRequest({ method: 'get', url: `/anime/${id}/characters` }),
  getEpisodes: (id: string | number, page: number = 1) => queuedRequest({ method: 'get', url: `/anime/${id}/episodes?page=${page}` }),
  getSchedule: (date?: string) => {
    let day = '';
    if (date) {
      const dateObj = new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      day = days[dateObj.getDay()];
    }
    const url = day ? `/schedule?day=${day}` : '/schedule';
    return queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url });
  },
  getAnime: (id: string | number) => queuedRequest<JikanResponse<Anime>>({ method: 'get', url: `/anime/${id}` }),

  getEpisodeMetadata: async (animeId: string | number) => {
    return await streamingClient.get('/episode-metadata', { params: { animeId } });
  },

  getWatch: async (episodeId: string, animeId?: string, episodeNumber?: string | number) => {
    return await streamingClient.get('/sources', { params: { episodeId, animeId, ep: episodeNumber } });
  },

  getStreamingServers: async (episodeId: string, animeId?: string, episodeNumber?: string | number) => {
    return await streamingClient.get('/servers', { params: { episodeId, animeId, ep: episodeNumber } });
  },
  getCategory: (type: string, page: number = 1) => queuedRequest<JikanResponse<Anime[]>>({ method: 'get', url: `/top?type=${type}&page=${page}&limit=20` }),
};

export const animeAPI = jikanAPI;

// Dedicated API Clients for Provider Endpoints
export const animelokAPI = {
  search: (query: string) => animelokClient.get('/search', { params: { q: query } }),
  getSeasons: (id: string | number) => animelokClient.get(`/anime/${id}/seasons`),
  getWatch: (id: string, ep: string | number) => animelokClient.get(`/watch/${id}`, { params: { ep } })
};

export const desidubAPI = {
  search: (query: string) => desidubClient.get('/search', { params: { q: query } }),
  getInfo: (slug: string) => desidubClient.get(`/info/${slug}`),
  getWatch: (id: string) => desidubClient.get(`/watch/${id}`)
};

export const animehindiAPI = {
  search: (title: string) => animehindiClient.get('/search', { params: { title } }),
  getInfo: (id: string) => animehindiClient.get(`/info/${id}`),
  getWatch: (id: string) => animehindiClient.get(`/watch/${id}`)
};

export const hianimeAPI = {
  getSpotlight: () => hianimeClient.get('/spotlight'),
  getTopAiring: (page: number = 1) => hianimeClient.get('/top-airing', { params: { page } }),
};

// Normalize Consumet/HiAnime anime to our standard shape
export const normalizeHianime = (anime: any) => ({
  id: anime.id || '',
  title: anime.title || 'Unknown Title',
  poster: anime.image || '',
  image: anime.image || '',
  description: anime.description || '',
  rank: anime.rank || 0,
  rating: anime.rating ?? 0,
  episodes: 0,
  genres: [],
  synopsis: anime.description || '',
  type: 'TV',
  status: 'Currently Airing',
  source: 'HiAnime',
  isHianime: true,
  subOrDub: anime.subOrDub || 'sub',
  releaseDate: anime.releaseDate || '',
});

export { jikanAPI as default };
