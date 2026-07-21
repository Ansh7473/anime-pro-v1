export type TMDBMovie = {
	id: number;
	title?: string;
	original_title?: string;
	overview?: string;
	poster_path?: string | null;
	backdrop_path?: string | null;
	poster?: string | null;
	backdrop?: string | null;
	release_date?: string;
	vote_average?: number;
	vote_count?: number;
	runtime?: number;
	status?: string;
	tagline?: string;
	genres?: Array<{ id?: number; name?: string } | string>;
	production_countries?: Array<{ iso_3166_1?: string; name?: string }>;
};

export type TMDBPage = {
	results: TMDBMovie[];
	page: number;
	total_pages: number;
	total_results: number;
};

export function unwrapTMDB<T = any>(response: any): T {
	return (response?.data ?? response) as T;
}

export function normalizeTMDBPage(response: any, fallbackPage = 1): TMDBPage {
	const payload = unwrapTMDB<any>(response) || {};
	const results = payload.results ?? payload.items ?? payload.movies ?? [];
	return {
		results: Array.isArray(results) ? results : [],
		page: Number(payload.page ?? payload.current_page) || fallbackPage,
		total_pages: Number(payload.total_pages ?? payload.last_page) || fallbackPage,
		total_results: Number(payload.total_results ?? payload.total) || 0
	};
}

export function tmdbImage(path?: string | null, size = 'w780'): string {
	if (!path) return '';
	if (/^https?:\/\//i.test(path)) return path;
	return `https://image.tmdb.org/t/p/${size}/${path.replace(/^\//, '')}`;
}
