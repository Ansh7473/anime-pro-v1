import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { SITE_ORIGIN } from '$lib/seo';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const HOST = 'watchanimez.me';

function normalizeUrl(value: string) {
	const url = new URL(value, SITE_ORIGIN);
	if (url.hostname !== HOST && url.hostname !== `www.${HOST}`) {
		throw new Error('URL must belong to watchanimez.me');
	}
	url.hostname = HOST;
	url.protocol = 'https:';
	return url.toString();
}

export async function POST({ request }) {
	const key = env.INDEXNOW_KEY || '';
	if (!key) {
		return json({ error: 'INDEXNOW_KEY is not configured.' }, { status: 500 });
	}

	const payload = await request.json().catch(() => ({}));
	const urls = Array.isArray(payload.urls) ? payload.urls : payload.url ? [payload.url] : [SITE_ORIGIN];

	let urlList: string[];
	try {
		urlList = urls.map((url: unknown) => normalizeUrl(String(url))).slice(0, 10000);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Invalid URL list.' }, { status: 400 });
	}

	const response = await fetch(INDEXNOW_ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json; charset=utf-8' },
		body: JSON.stringify({
			host: HOST,
			key,
			keyLocation: `${SITE_ORIGIN}/indexnow-key.txt`,
			urlList
		})
	});

	return json(
		{
			ok: response.ok,
			status: response.status,
			submitted: urlList
		},
		{ status: response.ok ? 200 : response.status }
	);
}
