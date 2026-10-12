import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EMPTY_FILTER, type RecipeFilter } from '../filter';
import { ingredient, recipe } from './db/schema';
import { browseRecipes, getRecipe, listFilterSections, listRecipeCards, matchedLines } from './recipes';
import { parseSeed, seedStatements } from './seed';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

const seed = parseSeed({
	ingredients: [
		{ name: 'rum', type: 'spirit' },
		{ name: 'aged rum', parent: 'rum' },
		{ name: 'Smith & Cross', parent: 'aged rum' },
		{ name: 'white rum', parent: 'rum' },
		{ name: 'gin', type: 'spirit' },
		{ name: 'Campari', type: 'liqueur' },
		{ name: 'lime juice', type: 'juice' },
		{ name: 'simple syrup', type: 'syrup' },
		{ name: 'mint', type: 'fresh' },
		{ name: 'club soda', type: 'mixer' },
		{ name: 'egg white', type: 'dairy & egg' }
	],
	recipes: [
		{
			name: 'Daiquiri',
			favorite: true,
			tags: ['sour'],
			garnish: 'mint sprig',
			lines: [
				{ ingredient: 'white rum', amount: 2, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 0.75, unit: 'oz' },
				{ ingredient: 'simple syrup', amount: 0.5, unit: 'oz' }
			]
		},
		{
			name: 'Mojito',
			tags: ['highball'],
			lines: [
				{ ingredient: 'mint', amount: [6, 8], unit: 'leaf' },
				{ ingredient: 'simple syrup', amount: 0.75, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 1, unit: 'oz' },
				{ ingredient: 'white rum', amount: 2, unit: 'oz' },
				{ ingredient: 'club soda', unit: 'top' }
			]
		},
		{
			name: 'Jungle Bird',
			lines: [
				{ ingredient: 'Smith & Cross', amount: 1.5, unit: 'oz' },
				{ ingredient: 'Campari', amount: 0.75, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 0.5, unit: 'oz' },
				{ ingredient: 'simple syrup', amount: 0.5, unit: 'oz' }
			]
		},
		{
			name: 'Gimlet',
			favorite: true,
			tags: ['sour'],
			lines: [
				{ ingredient: 'gin', amount: 2, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 0.75, unit: 'oz' },
				{ ingredient: 'simple syrup', amount: 0.75, unit: 'oz' }
			]
		}
	]
});

