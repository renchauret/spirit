import type { RequestEvent } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from './auth';
import { signInOwner } from './auth/owner';
import { PHOTO_ROUTE, noStore, ownerSession } from './hooks';
import {
	cookieHeaderFrom,
	createOwnerAuth,
	origin,
	seededOwner,
	type OwnerAuth
} from './testing/owner-auth';

const eventFor = (headers: HeadersInit = {}, routeId = '/') =>
	({
		route: { id: routeId },
		url: new URL(`${origin}/`),
		request: new Request(`${origin}/`, { headers }),
		locals: {}
	}) as RequestEvent;

describe('noStore', () => {
	it('marks every server-rendered response as not cacheable', async () => {
		const response = await noStore({
			event: eventFor(),
			resolve: async () => new Response('<h1>Spirit</h1>')
		});

		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('overrides a cache header set while rendering', async () => {
		const response = await noStore({
			event: eventFor(),
			resolve: async () =>
				new Response('<h1>Spirit</h1>', { headers: { 'cache-control': 'max-age=3600' } })
		});

		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('leaves the long-lived cache header on photo bytes', async () => {
		const response = await noStore({
			event: eventFor({}, PHOTO_ROUTE),
			resolve: async () =>
				new Response('photo', { headers: { 'cache-control': 'public, max-age=31536000, immutable' } })
		});

		expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
	});
});

describe('ownerSession', () => {
	let local: OwnerAuth;
	let auth: Auth;

	beforeEach(async () => {
		local = await createOwnerAuth();
		auth = local.auth;
	});

	const signedInEvent = async () => {
		const result = await signInOwner(auth, { ...seededOwner, ip: '203.0.113.7' });
		if (!result.ok) throw new Error('sign-in failed');
		return eventFor({ cookie: cookieHeaderFrom(result.setCookie) });
	};

	afterEach(async () => {
		await local.dispose();
	});

	const handle = () => ownerSession(() => auth);

	it('treats a request without a session as a Visitor', async () => {
		const event = eventFor();

		await handle()({ event, resolve: async () => new Response('ok') });

		expect(event.locals.owner).toBeNull();
		expect(event.locals.auth).toBe(auth);
	});

	it('recognises the Owner from their session cookie', async () => {
		const event = await signedInEvent();

		await handle()({ event, resolve: async () => new Response('ok') });

		expect(event.locals.owner?.email).toBe('owner@example.com');
	});

	it('sends the renewed session cookie when the Owner comes back days later', async () => {
		const event = await signedInEvent();
		vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 10 * 24 * 60 * 60 * 1000 });

		try {
			const response = await handle()({ event, resolve: async () => new Response('ok') });

			expect(response.headers.getSetCookie().join('\n')).toMatch(
				/better-auth\.session_token=.+Max-Age=2592000/
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('ignores a forged session cookie', async () => {
		const event = eventFor({ cookie: 'better-auth.session_token=forged.signature' });

		await handle()({ event, resolve: async () => new Response('ok') });

		expect(event.locals.owner).toBeNull();
	});
});
