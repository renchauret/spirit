import { describe, expect, it } from 'vitest';
import { load } from './+layout.server';

const loadFor = async (owner: App.Locals['owner'], cookies: Record<string, string> = {}) =>
	(await load({ cookies: { get: (name: string) => cookies[name] }, locals: { owner } } as never)) as {
		signedIn: boolean;
	};

describe('root layout', () => {
	it('reports a Visitor as signed out', async () => {
		expect((await loadFor(null)).signedIn).toBe(false);
	});

	it('reports the Owner as signed in without sending their email to the page', async () => {
		const data = await loadFor({ id: 'owner', email: 'owner@example.com' });

		expect(data.signedIn).toBe(true);
		expect(JSON.stringify(data)).not.toContain('owner@example.com');
	});
});
