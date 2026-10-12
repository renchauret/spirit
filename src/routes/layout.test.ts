import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import OwnerRow from '#lib/components/OwnerRow.svelte';
import { load } from './+layout.server';

const loadFor = async (owner: App.Locals['owner'], cookies: Record<string, string> = {}) =>
	(await load({ cookies: { get: (name: string) => cookies[name] }, locals: { owner } } as never)) as {
		signedIn: boolean;
	};

describe('root layout', () => {
	it('ignores a leftover units cookie from the removed oz/ml toggle', async () => {
		expect(await loadFor(null, { units: 'ml' })).toEqual({ signedIn: false });
	});
});

describe('signed-in row', () => {
	it('is never rendered for Visitors', async () => {
		const data = await loadFor(null);

		expect(data.signedIn).toBe(false);
		expect(render(OwnerRow, { props: { signedIn: data.signedIn } }).body).not.toContain('Sign out');
	});

	it('is rendered for the Owner with only Sign out', async () => {
		const data = await loadFor({ id: 'owner', email: 'owner@example.com' });
		const html = render(OwnerRow, { props: { signedIn: data.signedIn } }).body;

		expect(data.signedIn).toBe(true);
		expect(html).toContain('Sign out');
		expect(html).toContain('action="/signout"');
		expect(html).not.toContain('+ New Recipe');
		expect(html).not.toContain('>Create<');
		expect(html).not.toContain('>Ingredients<');
	});

	it('does not send the Owner email to the page', async () => {
		const data = await loadFor({ id: 'owner', email: 'owner@example.com' });

		expect(JSON.stringify(data)).not.toContain('owner@example.com');
	});
});
