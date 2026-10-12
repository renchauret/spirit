import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FAMILY_DEFAULT_GLASS, isFamilyTag } from '../domain';
import { foldName } from '../ingredient-search';
import { getRecipe, listIngredientOptions, listRecipeCards } from './recipes';
import { parseSeed, seedStatements, type Seed } from './seed';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

function readSeed(path: string): Seed {
	return parseSeed(JSON.parse(readFileSync(path, 'utf8')));
}

const fold = (name: string) => foldName(name).replace(/[^a-z0-9]/g, '');
const findRecipe = (seed: Seed, name: string) => seed.recipes.find((r) => r.name === name)!;
const findLine = (seed: Seed, recipeName: string, ingredient: string) =>
	findRecipe(seed, recipeName).lines.find((l) => l.ingredient === ingredient)!;

function expectEveryIngredientUsed(seed: Seed) {
	const used = new Set(seed.recipes.flatMap((r) => r.lines.map((l) => l.ingredient)));
	const parents = new Set(seed.ingredients.map((i) => i.parent));
	const unused = seed.ingredients.filter((i) => !used.has(i.name) && !parents.has(i.name));
	expect(unused).toEqual([]);
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

	it('loads the Cocktails doc import over existing data', async () => {
		await load(local, seedStatements(seed));
		const cocktails = readSeed('seed/cocktails.json');
		await load(local, seedStatements(cocktails, { replace: true }));

		const cards = await listRecipeCards(local.db);
		expect(cards).toHaveLength(cocktails.recipes.length);
		expect(cards.find((c) => c.name === 'Daiquiri')).toMatchObject({ family: 'sour', subtitle: 'white rum · sour' });
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

describe('the Cocktails doc import', () => {
	const cocktails = readSeed('seed/cocktails.json');
	const recipe = (name: string) => findRecipe(cocktails, name);
	const line = (recipeName: string, ingredient: string) => findLine(cocktails, recipeName, ingredient);

	it('gives every Recipe exactly one family Tag', () => {
		for (const r of cocktails.recipes) {
			expect(r.tags.filter(isFamilyTag), r.name).toHaveLength(1);
		}
	});

	it('files the re-tagged Recipes into the tiki and sparkling families', () => {
		expect(recipe('Mai Tai').tags).toContain('tiki');
		expect(recipe('Piña Colada').tags).toContain('tiki');
		expect(recipe('Mimosa').tags).toContain('sparkling');
		expect(recipe('Poinsettia').tags).toContain('sparkling');
	});

	it('names every Recipe once', () => {
		const names = cocktails.recipes.map((r) => r.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('uses every catalog Ingredient in a Recipe line or as a Parent Ingredient', () => {
		expectEveryIngredientUsed(cocktails);
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

	it('serves Moscow Mule in a copper mug and Mint Julep in a julep cup', () => {
		expect(recipe('Moscow Mule').glass).toBe('copper mug');
		expect(recipe('Mint Julep').glass).toBe('julep cup');
	});

	it('has no optional Recipe lines', () => {
		for (const r of cocktails.recipes) {
			for (const l of r.lines) expect(l.note ?? '', r.name).not.toMatch(/option/i);
		}
		expect(recipe('Mint Julep').lines.map((l) => l.ingredient)).toEqual(['mint', 'simple syrup', 'bourbon']);
	});
});

describe('the IBA import', () => {
	const iba = readSeed('seed/iba.json');
	const cocktails = readSeed('seed/cocktails.json');
	const recipe = (name: string) => findRecipe(iba, name);
	const line = (recipeName: string, ingredient: string) => findLine(iba, recipeName, ingredient);

	it('holds 64 uniquely named Recipes, each sourced from IBA and not a favorite', () => {
		expect(iba.recipes).toHaveLength(64);
		const names = iba.recipes.map((r) => fold(r.name));
		expect(new Set(names).size).toBe(names.length);
		for (const r of iba.recipes) {
			expect(r.source, r.name).toBe('IBA');
			expect(r.favorite, r.name).toBe(false);
		}
	});

	it('gives every Recipe at most one Tag, which is a Family Tag', () => {
		for (const r of iba.recipes) {
			expect(r.tags.length, r.name).toBeLessThanOrEqual(1);
			for (const tag of r.tags) expect(isFamilyTag(tag), `${r.name}: ${tag}`).toBe(true);
		}
	});

	it('collides with no existing Recipe name and leaves Dry Martini and John Collins out', () => {
		const taken = new Set([...cocktails.recipes.map((r) => fold(r.name)), 'spikedeggnog', 'drymartini', 'johncollins']);
		for (const r of iba.recipes) expect(taken.has(fold(r.name)), r.name).toBe(false);
	});

	it('keeps every oz amount a multiple of ¼', () => {
		for (const r of iba.recipes) {
			for (const l of r.lines) {
				if (l.unit !== 'oz') continue;
				expect((l.amountMin! * 4) % 1, `${r.name}: ${l.ingredient}`).toBe(0);
			}
		}
	});

	it('uses every catalog Ingredient in a Recipe line or as a Parent Ingredient', () => {
		expectEveryIngredientUsed(iba);
	});

	it('imports Bloody Mary, Irish Coffee and Sherry Cobbler without a Family Tag', () => {
		for (const name of ['Bloody Mary', 'Irish Coffee', 'Sherry Cobbler']) {
			expect(recipe(name).tags, name).toEqual([]);
		}
	});

	it('files the tiki and sparkling Recipes as asked', () => {
		const tiki = [
			'Zombie',
			'Jungle Bird',
			'Three Dots and a Dash',
			"Missionary's Downfall",
			'IBA Tiki',
			"Don's Special Daiquiri",
			'Chartreuse Swizzle',
			'Planters Punch',
			'Suffering Bastard',
			'Pisco Punch'
		];
		const sparkling = [
			'Bellini',
			'Kir',
			'Spritz',
			'Champagne Cocktail',
			'French 75',
			'Russian Spring Punch',
			'Old Cuban'
		];
		for (const name of tiki) expect(recipe(name).tags, name).toEqual(['tiki']);
		for (const name of sparkling) expect(recipe(name).tags, name).toEqual(['sparkling']);
	});

	it('converts 22.5 ml to ¾ oz', () => {
		expect(line('Jungle Bird', 'Campari')).toMatchObject({ amountMin: 0.75, unit: 'oz' });
		expect(line('Naked and Famous', 'mezcal')).toMatchObject({ amountMin: 0.75, unit: 'oz' });
	});

	it('marks an optional line in its note', () => {
		expect(line('Champagne Cocktail', 'Grand Marnier')).toMatchObject({
			amountMin: 1,
			unit: 'dash',
			note: 'few drops; optional'
		});
	});

	it('resolves an alternative to the first option with the rest in the note', () => {
		expect(line('New York Sour', 'rye whiskey')).toMatchObject({ amountMin: 2, unit: 'oz', note: 'or bourbon' });
		expect(line('New York Sour', 'red wine')).toMatchObject({ note: 'Shiraz or Malbec' });
	});

	it('sets the glass only when it differs from the family default', () => {
		for (const r of iba.recipes) {
			if (!r.tags.length) {
				expect(r.glass, `${r.name} has no family and needs a glass`).not.toBeNull();
				continue;
			}
			const family = r.tags[0];
			if (!isFamilyTag(family)) continue;
			if (r.glass !== null) expect(r.glass, r.name).not.toBe(FAMILY_DEFAULT_GLASS[family]);
		}
		expect(recipe('Bellini').glass).toBeNull();
		expect(recipe('Champagne Cocktail').glass).toBe('coupe');
		expect(recipe('Irish Coffee').glass).toBe('irish coffee glass');
	});
});

describe('the IBA import over the Cocktails doc', () => {
	let local: LocalD1;

	beforeEach(async () => {
		local = await createLocalD1();
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('loads additively alongside the Cocktails doc with 116 Recipes and no duplicate Ingredients', async () => {
		const cocktails = readSeed('seed/cocktails.json');
		const iba = readSeed('seed/iba.json');
		await load(local, seedStatements(cocktails, { replace: true }));
		await load(local, seedStatements(iba, { additive: true }));

		const cards = await listRecipeCards(local.db);
		expect(cards).toHaveLength(cocktails.recipes.length + iba.recipes.length);
		expect(cards).toHaveLength(116);
		expect(cards.find((c) => c.name === 'Jungle Bird')).toMatchObject({ family: 'tiki' });

		const options = await listIngredientOptions(local.db);
		const names = options.map((i) => i.name.toLowerCase());
		expect(new Set(names).size).toBe(names.length);
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
