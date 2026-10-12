import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { env } from 'cloudflare:workers';
import { createAuth, type Auth } from '#lib/server/auth/index.ts';
import { getDb } from '#lib/server/db/index.ts';
import { noStore, ownerSession } from '#lib/server/hooks.ts';

const authByOrigin = new Map<string, Auth>();

function authFor(origin: string): Auth {
	let auth = authByOrigin.get(origin);
	if (!auth) {
		auth = createAuth({ d1: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL: origin });
		authByOrigin.set(origin, auth);
	}
	return auth;
}

const database: Handle = ({ event, resolve }) => {
	event.locals.db = getDb(env.DB);
	event.locals.photos = env.PHOTOS;
	return resolve(event);
};

export const handle = sequence(
	database,
	ownerSession((event) => authFor(event.url.origin)),
	noStore
);
