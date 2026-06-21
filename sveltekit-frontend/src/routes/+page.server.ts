import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import type { PageServerLoad } from './$types';

const fallbackHomeData = { trending: [], popular: [], topRated: [], action: [], romance: [], movies: [] };

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		return {
			homeData: await withSeoTimeout(api.getHome(false, fetch), fallbackHomeData)
		};
	} catch (error) {
		console.error('Failed to load home data for SSR:', error);
		return {
			homeData: fallbackHomeData
		};
	}
};
