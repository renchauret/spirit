import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import OwnerRow from '#lib/components/OwnerRow.svelte';
import { load } from './+layout.server';

const cookies = { get: () => undefined };

const loadFor = async (owner: App.Locals['owner']) =>
	(await load({ cookies, locals: { owner } } as never)) as { signedIn: boolean };

describe('signed-in row', () => {
	it('is never rendered for Visitors', async () => {
		const data = await loadFor(null);

		expect(data.signedIn).toBe(false);
		expect(render(OwnerRow, { props: { signedIn: data.signedIn } }).body).not.toContain('Sign out');
	});

	it('is rendered for the Owner with + New Recipe, Ingredients and Sign out', async () => {
		const data = await loadFor({ id: 'owner', email: 'owner@example.com' });
		const html = render(OwnerRow, { props: { signedIn: data.signedIn } }).body;

		expect(data.signedIn).toBe(true);
		expect(html).toContain('+ New Recipe');
		expect(html).toContain('Ingredients');
		expect(html).toContain('Sign out');
		expect(html).toContain('action="/signout"');
		expect(html).toMatch(/<a href="\/ingredients"[^>]*>Ingredients<\/a>/);
	});

	it('does not send the Owner email to the page', async () => {
		const data = await loadFor({ id: 'owner', email: 'owner@example.com' });

		expect(JSON.stringify(data)).not.toContain('owner@example.com');
	});
});
