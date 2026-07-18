import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  try {
    const anime = await withSeoTimeout(api.getAnime(params.id, fetch), null);
    const metadataId = anime?.idMal || anime?.mal_id || params.id;
    const metadataResponse = anime
      ? await withSeoTimeout(
          api.getEpisodeMetadata(metadataId, 1, 2000, fetch),
          { data: { episodes: [] } },
          3500
        )
      : { data: { episodes: [] } };
    const episodeMetadata = metadataResponse?.data?.episodes ?? metadataResponse?.episodes ?? [];

    // Episode metadata changes as shows air, so keep the edge window bounded.
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
      episodeMetadata,
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
