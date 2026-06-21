import type { PageServerLoad } from './$types';
import { api } from '$lib/api';
import { withSeoTimeout } from '$lib/server/seo-load';
import { absoluteUrl } from '$lib/seo';

const fallbackCategory = { data: [], pagination: { has_next_page: false } };

export const load: PageServerLoad = async ({ params, fetch }) => {
  try {
    const res = await withSeoTimeout(api.getCategory(params.category, 1, fetch), fallbackCategory);
    return {
      category: params.category,
      items: res?.data || [],
      hasNext: res?.pagination?.has_next_page || false,
      canonicalUrl: absoluteUrl(`/explore/${params.category}/`)
    };
  } catch (error) {
    console.error(`Failed to load category ${params.category} for SSR:`, error);
    return {
      category: params.category,
      items: [],
      hasNext: false,
      canonicalUrl: absoluteUrl(`/explore/${params.category}/`)
    };
  }
};
