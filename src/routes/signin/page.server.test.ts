import { isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Auth } from '#lib/server/auth/index.ts';
import { getOwner } from '#lib/server/auth/owner.ts';
import {
	CookieJar,
	createOwnerAuth,
	origin,
	thrown,
	type OwnerAuth
} from '#lib/server/testing/owner-auth.ts';
import { actions, load } from './+page.server';

describe('/signin', () => {
	let local: OwnerAuth;
	let auth: Auth;
	let jar: CookieJar;

	beforeEach(async () => {
		local = await createOwnerAuth();
		auth = local.auth;
		jar = new CookieJar();
	});

	afterEach(async () => {
		await local.dispose();
	});

	const signIn = (fields: Record<string, string>) =>
		actions.default({
			request: new Request(`${origin}/signin`, {
				method: 'POST',
				headers: { 'cf-connecting-ip': '203.0.113.7' },
				body: new URLSearchParams(fields)
			}),
			url: new URL(`${origin}/signin`),
			locals: { auth, owner: null },
			cookies: jar.asCookies()
		} as never);

	const loadWith = (path: string, headers: HeadersInit = {}, owner: App.Locals['owner'] = null) =>
		load({
			url: new URL(`${origin}${path}`),
			request: new Request(`${origin}${path}`, { headers }),
			locals: { auth, owner }
		} as never);

	it('returns to the page named in redirectTo', async () => {
		expect(await loadWith('/signin?redirectTo=/recipes/12')).toEqual({ redirectTo: '/recipes/12' });
	});

	it('returns to the page the Owner came from', async () => {
		expect(await loadWith('/signin', { referer: `${origin}/recipes/7` })).toEqual({
			redirectTo: '/recipes/7'
		});
	});

	it('sends an Owner who is already signed in straight back', async () => {
		const error = await thrown(
			loadWith('/signin?redirectTo=/recipes/12', {}, { id: 'owner', email: 'owner@example.com' })
		);

		expect(isRedirect(error) && error.location).toBe('/recipes/12');
	});

	it('signs the Owner in and returns them to where they came from', async () => {
		const error = await thrown(
			signIn({ email: 'owner@example.com', password: 'negroni-week', redirectTo: '/recipes/12' })
		);

		expect(isRedirect(error) && error.location).toBe('/recipes/12');
		const { owner } = await getOwner(auth, new Headers({ cookie: jar.header }));
		expect(owner?.email).toBe('owner@example.com');
	});

	it('never redirects off the site after sign-in', async () => {
		const error = await thrown(
			signIn({ email: 'owner@example.com', password: 'negroni-week', redirectTo: 'https://evil.example/' })
		);

		expect(isRedirect(error) && error.location).toBe('/');
	});

	it('shows an error and sets no session for a wrong password', async () => {
		const result = await signIn({ email: 'owner@example.com', password: 'daiquiri', redirectTo: '/' });

		expect(result).toMatchObject({ status: 400, data: { email: 'owner@example.com' } });
		expect(jar.values.size).toBe(0);
	});

	it('tells the Owner to wait once sign-in is rate-limited', async () => {
		for (let attempt = 0; attempt < 5; attempt++) {
			await signIn({ email: 'owner@example.com', password: 'daiquiri', redirectTo: '/' });
		}

		const result = await signIn({ email: 'owner@example.com', password: 'negroni-week', redirectTo: '/' });

		expect(result).toMatchObject({ status: 429 });
	});
});
