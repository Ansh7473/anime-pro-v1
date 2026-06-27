import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

const fallbackCategory = { data: [], pagination: { has_next_page: false } };

export const load: PageServerLoad = ({ params, fetch }) => {
  // Stream the initial list: shell + skeleton grid paint instantly, data swaps in.
  return {
    category: params.category,
    canonicalUrl: absoluteUrl(`/explore/${params.category}/`),
    initial: withSeoTimeout(api.getCategory(params.category, 1, fetch), fallbackCategory)
      .then((res) => ({ items: res?.data || [], hasNext: res?.pagination?.has_next_page || false }))
      .catch((error) => {
        console.error(`Failed to load category ${params.category} for SSR:`, error);
        return { items: [], hasNext: false };
      })
  };
};
