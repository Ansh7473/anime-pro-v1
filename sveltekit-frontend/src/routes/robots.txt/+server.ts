import { SITE_ORIGIN } from '$lib/seo';

export const prerender = true;

export function GET() {
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /auth/',
		'Disallow: /profile/',
		'Disallow: /watchlist/',
		'Disallow: /favorites/',
		'Disallow: /tv/',
		'',
		`Sitemap: ${SITE_ORIGIN}/sitemap.xml`
	].join('\n');

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}
