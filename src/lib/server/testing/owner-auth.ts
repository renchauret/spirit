import type { Cookies } from '@sveltejs/kit';
import { createAuth, type Auth } from '../auth';
import { seedOwnerSql } from '../auth/owner-account';
import { hashPassword } from '../auth/password';
import { createLocalD1, type LocalD1 } from './local-d1';

export const origin = 'https://spirit.renchauret.com';

export const seededOwner = { email: 'owner@example.com', password: 'negroni-week' };

export type OwnerAuth = LocalD1 & {
	auth: Auth;
	run: (sql: string) => Promise<D1ExecResult>;
};

export async function createOwnerAuth(): Promise<OwnerAuth> {
	const local = await createLocalD1();
	const auth = createAuth({
		d1: local.d1,
		secret: 'test-secret-at-least-32-characters-long',
		baseURL: origin
	});
	const run = (sql: string) => local.d1.exec(sql);
	await run(
		seedOwnerSql({
			email: seededOwner.email,
			passwordHash: await hashPassword(seededOwner.password)
		})
	);
	return { ...local, auth, run };
}

export const cookieHeaderFrom = (setCookie: string[]) =>
	setCookie.map((cookie) => cookie.split(';')[0]).join('; ');

export class CookieJar {
	values = new Map<string, string>();

	get header() {
		return [...this.values].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
	}

	asCookies(): Cookies {
		return {
			set: (name: string, value: string, options: { maxAge?: number }) => {
				if (options.maxAge === 0) this.values.delete(name);
				else this.values.set(name, value);
			}
		} as Cookies;
	}
}

export async function thrown(promise: unknown): Promise<unknown> {
	try {
		await promise;
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}
