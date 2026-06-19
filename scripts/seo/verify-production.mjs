const siteOrigin = (process.env.SITE_ORIGIN || 'https://watchanimez.me').replace(/\/$/, '');

const requiredPages = [
	'/',
	'/latest/',
	'/movies/',
	'/tv-series/',
	'/explore/trending/',
	'/explore/popular/'
];

async function fetchText(pathname) {
	const url = `${siteOrigin}${pathname}`;
	const response = await fetch(url, {
		headers: {
			'user-agent': 'WatchAnimez SEO verifier (+https://watchanimez.me)'
		}
	});
	const text = await response.text();
	return { url, response, text };
}

function assert(condition, message) {
	if (!condition) {
		throw new Error(message);
	}
}

async function verify() {
	const failures = [];

	for (const check of [
		async () => {
			const { text, response } = await fetchText('/robots.txt');
			assert(response.ok, 'robots.txt is not reachable');
			assert(text.includes(`Sitemap: ${siteOrigin}/sitemap.xml`), 'robots.txt does not reference sitemap.xml');
			assert(!text.includes('Disallow: /watch/'), 'robots.txt still blocks /watch/');
		},
		async () => {
			const { text, response } = await fetchText('/sitemap.xml');
			assert(response.ok, 'sitemap.xml is not reachable');
			assert(text.includes('<urlset'), 'sitemap.xml is not XML sitemap content');
			assert(text.includes(`${siteOrigin}/movies/`), 'sitemap.xml is missing /movies/');
			assert(text.includes(`${siteOrigin}/tv-series/`), 'sitemap.xml is missing /tv-series/');
			assert(text.includes(`${siteOrigin}/anime/`), 'sitemap.xml is missing anime detail URLs');
		},
		async () => {
			const { text, response } = await fetchText('/indexnow-key.txt');
			assert(response.ok, 'indexnow-key.txt is not reachable; configure INDEXNOW_KEY in production');
			assert(!text.includes('not configured'), 'indexnow-key.txt is returning the not-configured message');
			assert(text.trim().length >= 8, 'indexnow-key.txt looks too short');
		}
	]) {
		try {
			await check();
		} catch (error) {
			failures.push(error.message);
		}
	}

	for (const page of requiredPages) {
		try {
			const { text, response, url } = await fetchText(page);
			assert(response.ok, `${url} is not reachable`);
			assert(text.includes('rel="canonical"'), `${url} is missing canonical link`);
			assert(text.includes('yandex-verification'), `${url} is missing Yandex verification meta`);
			assert(text.includes('application/ld+json'), `${url} is missing JSON-LD`);
		} catch (error) {
			failures.push(error.message);
		}
	}

	if (failures.length > 0) {
		console.error('SEO production verification failed:');
		for (const failure of failures) console.error(`- ${failure}`);
		process.exit(1);
	}

	console.log(`SEO production verification passed for ${siteOrigin}`);
}

verify().catch((error) => {
	console.error(error);
	process.exit(1);
});
