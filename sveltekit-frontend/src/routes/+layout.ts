export const prerender = false;
export const ssr = true;
export const trailingSlash = 'always';

import type { LayoutLoad } from './$types';
import { getCanonicalUrl, getRobotsContent } from '$lib/seo';

export const load: LayoutLoad = ({ url }) => {
	return {
		canonicalUrl: getCanonicalUrl(url),
		robotsContent: getRobotsContent(url)
	};
};
