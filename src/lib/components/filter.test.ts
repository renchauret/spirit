import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, type FilterSection, type RecipeFilter } from '#lib/filter.ts';
import ActiveFilters from './ActiveFilters.svelte';
import FilterButton from './FilterButton.svelte';
import FilterSheet from './FilterSheet.svelte';

const sections: FilterSection[] = [
	{ type: 'spirit', ingredients: [{ id: 1, name: 'rum' }, { id: 2, name: 'white rum' }] },
	{ type: 'juice', ingredients: [{ id: 3, name: 'lime juice' }] }
];

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('FilterButton', () => {
	it('says Filter when nothing is on', () => {
		const html = text(render(FilterButton, { props: { count: 0, onclick: () => {} } }).body);

		expect(html).toMatch(/>\s*Filter\s*</);
		expect(html).not.toMatch(/class="[^"]*\bsel\b/);
	});

	it('shows the active count and is highlighted when filters are on', () => {
		const html = text(render(FilterButton, { props: { count: 2, onclick: () => {} } }).body);

		expect(html).toContain('Filter · 2');
		expect(html).toMatch(/class="[^"]*\bsel\b/);
	});

	it('wears the shared squared-off button shape whether on or off', () => {
		const off = text(render(FilterButton, { props: { count: 0, onclick: () => {} } }).body);
		const on = text(render(FilterButton, { props: { count: 2, onclick: () => {} } }).body);

		expect(off).toMatch(/<button[^>]*class="[^"]*\bbtn\b/);
		expect(on).toMatch(/<button[^>]*class="[^"]*\bbtn\b/);
	});
});

describe('FilterSheet', () => {
	const filter: RecipeFilter = { ...EMPTY_FILTER, ingredients: [2], tags: ['sour'] };
	const html = text(render(FilterSheet, { props: { open: true, filter, sections, count: 3 } }).body);

	it('has a house-favorites toggle, family Tags and Ingredient sections in the fixed order', () => {
		expect(html).toContain('★ House favorites');
		const order = [
			'Family',
			'sour',
			'daisy',
			'highball',
			'old fashioned',
			'martini',
			'flip',
			'tiki',
			'sparkling',
			'spirit',
			'juice'
		].map((s) => html.indexOf(`>${s}<`));
		expect(order.every((at) => at >= 0)).toBe(true);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it('shows the number of matching Recipes on its close button', () => {
		expect(html).toContain('Show 3');
	});

	it('links each choice to the filter with it toggled', () => {
		expect(html).toContain('href="/?i=2&amp;i=1&amp;tag=sour"');
		expect(html).toContain('href="/?tag=sour"');
		expect(html).toContain('href="/?i=2"');
		expect(html).toContain('href="/?i=2&amp;tag=sour&amp;fav=1"');
	});

	it('keeps the search text in its links', () => {
		const searching = text(render(FilterSheet, { props: { open: true, filter: { ...filter, query: 'neg' }, sections, count: 1 } }).body);
		expect(searching).toContain('href="/?q=neg&amp;i=2&amp;i=1&amp;tag=sour"');
	});

	it('filters by the tiki and sparkling families', () => {
		expect(html).toContain('href="/?i=2&amp;tag=sour&amp;tag=tiki"');
		expect(html).toContain('href="/?i=2&amp;tag=sour&amp;tag=sparkling"');
	});

	it('marks an active tiki family chip', () => {
		const tiki = text(render(FilterSheet, { props: { open: true, filter: { ...EMPTY_FILTER, tags: ['tiki'] }, sections, count: 1 } }).body);
		expect(tiki).toMatch(/aria-current="true"[^>]*>\s*tiki/);
	});

	it('marks the active choices', () => {
		expect(html).toMatch(/aria-current="true"[^>]*>\s*white rum/);
		expect(html).toMatch(/aria-current="true"[^>]*>\s*sour/);
		expect(html).not.toMatch(/aria-current="true"[^>]*>\s*rum/);
	});
});

describe('ActiveFilters', () => {
	it('renders nothing when no filter is on', () => {
		expect(text(render(ActiveFilters, { props: { filter: EMPTY_FILTER, sections } }).body).trim()).toBe('');
	});

	it('shows a removable chip per filter, and Clear all', () => {
		const filter: RecipeFilter = { ...EMPTY_FILTER, ingredients: [3], tags: ['sour'], favorites: true };
		const html = text(render(ActiveFilters, { props: { filter, sections } }).body);

		expect(html).toMatch(/href="\/\?tag=sour&amp;fav=1"[^>]*>\s*lime juice ✕/);
		expect(html).toMatch(/href="\/\?i=3&amp;fav=1"[^>]*>\s*#sour ✕/);
		expect(html).toMatch(/href="\/\?i=3&amp;tag=sour"[^>]*>\s*★ favorites ✕/);
		expect(html).toMatch(/href="\/"[^>]*>\s*Clear all/);
	});

	it('keeps the search text when removing one filter, and clears it with Clear all', () => {
		const filter: RecipeFilter = { query: 'neg', ingredients: [3], tags: [], favorites: false };
		const html = text(render(ActiveFilters, { props: { filter, sections } }).body);

		expect(html).toMatch(/href="\/\?q=neg"[^>]*>\s*lime juice ✕/);
		expect(html).toMatch(/href="\/"[^>]*>\s*Clear all/);
	});
});
