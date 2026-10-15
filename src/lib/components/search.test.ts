import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, type RecipeFilter } from '#lib/filter.ts';
import type { Suggestion } from '#lib/search.ts';
import SearchBox from './SearchBox.svelte';

const text = (html: string) => html.replace(/<!--[^>]*-->/g, '').replace(/\s+/g, ' ');

describe('SearchBox', () => {
	const filter: RecipeFilter = { query: 'camp', ingredients: [3], tags: ['tiki'], favorites: true };
	const suggestions: Suggestion[] = [
		{ kind: 'ingredient', id: 1, name: 'Campari' },
		{ kind: 'tag', name: 'camp classics' }
	];
	const html = text(render(SearchBox, { props: { filter, suggestions } }).body);

	it('shows the search text in a search box', () => {
		expect(html).toMatch(/<input[^>]*type="search"/);
		expect(html).toMatch(/<input[^>]*name="q"/);
		expect(html).toMatch(/<input[^>]*value="camp"/);
	});

	it('keeps the filter when the search is submitted without JavaScript', () => {
		expect(html).toMatch(/<form[^>]*method="get"[^>]*action="\/"/);
		expect(html).toMatch(/name="i" value="3"/);
		expect(html).toMatch(/name="tag" value="tiki"/);
		expect(html).toMatch(/name="fav" value="1"/);
	});

	it('suggests Ingredients and Tags that add to the filter and clear the search text', () => {
		expect(html).toMatch(/href="\/\?i=3&amp;i=1&amp;tag=tiki&amp;fav=1"[^>]*>\s*Filter by Campari/);
		expect(html).toMatch(/href="\/\?i=3&amp;tag=tiki&amp;tag=camp\+classics&amp;fav=1"[^>]*>\s*Tag: camp classics/);
	});

	it('asks crawlers not to follow its suggestions', () => {
		const links = html.match(/<a [^>]*class="chip sugg[^"]*"[^>]*>/g) ?? [];
		expect(links).toHaveLength(2);
		expect(links.every((a) => a.includes('rel="nofollow"'))).toBe(true);
	});

	it('shows no suggestions when there are none', () => {
		const empty = text(render(SearchBox, { props: { filter: EMPTY_FILTER, suggestions: [] } }).body);
		expect(empty).not.toContain('sugg');
		expect(empty).not.toMatch(/name="(i|tag|fav)"/);
	});
});
