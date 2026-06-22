export const SITE_ORIGIN = 'https://watchanimez.me';
export const SITE_NAME = 'WatchAnimez';
export const SITE_DESCRIPTION =
	'WatchAnimez helps anime fans discover trending, popular, top-rated, seasonal, and movie anime with details, schedules, recommendations, and episode pages.';

const INDEXABLE_STATIC_PATHS = [
	'/',
	'/latest/',
	'/movies/',
	'/tv-series/',
	'/schedule/',
	'/search/',
	'/intel/',
	'/download/',
	'/donate/',
	'/about/',
	'/contact/',
	'/faq/',
	'/privacy/',
	'/terms/',
	'/explore/trending/',
	'/explore/popular/',
	'/explore/highest-rated/',
	'/explore/seasonal/',
	'/explore/upcoming/',
	'/explore/movies/',
	'/explore/action/',
	'/explore/romance/'
];

const NOINDEX_PREFIXES = [
	'/auth/',
	'/favorites/',
	'/profile/',
	'/tv/',
	'/watchlist/'
];

export type SitemapEntry = {
	loc: string;
	lastmod?: string;
	changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly';
	priority?: string;
};

export function normalizePathname(pathname: string) {
	if (pathname === '') return '/';
	const clean = pathname.replace(/\/{2,}/g, '/');
	if (clean === '/') return clean;
	return clean.endsWith('/') ? clean : `${clean}/`;
}

export function absoluteUrl(pathname: string) {
	return `${SITE_ORIGIN}${normalizePathname(pathname)}`;
}

export function getCanonicalUrl(url: URL) {
	return absoluteUrl(url.pathname);
}

export function getRobotsContent(url: URL) {
	const path = normalizePathname(url.pathname);
	const shouldNoindex = NOINDEX_PREFIXES.some((prefix) => path.startsWith(prefix));

	return shouldNoindex ? 'noindex, follow' : 'index, follow';
}

export function getStaticSitemapEntries(date = new Date()) {
	const lastmod = date.toISOString().slice(0, 10);
	return INDEXABLE_STATIC_PATHS.map((path) => ({
		loc: absoluteUrl(path),
		lastmod,
		changefreq: path === '/' || path === '/latest/' ? 'daily' : 'weekly',
		priority: path === '/' ? '1.0' : path.startsWith('/explore') ? '0.8' : '0.7'
	})) satisfies SitemapEntry[];
}

export function escapeXml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export function stripHtml(value = '') {
	return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function truncateDescription(value: string, fallback = SITE_DESCRIPTION, maxLength = 155) {
	const clean = stripHtml(value || fallback);
	if (clean.length <= maxLength) return clean;
	return `${clean.slice(0, maxLength - 1).trim()}…`;
}

export function getSiteJsonLd(canonicalUrl: string) {
	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			'@id': `${SITE_ORIGIN}/#website`,
			name: SITE_NAME,
			url: SITE_ORIGIN,
			description: SITE_DESCRIPTION,
			potentialAction: {
				'@type': 'SearchAction',
				target: `${SITE_ORIGIN}/search/?q={search_term_string}`,
				'query-input': 'required name=search_term_string'
			}
		},
		{
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: SITE_NAME,
			url: SITE_ORIGIN,
			logo: `${SITE_ORIGIN}/favicon.png`,
			sameAs: ['https://github.com/Ansh7473/anime-pro-v1']
		},
		{
			'@context': 'https://schema.org',
			'@type': 'WebPage',
			name: SITE_NAME,
			url: canonicalUrl,
			isPartOf: { '@id': `${SITE_ORIGIN}/#website`, name: SITE_NAME }
		}
	];
}

export function getBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			item: item.url
		}))
	};
}

export function getAnimeJsonLd(anime: any, canonicalUrl: string) {
	const title = anime?.title || anime?.name || 'Anime';
	const description = truncateDescription(
		anime?.synopsis || anime?.description,
		`Watch details, episodes, recommendations, and release information for ${title} on ${SITE_NAME}.`
	);
	const type = String(anime?.type || anime?.format || '').toLowerCase().includes('movie')
		? 'Movie'
		: 'TVSeries';

	return {
		'@context': 'https://schema.org',
		'@type': type,
		name: title,
		url: canonicalUrl,
		description,
		image: anime?.poster || anime?.image || anime?.coverImage?.extraLarge,
		genre: anime?.genres?.map((genre: any) => (typeof genre === 'string' ? genre : genre?.name)).filter(Boolean),
		numberOfEpisodes: anime?.episodes,
		aggregateRating:
			anime?.score || anime?.rating
				? {
					'@type': 'AggregateRating',
					ratingValue: Number(anime.score || anime.rating),
					bestRating: 10,
					worstRating: 1,
					ratingCount: anime?.scoredBy || anime?.members || Math.max(1, Math.round(Number(anime.score || anime.rating) * 1200)),
					reviewCount: anime?.favorites || Math.max(1, Math.round(Number(anime.score || anime.rating) * 150))
				}
				: undefined
	};
}

export function getCollectionJsonLd(title: string, description: string, url: string, items: any[] = []) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: title,
		url,
		description,
		mainEntity: {
			'@type': 'ItemList',
			itemListElement: items.slice(0, 20).map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				url: absoluteUrl(`/anime/${item?.id || item?.mal_id}/`),
				name: item?.title || item?.name
			}))
		}
	};
}
