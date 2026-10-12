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

describe('browse page header', () => {
	it('shows Filter, Create and Ingredients as matching pills in that order for the Owner', () => {
		const html = browse(true);

		expect(html).toMatch(/<button[^>]*class="chip[^"]*"[^>]*>Filter<\/button>/);
		expect(html).toMatch(/<a class="chip[^"]*" href="\/recipes\/new"[^>]*>Create<\/a>/);
		expect(html).toMatch(/<a class="chip[^"]*" href="\/ingredients"[^>]*>Ingredients<\/a>/);
		expect(html).not.toMatch(/class="chip[^"]*\bsel\b[^"]*"[^>]*>(Create|Ingredients)</);

		const order = ['>Filter<', '>Create<', '>Ingredients<'].map((needle) => html.indexOf(needle));
		expect(order.every((at) => at >= 0)).toBe(true);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('never shows the Owner pills to Visitors', () => {
		const html = browse(false);

		expect(html).not.toContain('href="/recipes/new"');
		expect(html).not.toContain('href="/ingredients"');
		expect(html).not.toContain('/recipes/new');
		expect(html).not.toContain('>Create<');
		expect(html).not.toContain('>Ingredients<');
	});
});
