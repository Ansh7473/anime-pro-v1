import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.hostname === 'www.watchanimez.me') {
		event.url.hostname = 'watchanimez.me';
		throw redirect(308, event.url.toString());
	}

	return resolve(event);
};
