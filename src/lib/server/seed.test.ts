import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isFamilyTag } from '../domain';
import { getRecipe, listRecipeCards } from './recipes';
import { parseSeed, seedStatements, type Seed } from './seed';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

function readSeed(path: string): Seed {
	return parseSeed(JSON.parse(readFileSync(path, 'utf8')));
}

const seed: Seed = parseSeed({
	ingredients: [
		{ name: 'rum', type: 'spirit' },
		{ name: 'white rum', parent: 'rum' },
		{ name: 'lime juice', type: 'juice' },
		{ name: "Bar's simple syrup", type: 'syrup' },
		{ name: 'mint', type: 'fresh' },
		{ name: 'club soda', type: 'mixer' }
	],
	recipes: [
		{
			name: 'Mojito',
			tags: ['highball', 'summer'],
			method: ['Muddle the mint with the syrup.', 'Add the rest and stir with crushed ice.'],
			garnish: 'mint sprig',
			iceServe: 'crushed ice',
			lines: [
				{ ingredient: 'mint', amount: [6, 8], unit: 'leaf' },
				{ ingredient: "Bar's simple syrup", amount: 0.75, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 1, unit: 'oz', note: 'fresh' },
				{ ingredient: 'white rum', amount: 2, unit: 'oz' },
				{ ingredient: 'club soda', unit: 'top' }
			]
		},
		{
			name: 'Daiquiri',
			favorite: true,
			tags: ['sour'],
			glass: 'coupe',
			method: ['Shake with ice and fine-strain.'],
			description: "Hemingway's choice, more or less.",
			source: 'Classic',
			lines: [
				{ ingredient: 'white rum', amount: 2, unit: 'oz' },
				{ ingredient: 'lime juice', amount: 0.75, unit: 'oz' },
				{ ingredient: "Bar's simple syrup", amount: 0.5, unit: 'oz' }
			]
		}
	]
});

async function load(local: LocalD1, statements: string[]) {
	await local.d1.batch(statements.map((s) => local.d1.prepare(s)));
}

describe('seed loader', () => {
	let local: LocalD1;

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('loads Recipes that Visitors can browse, favorites first', async () => {
		await load(local, seedStatements(seed));

		expect(await listRecipeCards(local.db)).toEqual([
			{
				id: expect.any(Number),
				name: 'Daiquiri',
				favorite: true,
				family: 'sour',
				glass: 'coupe',
				subtitle: 'white rum · sour'
			},
			{
				id: expect.any(Number),
				name: 'Mojito',
				favorite: false,
				family: 'highball',
				glass: 'collins',
				subtitle: 'white rum · highball'
			}
		]);
	});

	it('loads every field of a Recipe in order', async () => {
		await load(local, seedStatements(seed));
		const [, mojito] = await listRecipeCards(local.db);

		expect(await getRecipe(local.db, mojito.id)).toEqual({
			id: mojito.id,
			name: 'Mojito',
			favorite: false,
			tags: ['highball', 'summer'],
			family: 'highball',
			glass: null,
			placeholderGlass: 'collins',
			method: ['Muddle the mint with the syrup.', 'Add the rest and stir with crushed ice.'],
			garnish: 'mint sprig',
			iceServe: 'crushed ice',
			description: null,
			source: null,
			lines: [
				{ ingredient: 'mint', amountMin: 6, amountMax: 8, unit: 'leaf', note: null },
				{ ingredient: "Bar's simple syrup", amountMin: 0.75, amountMax: null, unit: 'oz', note: null },
				{ ingredient: 'lime juice', amountMin: 1, amountMax: null, unit: 'oz', note: 'fresh' },
				{ ingredient: 'white rum', amountMin: 2, amountMax: null, unit: 'oz', note: null },
				{ ingredient: 'club soda', amountMin: null, amountMax: null, unit: 'top', note: null }
			]
		});
	});

	it('gives a child Ingredient its parent type unless one is set', async () => {
		await load(local, seedStatements(seed));

		const { results } = await local.d1
			.prepare("select type, parent_id from ingredient where name = 'white rum'")
			.all<{ type: string; parent_id: number }>();
		expect(results).toEqual([{ type: 'spirit', parent_id: expect.any(Number) }]);
	});

	it('refuses to load over existing Recipes unless replacing', async () => {
		await load(local, seedStatements(seed));

		await expect(load(local, seedStatements(seed))).rejects.toThrow();
		await load(local, seedStatements(seed, { replace: true }));
		expect(await listRecipeCards(local.db)).toHaveLength(2);
	});

	it('loads the bundled fixture', async () => {
		const fixture = readSeed('seed/fixture.json');
		await load(local, seedStatements(fixture));

		expect(await listRecipeCards(local.db)).toHaveLength(fixture.recipes.length);
	});

	it('loads the Cocktails doc import over existing data', async () => {
		await load(local, seedStatements(seed));
		const cocktails = readSeed('seed/cocktails.json');
		await load(local, seedStatements(cocktails, { replace: true }));

		const cards = await listRecipeCards(local.db);
		expect(cards).toHaveLength(cocktails.recipes.length);
		expect(cards.find((c) => c.name === 'Daiquiri')).toMatchObject({ family: 'sour', subtitle: 'white rum · sour' });
	});
});

