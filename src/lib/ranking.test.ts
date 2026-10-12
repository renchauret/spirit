import { describe, expect, it } from 'vitest';
import type { Unit } from './domain';
import { EMPTY_FILTER, type RecipeFilter } from './filter';
import { filterAndRank, lineMl, matchedLineIndexes, type CatalogEntry, type RankableRecipe } from './ranking';

const RUM = 1;
const WHITE_RUM = 2;
const AGED_RUM = 3;
const SMITH_AND_CROSS = 4;
const GIN = 5;
const LIME = 6;
const MINT = 7;
const SODA = 8;

const catalog: CatalogEntry[] = [
	{ id: RUM, parentId: null },
	{ id: WHITE_RUM, parentId: RUM },
	{ id: AGED_RUM, parentId: RUM },
	{ id: SMITH_AND_CROSS, parentId: AGED_RUM },
	{ id: GIN, parentId: null },
	{ id: LIME, parentId: null },
	{ id: MINT, parentId: null },
	{ id: SODA, parentId: null }
];

function line(ingredientId: number, amountMin: number | null, unit: Unit, amountMax: number | null = null) {
	return { ingredientId, amountMin, amountMax, unit };
}

function recipe(name: string, lines: RankableRecipe['lines'], extra: Partial<RankableRecipe> = {}): RankableRecipe {
	return { name, favorite: false, tags: [], lines, ...extra };
}

function names(recipes: RankableRecipe[], filter: Partial<RecipeFilter>) {
	return filterAndRank(recipes, { ...EMPTY_FILTER, ...filter }, catalog).map((r) => r.name);
}

const daiquiri = recipe('Daiquiri', [line(LIME, 0.75, 'oz'), line(WHITE_RUM, 2, 'oz')], { favorite: true, tags: ['sour'] });
const mojito = recipe('Mojito', [line(MINT, 8, 'leaf'), line(LIME, 1, 'oz'), line(WHITE_RUM, 2, 'oz'), line(SODA, null, 'top')], {
	tags: ['highball']
});
const junglebird = recipe('Jungle Bird', [line(SMITH_AND_CROSS, 1.5, 'oz'), line(LIME, 0.5, 'oz')]);
const gimlet = recipe('Gimlet', [line(GIN, 2, 'oz'), line(LIME, 0.75, 'oz')], { favorite: true, tags: ['sour'] });
const rumOld = recipe('Rum Old Fashioned', [line(RUM, 2, 'oz')], { tags: ['old fashioned'] });
const all = [daiquiri, mojito, junglebird, gimlet, rumOld];

