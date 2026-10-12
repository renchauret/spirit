import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	cookieHeaderFrom,
	createOwnerAuth,
	origin,
	seededOwner,
	type OwnerAuth
} from '../testing/owner-auth';
import type { Auth } from './index';
import { getOwner, signInOwner, signOutOwner } from './owner';
import { countOwnerAccountsSql, resetOwnerPasswordSql, seedOwnerSql } from './owner-account';
import { hashPassword } from './password';

const { email, password } = seededOwner;
const ip = '203.0.113.7';
const DAY = 24 * 60 * 60 * 1000;

const cookieHeader = (setCookie: string[]) => new Headers({ cookie: cookieHeaderFrom(setCookie) });

describe('Owner sign-in', () => {
	let local: OwnerAuth;
	let auth: Auth;

	const run = (sql: string) => local.run(sql);

	beforeEach(async () => {
		local = await createOwnerAuth();
		auth = local.auth;
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('signs the seeded Owner in and recognises their session', async () => {
		const result = await signInOwner(auth, { email, password, ip });

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		const { owner } = await getOwner(auth, cookieHeader(result.setCookie));
		expect(owner?.email).toBe(email);
	});

	it('accepts the email in any case', async () => {
		const result = await signInOwner(auth, { email: 'Owner@Example.com', password, ip });

		expect(result.ok).toBe(true);
	});

	it('rejects a wrong password', async () => {
		expect(await signInOwner(auth, { email, password: 'daiquiri', ip })).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('rejects an unknown email', async () => {
		expect(await signInOwner(auth, { email: 'visitor@example.com', password, ip })).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('rate-limits repeated attempts from one address, even with the right password', async () => {
		for (let attempt = 0; attempt < 5; attempt++) {
			await signInOwner(auth, { email, password: 'daiquiri', ip });
		}

		expect(await signInOwner(auth, { email, password, ip })).toEqual({
			ok: false,
			reason: 'rate-limited'
		});
		expect((await signInOwner(auth, { email, password, ip: '198.51.100.2' })).ok).toBe(true);
	});

	it('keeps the session for 30 days', async () => {
		const before = Date.now();
		const result = await signInOwner(auth, { email, password, ip });
		if (!result.ok) throw new Error('sign-in failed');

		const session = await auth.api.getSession({ headers: cookieHeader(result.setCookie) });

		const expiresIn = session!.session.expiresAt.getTime() - before;
		expect(expiresIn).toBeGreaterThanOrEqual(30 * DAY - 60_000);
		expect(expiresIn).toBeLessThanOrEqual(30 * DAY + 60_000);
	});

	it('renews the session for another 30 days when the site is used', async () => {
		const result = await signInOwner(auth, { email, password, ip });
		if (!result.ok) throw new Error('sign-in failed');
		const headers = cookieHeader(result.setCookie);
		vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 10 * DAY });

		try {
			const { owner, setCookie } = await getOwner(auth, headers);
			const session = await auth.api.getSession({ headers });

			expect(owner?.email).toBe(email);
			expect(setCookie.join('\n')).toMatch(/better-auth\.session_token=.+Max-Age=2592000/);
			expect(session!.session.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * DAY);
		} finally {
			vi.useRealTimers();
		}
	});

	it('signs out, so the session no longer counts', async () => {
		const result = await signInOwner(auth, { email, password, ip });
		if (!result.ok) throw new Error('sign-in failed');
		const headers = cookieHeader(result.setCookie);

		const cleared = await signOutOwner(auth, headers);

		expect(cleared.join('\n')).toMatch(/better-auth\.session_token=;/);
		expect((await getOwner(auth, headers)).owner).toBeNull();
	});

	it('treats a request without a session as a Visitor', async () => {
		expect((await getOwner(auth, new Headers())).owner).toBeNull();
	});

	it('has no way to sign up', async () => {
		const response = await auth.handler(
			new Request(`${origin}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': ip },
				body: JSON.stringify({ email: 'visitor@example.com', password, name: 'Visitor' })
			})
		);

		expect(response.ok).toBe(false);
		expect(await signInOwner(auth, { email: 'visitor@example.com', password, ip })).toEqual({
			ok: false,
			reason: 'invalid'
		});
	});

	it('refuses to seed a second Owner with the same email', async () => {
		await expect(
			run(seedOwnerSql({ email, passwordHash: await hashPassword('another') }))
		).rejects.toThrow();
	});

	it('resets the password, signing the Owner out everywhere', async () => {
		const before = await signInOwner(auth, { email, password, ip });
		if (!before.ok) throw new Error('sign-in failed');

		await run(resetOwnerPasswordSql({ email, passwordHash: await hashPassword('mai-tai') }));

		expect((await getOwner(auth, cookieHeader(before.setCookie))).owner).toBeNull();
		expect((await signInOwner(auth, { email, password, ip })).ok).toBe(false);
		expect((await signInOwner(auth, { email, password: 'mai-tai', ip })).ok).toBe(true);
	});

	it('counts Owner accounts by email in any case, so a reset can refuse an unknown email', async () => {
		const owners = (address: string) =>
			local.d1.prepare(countOwnerAccountsSql(address)).first<number>('owners');

		expect(await owners('OWNER@example.com')).toBe(1);
		expect(await owners('visitor@example.com')).toBe(0);
	});

	it('quotes the email so it cannot break out of the SQL', async () => {
		const tricky = "o'brien@example.com";

		await run(seedOwnerSql({ email: tricky, passwordHash: await hashPassword(password) }));

		expect((await signInOwner(auth, { email: tricky, password, ip })).ok).toBe(true);
	});
});