describe('the Cocktails doc import', () => {
	const cocktails = readSeed('seed/cocktails.json');
	const recipe = (name: string) => cocktails.recipes.find((r) => r.name === name)!;
	const line = (recipeName: string, ingredient: string) =>
		recipe(recipeName).lines.find((l) => l.ingredient === ingredient)!;

	it('gives every Recipe exactly one family Tag', () => {
		for (const r of cocktails.recipes) {
			expect(r.tags.filter(isFamilyTag), r.name).toHaveLength(1);
		}
	});

	it('names every Recipe once', () => {
		const names = cocktails.recipes.map((r) => r.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('uses every catalog Ingredient in a Recipe line or as a Parent Ingredient', () => {
		const used = new Set(cocktails.recipes.flatMap((r) => r.lines.map((l) => l.ingredient)));
		const parents = new Set(cocktails.ingredients.map((i) => i.parent));
		const unused = cocktails.ingredients.filter((i) => !used.has(i.name) && !parents.has(i.name));
		expect(unused).toEqual([]);
	});

	it('turns Gin/Vodka into gin, and Alcohol and Whisk(e)y into whiskey', () => {
		const names = cocktails.ingredients.map((i) => i.name.toLowerCase());
		expect(names).not.toContain('gin/vodka');
		expect(names).not.toContain('alcohol');
		expect(names).not.toContain('whisk(e)y');
		expect(line('Moscow Mule', 'gin')).toMatchObject({ amountMin: 2, unit: 'oz' });
		expect(line('Eggnog', 'whiskey')).toMatchObject({ amountMin: 2, unit: 'oz' });
		expect(line('Old Fashioned', 'whiskey')).toMatchObject({ amountMin: 2, unit: 'oz' });
	});

	it('turns parts into 3 oz each', () => {
		expect(recipe('Mimosa').lines.map((l) => [l.ingredient, l.amountMin, l.unit])).toEqual([
			['orange juice', 3, 'oz'],
			['Champagne', 3, 'oz']
		]);
		expect(line('Poinsettia', 'Champagne')).toMatchObject({ amountMin: 3, unit: 'oz' });
	});

	it('turns a pinch into to taste with the note pinch', () => {
		expect(line('How to Drink Spiked Eggnog', 'salt')).toMatchObject({
			amountMin: null,
			unit: 'to taste',
			note: 'pinch'
		});
	});

	it('counts sugar cubes as whole', () => {
		expect(line('Old Fashioned', 'sugar cube')).toMatchObject({ amountMin: 1, unit: 'whole' });
		expect(line('Sazerac', 'sugar cube')).toMatchObject({ amountMin: 1, unit: 'whole' });
	});

	it('keeps the amount of a float and notes it', () => {
		expect(line('Penicillin', 'Islay single malt Scotch')).toMatchObject({
			amountMin: 0.25,
			unit: 'oz',
			note: 'float'
		});
	});

	it('keeps the amount of a measured top and notes it', () => {
		expect(line('Moscow Mule', 'ginger beer')).toMatchObject({ amountMin: 4, unit: 'oz', note: 'top' });
		expect(line('Tom Collins', 'club soda')).toMatchObject({ amountMin: null, unit: 'top' });
	});

	it('has no optional Recipe lines', () => {
		for (const r of cocktails.recipes) {
			for (const l of r.lines) expect(l.note ?? '', r.name).not.toMatch(/option/i);
		}
		expect(recipe('Mint Julep').lines.map((l) => l.ingredient)).toEqual(['mint', 'simple syrup', 'bourbon']);
	});
});

describe('parseSeed', () => {
	const valid = {
		ingredients: [{ name: 'gin', type: 'spirit' }],
		recipes: [{ name: 'Gin', lines: [{ ingredient: 'gin', amount: 2, unit: 'oz' }] }]
	};

	it('accepts a minimal seed', () => {
		expect(parseSeed(valid).recipes[0].name).toBe('Gin');
	});

	it.each(['top', 'rinse', 'to taste'])('accepts an empty amount for %s', (unit) => {
		const seed = parseSeed({ ...valid, recipes: [{ name: 'Gin', lines: [{ ingredient: 'gin', unit }] }] });
		expect(seed.recipes[0].lines[0]).toMatchObject({ amountMin: null, amountMax: null, unit });
	});

	it.each([
		['an unknown Ingredient type', { ...valid, ingredients: [{ name: 'gin', type: 'booze' }] }],
		['a missing Ingredient type', { ...valid, ingredients: [{ name: 'gin' }] }],
		['an unknown Parent Ingredient', { ...valid, ingredients: [{ name: 'gin', parent: 'juniper' }] }],
		['a Parent Ingredient cycle', { ...valid, ingredients: [{ name: 'gin', parent: 'gin', type: 'spirit' }] }],
		['a duplicate Ingredient', { ...valid, ingredients: [...valid.ingredients, { name: 'gin', type: 'spirit' }] }],
		['an unknown unit', { ...valid, recipes: [{ name: 'Gin', lines: [{ ingredient: 'gin', amount: 2, unit: 'pint' }] }] }],
		['a Recipe line Ingredient not in the catalog', { ...valid, recipes: [{ name: 'Gin', lines: [{ ingredient: 'vodka', amount: 2, unit: 'oz' }] }] }],
		['a Recipe with no Recipe lines', { ...valid, recipes: [{ name: 'Gin', lines: [] }] }],
		['a misspelled Ingredient field', { ...valid, ingredients: [{ name: 'gin', typ: 'spirit', type: 'spirit' }] }],
		['a misspelled Recipe line field', { ...valid, recipes: [{ name: 'Gin', lines: [{ ingredient: 'gin', amout: 2, unit: 'oz' }] }] }],
		['an empty amount for a measured unit', { ...valid, recipes: [{ name: 'Gin', lines: [{ ingredient: 'gin', unit: 'oz' }] }] }],
		['an unknown glass', { ...valid, recipes: [{ ...valid.recipes[0], glass: 'mug' }] }],
		['Owner notes, which never belong in the public seed', { ...valid, recipes: [{ ...valid.recipes[0], ownerNotes: 'secret' }] }]
	])('rejects %s', (_, input) => {
		expect(() => parseSeed(input)).toThrow();
	});
});
