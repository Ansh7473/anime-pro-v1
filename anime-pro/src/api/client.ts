import axios from 'axios';

const BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Normalize DesiDubAnime anime object to the shape the frontend expects
export const normalize = (anime: any) => {
  const poster = anime.poster || anime.image || anime.thumbnail || '';
  // TMDB timeout mitigation: if it's a TMDB image, we could theoretically proxy it, 
  // but for now we'll just ensure a fallback is possible in the img tag.
  return {
    ...anime,
    id: anime.slug || anime.id || anime.mal_id?.toString(),
    title: anime.title || anime.name || 'Unknown Title',
    poster: poster,
    image: poster,
  };
};

// DesiDubAnime API via TatakaiAPI — all calls go to /api/v1/desidubanime/*
export const animeAPI = {
  getHome: () => apiClient.get('/desidubanime/home'),

  search: (q: string) =>
    apiClient.get(`/desidubanime/search?q=${encodeURIComponent(q)}`),

  getAnime: (id: string) => apiClient.get(`/desidubanime/info/${id}`),
  getWatch: (id: string) => apiClient.get(`/desidubanime/watch/${id}`),
  getCategory: (category: string, page: number = 1, tab: string = 'all') =>
    apiClient.get(`/desidubanime/category/${category}?page=${page}&tab=${tab}`),
  getSchedule: (date: string) =>
    apiClient.get(`/desidubanime/schedule?date=${date}`),
};

// Keep animelokAPI as alias for backward compat
export const animelokAPI = animeAPI as any;
