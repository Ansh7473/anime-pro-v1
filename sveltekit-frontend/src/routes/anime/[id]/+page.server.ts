import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  try {
    // Only canonical anime details belong on the navigation critical path.
    // Episode titles/thumbnails are progressively loaded in the browser.
    const anime = await withSeoTimeout(api.getAnime(params.id, fetch), null);

    if (anime) {
      setHeaders({
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400'
      });
    } else {
      setHeaders({
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      });
    }

    return {
      id: params.id,
      anime,
      episodeMetadata: [],
      canonicalUrl: absoluteUrl(`/anime/${params.id}/`)
    };
  } catch (error) {
    console.error(`Failed to load anime ${params.id} for SSR:`, error);
    return {
      id: params.id,
      anime: null,
      episodeMetadata: [],
      canonicalUrl: absoluteUrl(`/anime/${params.id}/`)
    };
  }
};