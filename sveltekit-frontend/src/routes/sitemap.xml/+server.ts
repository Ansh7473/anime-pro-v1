import { api } from '$lib/api';
import { absoluteUrl, escapeXml, getStaticSitemapEntries, type SitemapEntry } from '$lib/seo';

export const prerender = false;

function renderUrl(entry: SitemapEntry) {
	return [
		'<url>',
		`<loc>${escapeXml(entry.loc)}</loc>`,
		entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '',
		entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : '',
		entry.priority ? `<priority>${entry.priority}</priority>` : '',
		'</url>'
	]
		.filter(Boolean)
		.join('');
}

function animeEntries(items: any[], lastmod: string): SitemapEntry[] {
	const seen = new Set<string>();

	return items
		.map((item) => item?.id || item?.mal_id)
		.filter(Boolean)
		.map((id) => String(id))
		.filter((id) => {
			if (seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.map((id) => ({
			loc: absoluteUrl(`/anime/${id}/`),
			lastmod,
			changefreq: 'weekly',
			priority: '0.8'
		}));
}

function watchEntries(items: any[], lastmod: string): SitemapEntry[] {
	const seen = new Set<string>();

	return items
		.map((item) => item?.id || item?.mal_id)
		.filter(Boolean)
		.map((id) => String(id))
		.filter((id) => {
			if (seen.has(id)) return false;
			seen.add(id);
			return true;
		})
		.map((id) => ({
			loc: absoluteUrl(`/watch/${id}/1/`),
			lastmod,
			changefreq: 'weekly',
			priority: '0.6'
		}));
}

export async function GET() {
	const today = new Date().toISOString().slice(0, 10);
	const entries: SitemapEntry[] = getStaticSitemapEntries();

	try {
		const [popular, trending, movies] = await Promise.all([
			api.getTopAnime('TV', 1, 50, 'POPULARITY_DESC'),
			api.getCurrentSeasonal(1, 50),
			api.getTopAnime('MOVIE', 1, 50, 'POPULARITY_DESC')
		]);

		const indexableAnime = [...(popular?.data || []), ...(trending?.data || []), ...(movies?.data || [])];
		entries.push(...animeEntries(indexableAnime, today), ...watchEntries(indexableAnime, today));
	} catch (error) {
		console.error('Failed to enrich sitemap with anime URLs:', error);
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
		.map(renderUrl)
		.join('')}</urlset>`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
		}
	});
}
