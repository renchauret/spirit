import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { Auth } from './auth';
import { getOwner } from './auth/owner';

export const noStore: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('cache-control', 'no-store');
	return response;
};

export const ownerSession =
	(authFor: (event: RequestEvent) => Auth): Handle =>
	async ({ event, resolve }) => {
		const auth = authFor(event);
		const { owner, setCookie } = await getOwner(auth, event.request.headers);
		event.locals.auth = auth;
		event.locals.owner = owner;

		const response = await resolve(event);
		for (const cookie of setCookie) response.headers.append('set-cookie', cookie);
		return response;
	};
