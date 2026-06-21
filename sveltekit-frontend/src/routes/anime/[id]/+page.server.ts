import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    return {
      id: params.id,
      anime: await withSeoTimeout(api.getAnime(params.id, fetch), null),
      canonicalUrl: absoluteUrl(`/anime/${params.id}/`)
    };
  } catch (error) {
    console.error(`Failed to load anime ${params.id} for SSR:`, error);
    return { id: params.id, anime: null, canonicalUrl: absoluteUrl(`/anime/${params.id}/`) };
  }
};
