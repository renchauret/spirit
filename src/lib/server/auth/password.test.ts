import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
	it('verifies the password a hash was made from', async () => {
		const hash = await hashPassword('negroni-week');

		expect(await verifyPassword({ hash, password: 'negroni-week' })).toBe(true);
	});

	it('rejects any other password', async () => {
		const hash = await hashPassword('negroni-week');

		expect(await verifyPassword({ hash, password: 'Negroni-week' })).toBe(false);
		expect(await verifyPassword({ hash, password: '' })).toBe(false);
	});

	it('salts every hash, so the same password hashes differently', async () => {
		expect(await hashPassword('negroni-week')).not.toBe(await hashPassword('negroni-week'));
	});

	it('never stores the password itself', async () => {
		expect(await hashPassword('negroni-week')).not.toContain('negroni-week');
	});

	it('rejects a malformed hash instead of throwing', async () => {
		expect(await verifyPassword({ hash: 'not-a-hash', password: 'negroni-week' })).toBe(false);
	});
});
