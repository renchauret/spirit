import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '../db';
import * as schema from '../db/schema';
import { hashPassword, verifyPassword } from './password';

const DAY_IN_SECONDS = 24 * 60 * 60;

const SIGN_IN_ATTEMPTS = { window: 15 * 60, max: 5 };

type AuthConfig = {
	d1: D1Database;
	secret: string;
	baseURL: string;
};

export function createAuth({ d1, secret, baseURL }: AuthConfig) {
	return betterAuth({
		baseURL,
		secret,
		database: drizzleAdapter(getDb(d1), {
			provider: 'sqlite',
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
				rateLimit: schema.rateLimit
			}
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			password: { hash: hashPassword, verify: verifyPassword }
		},
		session: {
			expiresIn: 30 * DAY_IN_SECONDS,
			updateAge: DAY_IN_SECONDS
		},
		rateLimit: {
			enabled: true,
			storage: 'database',
			customRules: { '/sign-in/email': SIGN_IN_ATTEMPTS }
		},
		advanced: {
			ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] }
		},
		telemetry: { enabled: false }
	});
}

export type Auth = ReturnType<typeof createAuth>;