describe('filtering Recipes in D1', () => {
	let local: LocalD1;
	let ids: Map<string, number>;

	beforeAll(async () => {
		local = await createLocalD1();
		await local.d1.batch(seedStatements(seed).map((s) => local.d1.prepare(s)));
		const rows = await local.db.select({ id: ingredient.id, name: ingredient.name }).from(ingredient);
		ids = new Map(rows.map((r) => [r.name, r.id]));
	});

	afterAll(async () => {
		await local.dispose();
	});

	function filter(names: string[], rest: Partial<RecipeFilter> = {}): RecipeFilter {
		return { ...EMPTY_FILTER, ingredients: names.map((n) => ids.get(n)!), ...rest };
	}

	async function names(f: RecipeFilter) {
		return (await listRecipeCards(local.db, f)).map((c) => c.name);
	}

	it('lists favorites first, then A–Z, without a filter', async () => {
		expect(await names(EMPTY_FILTER)).toEqual(['Daiquiri', 'Gimlet', 'Jungle Bird', 'Mojito']);
	});

	it('keeps Recipes containing all picked Ingredients, ranked by how much of them they contain', async () => {
		expect(await names(filter(['lime juice']))).toEqual(['Mojito', 'Daiquiri', 'Gimlet', 'Jungle Bird']);
		expect(await names(filter(['lime juice', 'mint']))).toEqual(['Mojito']);
	});

	it('matches descendants of a Parent Ingredient at any depth, never a child to its parent', async () => {
		expect(await names(filter(['rum']))).toEqual(['Daiquiri', 'Mojito', 'Jungle Bird']);
		expect(await names(filter(['aged rum']))).toEqual(['Jungle Bird']);
		expect(await names(filter(['Smith & Cross']))).toEqual(['Jungle Bird']);
	});

	it('never matches the Garnish', async () => {
		expect(await names(filter(['mint']))).toEqual(['Mojito']);
	});

	it('combines Ingredients, Tags and favorites with AND', async () => {
		expect(await names(filter(['lime juice'], { tags: ['sour'] }))).toEqual(['Daiquiri', 'Gimlet']);
		expect(await names(filter(['rum'], { favorites: true }))).toEqual(['Daiquiri']);
		expect(await names(filter([], { tags: ['highball'], favorites: true }))).toEqual([]);
	});

	it('never puts the score on a card', async () => {
		const [card] = await listRecipeCards(local.db, filter(['lime juice']));
		expect(Object.keys(card).sort()).toEqual(['family', 'favorite', 'glass', 'id', 'name', 'photo', 'subtitle']);
	});

	it('offers used Ingredients and their Parent Ingredients, sectioned by Ingredient type in the fixed order', async () => {
		const sections = await listFilterSections(local.db, []);

		expect(sections.map((s) => [s.type, s.ingredients.map((i) => i.name)])).toEqual([
			['spirit', ['aged rum', 'gin', 'rum', 'Smith & Cross', 'white rum']],
			['liqueur', ['Campari']],
			['syrup', ['simple syrup']],
			['juice', ['lime juice']],
			['mixer', ['club soda']],
			['fresh', ['mint']]
		]);
	});

	it('keeps offering every Parent Ingredient when one of their children is picked', async () => {
		const sections = await listFilterSections(local.db, [ids.get('Smith & Cross')!]);

		expect(sections[0].ingredients.map((i) => i.name)).toEqual(['aged rum', 'gin', 'rum', 'Smith & Cross', 'white rum']);
	});

	it('also offers an unused Ingredient that is already picked', async () => {
		const sections = await listFilterSections(local.db, [ids.get('egg white')!]);

		expect(sections.at(-1)).toEqual({ type: 'dairy & egg', ingredients: [{ id: ids.get('egg white'), name: 'egg white' }] });
	});

	it('browses with the filter, ignoring Ingredients that are not in the catalog', async () => {
		const browse = await browseRecipes(local.db, filter(['mint'], { ingredients: [ids.get('mint')!, 9999] }));

		expect(browse.filter.ingredients).toEqual([ids.get('mint')]);
		expect(browse.recipes.map((c) => c.name)).toEqual(['Mojito']);
		expect(browse.sections.map((s) => s.type)).toContain('fresh');
	});

	it('searches Recipe names, tolerating typos, together with the filter', async () => {
		expect(await names({ ...EMPTY_FILTER, query: 'daquiri' })).toEqual(['Daiquiri']);
		expect(await names({ ...EMPTY_FILTER, query: 'bird' })).toEqual(['Jungle Bird']);
		expect(await names(filter(['gin'], { query: 'daiq' }))).toEqual([]);
	});

	it('suggests matching Ingredients and Tags, leaving out what is picked', async () => {
		const camp = await browseRecipes(local.db, { ...EMPTY_FILTER, query: 'camp' });
		expect(camp.suggestions).toEqual([{ kind: 'ingredient', id: ids.get('Campari'), name: 'Campari' }]);
		expect(camp.recipes).toEqual([]);

		const sour = await browseRecipes(local.db, { ...EMPTY_FILTER, query: 'sour' });
		expect(sour.suggestions).toEqual([{ kind: 'tag', name: 'sour' }]);

		const picked = await browseRecipes(local.db, filter(['Campari'], { query: 'camp' }));
		expect(picked.suggestions).toEqual([]);
	});

	it('suggests only Ingredients the filter offers', async () => {
		expect((await browseRecipes(local.db, { ...EMPTY_FILTER, query: 'egg white' })).suggestions).toEqual([]);
	});

	it('lists the Recipe lines that match the picked Ingredients', async () => {
		const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Mojito'));

		expect(await matchedLines(local.db, id, [ids.get('rum')!, ids.get('mint')!])).toEqual([0, 3]);
		expect(await matchedLines(local.db, id, [])).toEqual([]);
	});

	it('numbers matched lines the way the Recipe page lists them', async () => {
		const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Jungle Bird'));
		const page = await getRecipe(local.db, id);
		const matched = await matchedLines(local.db, id, [ids.get('Campari')!, ids.get('lime juice')!]);

		expect(matched.map((i) => page!.lines[i].ingredient)).toEqual(['Campari', 'lime juice']);
	});
});
