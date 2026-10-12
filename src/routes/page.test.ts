import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER } from '#lib/filter.ts';
import BrowsePage from './+page.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

const browse = (signedIn: boolean) =>
	text(
		render(BrowsePage, {
			props: { data: { filter: EMPTY_FILTER, sections: [], suggestions: [], recipes: [], signedIn } } as never
		}).body
	);

describe('browse page', () => {
	it('never shows the Owner pills to Visitors', () => {
		const html = browse(false);

		expect(html).not.toContain('href="/recipes/new"');
		expect(html).not.toContain('href="/ingredients"');
		expect(html).not.toContain('/recipes/new');
		expect(html).not.toContain('>Create<');
		expect(html).not.toContain('>Ingredients<');
	});
});
