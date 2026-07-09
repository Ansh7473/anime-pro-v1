import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  try {
    const anime = await withSeoTimeout(api.getAnime(params.id, fetch), null);

    // Cache anime detail pages for 1 day at edge — anime metadata rarely changes.
    // Browser gets 5 min so users see updates (new episodes) without hard refresh.
    if (anime) {
      setHeaders({
        'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400, stale-if-error=86400'
      });
    } else {
      // Cache 404/null responses briefly so repeated requests for dead IDs
      // don't hit origin.
      setHeaders({
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
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
