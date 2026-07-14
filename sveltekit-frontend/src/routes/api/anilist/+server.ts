import type { RequestHandler } from './$types';

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';
const EDGE_CACHE_TTL = 4 * 60 * 60; // 4 hours

async function sha256(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const hash = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data: unknown, init: ResponseInit = {}) {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init.headers
		}
	});
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	let body: { query?: unknown; variables?: unknown };
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
	}

	if (typeof body.query !== 'string' || body.query.trim().length === 0) {
		return jsonResponse({ error: 'Missing GraphQL query' }, { status: 400 });
	}

	const variables =
		body.variables && typeof body.variables === 'object' && !Array.isArray(body.variables)
			? body.variables
			: {};
	const cacheInput = JSON.stringify({ query: body.query.replace(/\s+/g, ' ').trim(), variables });
	const cacheId = await sha256(cacheInput);
	const cacheKey = new Request(`https://watchanimez.internal/anilist/${cacheId}`, { method: 'GET' });
	const edgeCache = (globalThis as any).caches?.default;

	if (edgeCache) {
		const cached = await edgeCache.match(cacheKey);
		if (cached) {
			return new Response(cached.body, {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `public, max-age=${EDGE_CACHE_TTL}`,
					'X-Anilist-Cache': 'HIT'
				}
			});
		}
	}

	const upstream = await fetch(ANILIST_GRAPHQL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({ query: body.query, variables })
	});

	const text = await upstream.text();
	if (!upstream.ok) {
		return new Response(text, {
			status: upstream.status,
			headers: {
				'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
				'Cache-Control': 'no-store',
				'X-Anilist-Cache': 'BYPASS'
			}
		});
	}

	let payload: any;
	try {
		payload = JSON.parse(text);
	} catch {
		return jsonResponse({ error: 'Invalid AniList response' }, { status: 502 });
	}

	if (payload.errors) {
		return jsonResponse(payload, {
			status: 502,
			headers: {
				'Cache-Control': 'no-store',
				'X-Anilist-Cache': 'BYPASS'
			}
		});
	}

	const response = jsonResponse(payload.data ?? {}, {
		headers: {
			'Cache-Control': `public, max-age=${EDGE_CACHE_TTL}`,
			'X-Anilist-Cache': 'MISS'
		}
	});

	if (edgeCache) {
		await edgeCache.put(cacheKey, response.clone());
	}

	return response;
};
