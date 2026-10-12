import { describe, expect, it } from 'vitest';
import {
	activeFilterCount,
	browseHref,
	EMPTY_FILTER,
	filterSearch,
	isFilterActive,
	parseFilter,
	recipeHref,
	toggleFavorites,
	toggleIngredient,
	toggleTag
} from './filter';

describe('parseFilter', () => {
	it('reads Ingredients, Tags and favorites from the query', () => {
		expect(parseFilter(new URLSearchParams('i=3&i=12&tag=sour&tag=old+fashioned&fav=1'))).toEqual({
			ingredients: [3, 12],
			tags: ['sour', 'old fashioned'],
			favorites: true
		});
	});

	it('is empty for an empty query', () => {
		expect(parseFilter(new URLSearchParams())).toEqual(EMPTY_FILTER);
	});

	it('ignores malformed and repeated values', () => {
		expect(parseFilter(new URLSearchParams('i=abc&i=-1&i=1.5&i=4&i=4&tag=&tag=sour&tag=sour&fav=yes'))).toEqual({
			ingredients: [4],
			tags: ['sour'],
			favorites: false
		});
	});
});

describe('filterSearch', () => {
	it('round-trips through parseFilter', () => {
		const filter = { ingredients: [7, 2], tags: ['old fashioned'], favorites: true };
		const search = filterSearch(filter);

		expect(search).toBe('?i=7&i=2&tag=old+fashioned&fav=1');
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
		const filter = { ingredients: [1, 2], tags: ['sour'], favorites: true };
		expect(activeFilterCount(filter)).toBe(4);
		expect(isFilterActive(filter)).toBe(true);
	});
});

describe('links', () => {
	it('links to the Recipe list with the filter', () => {
		expect(browseHref(EMPTY_FILTER)).toBe('/');
		expect(browseHref({ ingredients: [3], tags: ['sour'], favorites: false })).toBe('/?i=3&tag=sour');
	});

	it('links to a Recipe page with only the picked Ingredients, for highlighting', () => {
		expect(recipeHref(9, { ingredients: [3, 4], tags: ['sour'], favorites: true })).toBe('/recipes/9?i=3&i=4');
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

	it('flips favorites', () => {
		expect(toggleFavorites(EMPTY_FILTER).favorites).toBe(true);
		expect(toggleFavorites(toggleFavorites(EMPTY_FILTER))).toEqual(EMPTY_FILTER);
	});
});
