import { isRedirect, type Cookies } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Auth } from '#lib/server/auth/index.ts';
import { getOwner, signInOwner } from '#lib/server/auth/owner.ts';
import {
	cookieHeaderFrom,
	createOwnerAuth,
	origin,
	seededOwner,
	type OwnerAuth
} from '#lib/server/testing/owner-auth.ts';
import { actions, load } from './+page.server';

class CookieJar {
	values = new Map<string, string>();

	asCookies(): Cookies {
		return {
			set: (name: string, value: string, options: { maxAge?: number }) => {
				if (options.maxAge === 0) this.values.delete(name);
				else this.values.set(name, value);
			}
		} as Cookies;
	}
}

async function thrown(promise: unknown) {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

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

	it('does not sign the Owner out on a GET', async () => {
		const headers = await signIn();
		const owner = (await getOwner(auth, headers)).owner;
		if (!owner) throw new Error('expected a session');

		await visit({ cookie: headers.get('cookie')! }, owner);

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
