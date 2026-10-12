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
