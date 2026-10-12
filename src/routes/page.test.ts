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
	it('puts Filter on the search row after the search box, not in the header', () => {
		const html = browse(true);

		const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
		expect(header).not.toContain('>Filter<');

		expect(html).toMatch(/<div class="search-row[^"]*">.*<input[^>]*type="search".*<button[^>]*>Filter<\/button>/);
	});

	it('gives Create and Ingredients the squared-off shared button class in the header', () => {
		const html = browse(true);

		expect(html).toMatch(/<a class="btn" href="\/recipes\/new"[^>]*>Create<\/a>/);
		expect(html).toMatch(/<a class="btn" href="\/ingredients"[^>]*>Ingredients<\/a>/);
		expect(html).not.toMatch(/class="btn[^"]*\bprimary\b[^"]*"[^>]*>(Create|Ingredients)</);
	});

	it('never shows the Owner pills to Visitors', () => {
		const html = browse(false);

		expect(html).not.toContain('href="/recipes/new"');
		expect(html).not.toContain('href="/ingredients"');
		expect(html).not.toContain('/recipes/new');
		expect(html).not.toContain('>Create<');
		expect(html).not.toContain('>Ingredients<');
	});

	it('shows the same Spirit wordmark to Visitors and the Owner', () => {
		expect(browse(true)).toContain('<h1>Spirit</h1>');
		expect(browse(false)).toContain('<h1>Spirit</h1>');
	});
});
