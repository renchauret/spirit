import { isRedirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Auth } from '#lib/server/auth/index.ts';
import { getOwner, signInOwner } from '#lib/server/auth/owner.ts';
import {
	CookieJar,
	cookieHeaderFrom,
	createOwnerAuth,
	origin,
	seededOwner,
	thrown,
	type OwnerAuth
} from '#lib/server/testing/owner-auth.ts';
import { actions, load } from './+page.server';

describe('/signout', () => {
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

	const signIn = async () => {
		const result = await signInOwner(auth, { ...seededOwner, ip: '203.0.113.7' });
		if (!result.ok) throw new Error('sign-in failed');
		return new Headers({ cookie: cookieHeaderFrom(result.setCookie) });
	};

	const visit = (headers: HeadersInit = {}, owner: App.Locals['owner'] = null) =>
		load({
			url: new URL(`${origin}/signout`),
			request: new Request(`${origin}/signout`, { headers }),
			locals: { auth, owner }
		} as never);

	const submit = (headers: HeadersInit) =>
		actions.default({
			request: new Request(`${origin}/signout`, { method: 'POST', headers }),
			url: new URL(`${origin}/signout`),
			locals: { auth, owner: null },
			cookies: jar.asCookies()
		} as never);

	it('renders for the signed-in Owner on a GET without signing them out', async () => {
		const headers = await signIn();
		const owner = (await getOwner(auth, headers)).owner;
		if (!owner) throw new Error('expected a session');

		await expect(visit({ cookie: headers.get('cookie')! }, owner)).resolves.toBeUndefined();

		expect((await getOwner(auth, headers)).owner).not.toBeNull();
	});

	it('sends a Visitor who is not signed in home', async () => {
		const error = await thrown(visit());

		expect(isRedirect(error) && error.location).toBe('/');
	});

	it('signs the Owner out on POST and returns home', async () => {
		const headers = await signIn();
		expect((await getOwner(auth, headers)).owner).not.toBeNull();

		const error = await thrown(submit(headers));

		expect(isRedirect(error) && error.location).toBe('/');
		expect(jar.values.size).toBe(0);
		expect((await getOwner(auth, headers)).owner).toBeNull();
	});
});