describe('filterAndRank', () => {
	it('with nothing active, lists favorites first, then A–Z', () => {
		expect(names(all, {})).toEqual(['Daiquiri', 'Gimlet', 'Jungle Bird', 'Mojito', 'Rum Old Fashioned']);
	});

	it('with several Ingredients, keeps only Recipes containing all of them', () => {
		expect(names(all, { ingredients: [LIME, MINT] })).toEqual(['Mojito']);
		expect(names(all, { ingredients: [GIN, WHITE_RUM] })).toEqual([]);
	});

	it('matches every descendant of a Parent Ingredient, at any depth', () => {
		expect(names(all, { ingredients: [RUM] }).sort()).toEqual(['Daiquiri', 'Jungle Bird', 'Mojito', 'Rum Old Fashioned']);
		expect(names(all, { ingredients: [AGED_RUM] })).toEqual(['Jungle Bird']);
	});

	it('never matches a child Ingredient to its parent', () => {
		expect(names(all, { ingredients: [WHITE_RUM] }).sort()).toEqual(['Daiquiri', 'Mojito']);
	});

	it('counts every Recipe line, whatever its unit', () => {
		expect(names(all, { ingredients: [SODA] })).toEqual(['Mojito']);
		expect(names(all, { ingredients: [MINT] })).toEqual(['Mojito']);
	});

	it('combines Ingredients, Tags and favorites with AND', () => {
		expect(names(all, { ingredients: [LIME], tags: ['sour'] })).toEqual(['Daiquiri', 'Gimlet']);
		expect(names(all, { ingredients: [LIME], tags: ['sour'], favorites: true })).toEqual(['Daiquiri', 'Gimlet']);
		expect(names(all, { ingredients: [RUM], favorites: true })).toEqual(['Daiquiri']);
		expect(names(all, { tags: ['sour', 'highball'] })).toEqual([]);
		expect(names(all, { tags: ['highball'] })).toEqual(['Mojito']);
	});

	it('with favorites only, narrows without reordering', () => {
		expect(names(all, { favorites: true })).toEqual(['Daiquiri', 'Gimlet']);
	});

	it('with an Ingredient filter, ranks by total ml of the picked Ingredients and their descendants', () => {
		expect(names(all, { ingredients: [LIME] })).toEqual(['Mojito', 'Daiquiri', 'Gimlet', 'Jungle Bird']);
		expect(names(all, { ingredients: [RUM, LIME] })).toEqual(['Mojito', 'Daiquiri', 'Jungle Bird']);
	});

	it('scores unmeasured units 0, so they sort below any measured amount', () => {
		const tiny = recipe('Tiny', [line(SODA, 1, 'barspoon')]);
		expect(names([mojito, tiny], { ingredients: [SODA] })).toEqual(['Tiny', 'Mojito']);
	});

	it('breaks score ties with favorites first, then A–Z', () => {
		const a = recipe('apple', [line(GIN, 1, 'oz')]);
		const b = recipe('Banana', [line(GIN, 30, 'ml')]);
		const c = recipe('Cherry', [line(GIN, 3, 'cl')], { favorite: true });
		expect(names([b, a, c], { ingredients: [GIN] })).toEqual(['Cherry', 'apple', 'Banana']);
	});

	it('counts a line once even when two picked Ingredients both match it', () => {
		const single = recipe('Single', [line(WHITE_RUM, 2, 'oz')]);
		const double = recipe('Double', [line(WHITE_RUM, 1, 'oz'), line(RUM, 1.5, 'oz')]);
		expect(names([single, double], { ingredients: [RUM, WHITE_RUM] })).toEqual(['Double', 'Single']);
	});

	it('does not reorder its input', () => {
		const input = [mojito, daiquiri];
		filterAndRank(input, EMPTY_FILTER, catalog);
		expect(input).toEqual([mojito, daiquiri]);
	});
});

describe('lineMl', () => {
	it.each([
		[line(GIN, 2, 'oz'), 60],
		[line(GIN, 45, 'ml'), 45],
		[line(GIN, 3, 'cl'), 30],
		[line(GIN, 0.5, 'cup'), 120],
		[line(GIN, 1, 'tbsp'), 15],
		[line(GIN, 1, 'tsp'), 5],
		[line(GIN, 2, 'barspoon'), 10]
	])('converts measured units to ml', (l, ml) => {
		expect(lineMl(l)).toBe(ml);
	});

	it.each(['dash', 'drop', 'slice', 'wedge', 'leaf', 'sprig', 'whole'] as const)('scores %s as 0', (unit) => {
		expect(lineMl(line(GIN, 3, unit))).toBe(0);
	});

	it('scores lines without an amount as 0', () => {
		expect(lineMl(line(SODA, null, 'top'))).toBe(0);
	});

	it('uses the low end of a range', () => {
		expect(lineMl(line(GIN, 1, 'oz', 2))).toBe(30);
	});
});

describe('matchedLineIndexes', () => {
	it('lists the lines that match a picked Ingredient or its descendants', () => {
		expect(matchedLineIndexes(mojito.lines, [RUM, MINT], catalog)).toEqual([0, 2]);
	});

	it('is empty without an Ingredient filter', () => {
		expect(matchedLineIndexes(mojito.lines, [], catalog)).toEqual([]);
	});
});
