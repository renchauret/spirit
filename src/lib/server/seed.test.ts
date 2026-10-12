import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getRecipe, listIngredientOptions, listRecipeCards } from './recipes';
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
				subtitle: 'white rum · sour',
				photo: null
			},
			{
				id: expect.any(Number),
				name: 'Mojito',
				favorite: false,
				family: 'highball',
				glass: 'collins',
				subtitle: 'white rum · highball',
				photo: null
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
			photo: null,
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
			].map((line) => ({ ingredientId: expect.any(Number), ...line }))
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
});

describe('additive seed loading', () => {
	let local: LocalD1;

	const additive: Seed = parseSeed({
		ingredients: [
			{ name: 'WHITE RUM', type: 'pantry' },
			{ name: 'lime juice', type: 'juice' },
			{ name: 'mezcal', type: 'spirit' },
			{ name: 'espadín mezcal', parent: 'mezcal' }
		],
		recipes: [
			{
				name: 'Naked and Famous',
				tags: ['sour'],
				lines: [
					{ ingredient: 'WHITE RUM', amount: 1, unit: 'oz' },
					{ ingredient: 'lime juice', amount: 0.5, unit: 'oz' },
					{ ingredient: 'espadín mezcal', amount: 1, unit: 'oz' }
				]
			}
		]
	});

	beforeEach(async () => {
		local = await createLocalD1();
		await load(local, seedStatements(seed));
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('reuses an existing Ingredient, ignoring case, and keeps its type and parent', async () => {
		await load(local, seedStatements(additive, { additive: true }));

		const options = await listIngredientOptions(local.db);
		expect(options.filter((i) => i.name.toLowerCase() === 'white rum')).toEqual([
			{ id: expect.any(Number), name: 'white rum', parent: 'rum', type: 'spirit' }
		]);
	});

	it('inserts new Ingredients with any new Parent Ingredients they need', async () => {
		await load(local, seedStatements(additive, { additive: true }));

		const options = await listIngredientOptions(local.db);
		expect(options.find((i) => i.name === 'mezcal')).toMatchObject({ type: 'spirit', parent: null });
		expect(options.find((i) => i.name === 'espadín mezcal')).toMatchObject({ type: 'spirit', parent: 'mezcal' });
	});

	it('reuses an existing Tag instead of duplicating it', async () => {
		await load(local, seedStatements(additive, { additive: true }));

		const daiquiri = (await listRecipeCards(local.db)).find((c) => c.name === 'Daiquiri')!;
		const added = (await listRecipeCards(local.db)).find((c) => c.name === 'Naked and Famous')!;
		expect((await getRecipe(local.db, daiquiri.id))!.tags).toEqual(['sour']);
		expect((await getRecipe(local.db, added.id))!.tags).toEqual(['sour']);
	});

	it('adds new Recipes alongside the existing ones', async () => {
		const before = await listRecipeCards(local.db);
		await load(local, seedStatements(additive, { additive: true }));

		const cards = await listRecipeCards(local.db);
		expect(cards).toHaveLength(before.length + 1);
		const added = cards.find((c) => c.name === 'Naked and Famous')!;
		expect(await getRecipe(local.db, added.id)).toMatchObject({
			name: 'Naked and Famous',
			tags: ['sour'],
			lines: [
				{ ingredient: 'white rum', amountMin: 1, unit: 'oz' },
				{ ingredient: 'lime juice', amountMin: 0.5, unit: 'oz' },
				{ ingredient: 'espadín mezcal', amountMin: 1, unit: 'oz' }
			].map((line) => ({ ingredientId: expect.any(Number), amountMax: null, note: null, ...line }))
		});
	});

	it('refuses the whole load and writes nothing when a seeded Recipe name already exists', async () => {
		const before = await listRecipeCards(local.db);
		const beforeIngredients = await listIngredientOptions(local.db);
		const clash: Seed = parseSeed({
			ingredients: [
				{ name: 'mezcal', type: 'spirit' },
				{ name: 'lime juice', type: 'juice' }
			],
			recipes: [
				{ name: 'Naked and Famous', lines: [{ ingredient: 'mezcal', amount: 1, unit: 'oz' }] },
				{ name: 'mojito', lines: [{ ingredient: 'lime juice', amount: 1, unit: 'oz' }] }
			]
		});

		await expect(load(local, seedStatements(clash, { additive: true }))).rejects.toThrow();

		expect(await listRecipeCards(local.db)).toEqual(before);
		expect(await listIngredientOptions(local.db)).toEqual(beforeIngredients);
	});

	it('leaves pre-existing Recipes untouched', async () => {
		const mojito = (await listRecipeCards(local.db)).find((c) => c.name === 'Mojito')!;
		const before = await getRecipe(local.db, mojito.id);

		await load(local, seedStatements(additive, { additive: true }));

		expect(await getRecipe(local.db, mojito.id)).toEqual(before);
	});

	it('refuses a seed with duplicate Recipe names, but only in additive mode', () => {
		const duplicates: Seed = parseSeed({
			ingredients: [{ name: 'mezcal', type: 'spirit' }],
			recipes: [
				{ name: 'Naked and Famous', lines: [{ ingredient: 'mezcal', amount: 1, unit: 'oz' }] },
				{ name: 'naked and famous', lines: [{ ingredient: 'mezcal', amount: 1, unit: 'oz' }] }
			]
		});

		expect(() => seedStatements(duplicates, { additive: true })).toThrow();
		expect(() => seedStatements(duplicates)).not.toThrow();
	});

	it('refuses to replace and add at the same time', () => {
		expect(() => seedStatements(seed, { replace: true, additive: true })).toThrow();
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
