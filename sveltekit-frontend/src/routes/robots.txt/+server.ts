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
				'Disallow: /logo-anim.mp4',
		'',
		`Sitemap: ${SITE_ORIGIN}/sitemap.xml`
	].join('\n');

	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
		}
	});
}
