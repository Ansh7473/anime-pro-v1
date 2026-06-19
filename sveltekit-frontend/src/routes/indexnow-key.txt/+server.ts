import { env } from '$env/dynamic/private';

export const prerender = false;

export function GET() {
	const key = env.INDEXNOW_KEY || '';

	if (!key) {
		return new Response('IndexNow key is not configured.\n', {
			status: 404,
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'no-store'
			}
		});
	}

	return new Response(`${key}\n`, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}
