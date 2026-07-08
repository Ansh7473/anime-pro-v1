import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  try {
    const anime = await withSeoTimeout(api.getAnime(params.id, fetch), null);

    // Cache anime detail pages longer — data rarely changes
    if (anime) {
      setHeaders({
        'Cache-Control': 'public, max-age=120, s-maxage=900, stale-while-revalidate=3600, stale-if-error=86400'
      });
    }

    return {
      id: params.id,
      anime,
      canonicalUrl: absoluteUrl(`/anime/${params.id}/`)
    };
  } catch (error) {
    console.error(`Failed to load anime ${params.id} for SSR:`, error);
    return { id: params.id, anime: null, canonicalUrl: absoluteUrl(`/anime/${params.id}/`) };
  }
};
