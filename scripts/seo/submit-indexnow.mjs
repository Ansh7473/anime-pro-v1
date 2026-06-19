const siteOrigin = (process.env.SITE_ORIGIN || 'https://watchanimez.me').replace(/\/$/, '');
const host = new URL(siteOrigin).hostname.replace(/^www\./, '');
const limit = Number(process.env.INDEXNOW_LIMIT || 50);
const dryRun = process.env.INDEXNOW_DRY_RUN === '1';
const directKey = process.env.INDEXNOW_KEY || '';

const priorityPaths = [
	'/',
	'/latest/',
	'/movies/',
	'/tv-series/',
	'/explore/trending/',
	'/explore/popular/'
];

async function fetchSitemapUrls() {
	const response = await fetch(`${siteOrigin}/sitemap.xml`);
	if (!response.ok) {
		throw new Error(`Failed to fetch sitemap.xml: HTTP ${response.status}`);
	}
	const xml = await response.text();
	return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

function normalizeUrl(value) {
	const url = new URL(value, siteOrigin);
	url.protocol = 'https:';
	url.hostname = host;
	return url.toString();
}

function selectUrls(sitemapUrls) {
	const priorityUrls = priorityPaths.map((path) => normalizeUrl(path));
	const animeUrls = sitemapUrls.filter((url) => url.includes('/anime/')).slice(0, 20);
	const watchUrls = sitemapUrls.filter((url) => url.includes('/watch/')).slice(0, 10);
	const sitemapPriority = sitemapUrls.filter((url) => !url.includes('/watch/')).slice(0, limit);

	return [...new Set([...priorityUrls, ...animeUrls, ...watchUrls, ...sitemapPriority])]
		.map(normalizeUrl)
		.slice(0, limit);
}

async function submitViaApp(urlList) {
	const response = await fetch(`${siteOrigin}/api/indexnow`, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify({ urls: urlList })
	});
	const body = await response.text();
	if (!response.ok) {
		throw new Error(`App IndexNow endpoint failed: HTTP ${response.status}\n${body}`);
	}
	return body;
}

async function submitDirect(urlList) {
	if (!directKey) {
		throw new Error('INDEXNOW_KEY is required for direct IndexNow submission.');
	}

	const response = await fetch('https://api.indexnow.org/indexnow', {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify({
			host,
			key: directKey,
			keyLocation: `${siteOrigin}/indexnow-key.txt`,
			urlList
		})
	});
	const body = await response.text();
	if (!response.ok) {
		throw new Error(`Direct IndexNow submission failed: HTTP ${response.status}\n${body}`);
	}
	return body || `HTTP ${response.status}`;
}

async function main() {
	const sitemapUrls = await fetchSitemapUrls();
	const urlList = selectUrls(sitemapUrls);

	if (urlList.length === 0) {
		throw new Error('No URLs found to submit.');
	}

	console.log(`Prepared ${urlList.length} URLs for IndexNow.`);
	for (const url of urlList) console.log(url);

	if (dryRun) {
		console.log('Dry run only. Set INDEXNOW_DRY_RUN=0 or omit it to submit.');
		return;
	}

	const mode = process.env.INDEXNOW_MODE || (directKey ? 'direct' : 'app');
	const result = mode === 'direct' ? await submitDirect(urlList) : await submitViaApp(urlList);
	console.log(`IndexNow submission complete via ${mode}.`);
	console.log(result);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
