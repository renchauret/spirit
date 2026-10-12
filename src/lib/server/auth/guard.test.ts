import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { requireOwner } from './guard';

const owner = { id: 'owner-id', email: 'owner@example.com' };

function thrownBy(fn: () => unknown) {
	try {
		fn();
	} catch (error) {
		return error;
	}
	throw new Error('expected a throw');
}

describe('requireOwner', () => {
	it('lets a write through with an Owner session', () => {
		expect(requireOwner({ owner })).toEqual(owner);
	});

	it('rejects a write from a Visitor with 401', () => {
		const error = thrownBy(() => requireOwner({ owner: null }));

		expect(isHttpError(error, 401)).toBe(true);
	});
});
