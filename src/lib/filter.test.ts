import { describe, expect, it } from 'vitest';
import {
	activeFilterCount,
	browseHref,
	EMPTY_FILTER,
	filterSearch,
	isFilterActive,
	isNarrowed,
	isSearching,
	parseFilter,
	recipeHref,
	tagBrowseHref,
	toggleFavorites,
	toggleIngredient,
	toggleTag
} from './filter';

describe('parseFilter', () => {
	it('reads search text, Ingredients, Tags and favorites from the query', () => {
		expect(parseFilter(new URLSearchParams('q=daiq&i=3&i=12&tag=sour&tag=old+fashioned&fav=1'))).toEqual({
			query: 'daiq',
			ingredients: [3, 12],
			tags: ['sour', 'old fashioned'],
			favorites: true
		});
	});

	it('keeps search text as typed, up to 100 characters', () => {
		expect(parseFilter(new URLSearchParams('q=corpse+')).query).toBe('corpse ');
		expect(parseFilter(new URLSearchParams(`q=${'a'.repeat(150)}`)).query).toHaveLength(100);
	});

	it('is empty for an empty query', () => {
		expect(parseFilter(new URLSearchParams())).toEqual(EMPTY_FILTER);
	});

	it('ignores malformed and repeated values', () => {
		expect(parseFilter(new URLSearchParams('i=abc&i=-1&i=1.5&i=4&i=4&tag=&tag=sour&tag=sour&fav=yes'))).toEqual({
			query: '',
			ingredients: [4],
			tags: ['sour'],
			favorites: false
		});
	});
});

describe('filterSearch', () => {
	it('round-trips through parseFilter', () => {
		const filter = { query: 'rev', ingredients: [7, 2], tags: ['old fashioned'], favorites: true };
		const search = filterSearch(filter);

		expect(search).toBe('?q=rev&i=7&i=2&tag=old+fashioned&fav=1');
		expect(parseFilter(new URLSearchParams(search))).toEqual(filter);
	});

	it('is an empty string when no filter is on', () => {
		expect(filterSearch(EMPTY_FILTER)).toBe('');
	});
});

describe('active filters', () => {
	it('counts each Ingredient, Tag and the favorites toggle', () => {
		expect(activeFilterCount(EMPTY_FILTER)).toBe(0);
		expect(isFilterActive(EMPTY_FILTER)).toBe(false);
		const filter = { ...EMPTY_FILTER, ingredients: [1, 2], tags: ['sour'], favorites: true };
		expect(activeFilterCount(filter)).toBe(4);
		expect(isFilterActive(filter)).toBe(true);
	});

	it('does not count search text as a filter', () => {
		const searching = { ...EMPTY_FILTER, query: 'daiq' };
		expect(activeFilterCount(searching)).toBe(0);
		expect(isFilterActive(searching)).toBe(false);
	});

	it('knows when there is search text', () => {
		expect(isSearching({ ...EMPTY_FILTER, query: '  ' })).toBe(false);
		expect(isSearching({ ...EMPTY_FILTER, query: 'neg' })).toBe(true);
	});

	it('knows when anything narrows the Recipes, search text included', () => {
		expect(isNarrowed(EMPTY_FILTER)).toBe(false);
		expect(isNarrowed({ ...EMPTY_FILTER, query: ' ' })).toBe(false);
		expect(isNarrowed({ ...EMPTY_FILTER, query: 'daiq' })).toBe(true);
		expect(isNarrowed({ ...EMPTY_FILTER, favorites: true })).toBe(true);
	});
});

describe('links', () => {
	it('links to the Recipe list with the filter', () => {
		expect(browseHref(EMPTY_FILTER)).toBe('/');
		expect(browseHref({ ...EMPTY_FILTER, ingredients: [3], tags: ['sour'] })).toBe('/?i=3&tag=sour');
	});

	it('links to the Recipe list with a single Tag applied', () => {
		expect(tagBrowseHref('sour')).toBe('/?tag=sour');
		expect(tagBrowseHref('old fashioned')).toBe('/?tag=old+fashioned');
	});

	it('links to a Recipe page with only the picked Ingredients, for highlighting', () => {
		expect(recipeHref(9, { query: 'daiq', ingredients: [3, 4], tags: ['sour'], favorites: true })).toBe('/recipes/9?i=3&i=4');
		expect(recipeHref(9, EMPTY_FILTER)).toBe('/recipes/9');
	});
});

describe('toggling', () => {
	it('adds and removes an Ingredient', () => {
		const on = toggleIngredient(EMPTY_FILTER, 5);
		expect(on.ingredients).toEqual([5]);
		expect(toggleIngredient(on, 5)).toEqual(EMPTY_FILTER);
	});

	it('adds and removes a Tag', () => {
		const on = toggleTag(EMPTY_FILTER, 'sour');
		expect(on.tags).toEqual(['sour']);
		expect(toggleTag(on, 'sour')).toEqual(EMPTY_FILTER);
	});

	it('keeps search text when toggling', () => {
		const searching = { ...EMPTY_FILTER, query: 'neg' };
		expect(toggleIngredient(searching, 5).query).toBe('neg');
		expect(toggleTag(searching, 'sour').query).toBe('neg');
		expect(toggleFavorites(searching).query).toBe('neg');
	});

	it('flips favorites', () => {
		expect(toggleFavorites(EMPTY_FILTER).favorites).toBe(true);
		expect(toggleFavorites(toggleFavorites(EMPTY_FILTER))).toEqual(EMPTY_FILTER);
	});
});
