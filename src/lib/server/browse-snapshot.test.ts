import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_FILTER, type RecipeFilter } from '../filter';
import type { RecipeChanges } from '../recipe-draft';
import { getDb, type Db } from './db';
import { ingredient, recipe } from './db/schema';
import { mergeIngredient, updateIngredient } from './ingredients';
import { browseRecipes, createRecipe, deleteRecipe, setFavorite, updateRecipe } from './recipes';
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

function instrument(d1: D1Database) {
	let rowsRead = 0;
	const count = <T>(result: D1Result<T>): D1Result<T> => {
		rowsRead += result.meta.rows_read;
		return result;
	};
	const wrap = (statement: D1PreparedStatement): D1PreparedStatement =>
		new Proxy(statement, {
			get(target, prop, receiver) {
				if (prop === 'bind') {
					return (...values: unknown[]) => wrap(target.bind(...values));
				}
				if (prop === 'raw') {
					return async () => {
						const { results } = count(await target.all());
						return results.map((row) => Object.values(row));
					};
				}
				if (prop === 'all') return async () => count(await target.all());
				if (prop === 'run') return async () => count(await target.run());
				const value = Reflect.get(target, prop, receiver);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});
	const db = new Proxy(d1, {
		get(target, prop, receiver) {
			if (prop === 'prepare') return (query: string) => wrap(target.prepare(query));
			if (prop === 'batch') {
				return async (statements: D1PreparedStatement[]) => (await target.batch(statements)).map(count);
			}
			const value = Reflect.get(target, prop, receiver);
			return typeof value === 'function' ? value.bind(target) : value;
		}
	});
	return { db: getDb(db as D1Database), rowsRead: () => rowsRead };
}

/** Runs a write once, right after the first batch read, so a rebuild races a save. */
function raceWithBatch(db: Db, write: () => Promise<unknown>): Db {
	let written = false;
	return new Proxy(db, {
		get(target, prop, receiver) {
			if (prop === 'batch') {
				return async (...args: unknown[]) => {
					const batch = target.batch as unknown as (...batchArgs: unknown[]) => Promise<unknown>;
					const result = await batch.apply(target, args);
					if (!written) {
						written = true;
						await write();
					}
					return result;
				};
			}
			const value = Reflect.get(target, prop, receiver);
			return typeof value === 'function' ? value.bind(target) : value;
		}
	}) as Db;
}

describe('browsing from a D1 snapshot', () => {
	let local: LocalD1;
	let ids: Map<string, number>;

	beforeEach(async () => {
		local = await createLocalD1();
		await local.d1.batch(seedStatements(seed).map((s) => local.d1.prepare(s)));
		const rows = await local.db.select({ id: ingredient.id, name: ingredient.name }).from(ingredient);
		ids = new Map(rows.map((r) => [r.name, r.id]));
	});

	afterEach(async () => {
		await local.dispose();
	});

	const names = async (filter: RecipeFilter = EMPTY_FILTER) =>
		(await browseRecipes(local.db, filter)).recipes.map((c) => c.name);

	const picking = (ingredients: string[], rest: Partial<RecipeFilter> = {}): RecipeFilter => ({
		...EMPTY_FILTER,
		ingredients: ingredients.map((name) => ids.get(name)!),
		...rest
	});

	it('reads about one row on a second browse with no write in between', async () => {
		await browseRecipes(local.db, EMPTY_FILTER);

		const counted = instrument(local.d1);
		const browse = await browseRecipes(counted.db, EMPTY_FILTER);

		expect(browse.recipes.map((c) => c.name)).toEqual(['Daiquiri', 'Gimlet', 'Jungle Bird', 'Mojito']);
		expect(counted.rowsRead()).toBeLessThanOrEqual(2);
	});

	it('browses every Recipe, favorites first then A–Z', async () => {
		expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Jungle Bird', 'Mojito']);
	});

	it('searches Recipe names, tolerating typos', async () => {
		expect(await names({ ...EMPTY_FILTER, query: 'daquiri' })).toEqual(['Daiquiri']);
		expect(await names({ ...EMPTY_FILTER, query: 'bird' })).toEqual(['Jungle Bird']);
	});

	it('filters by Ingredient, ranking by how much of it a Recipe contains', async () => {
		expect(await names(picking(['lime juice']))).toEqual(['Mojito', 'Daiquiri', 'Gimlet', 'Jungle Bird']);
		expect(await names(picking(['lime juice', 'mint']))).toEqual(['Mojito']);
	});

	it('matches descendants of a Parent Ingredient at any depth', async () => {
		expect(await names(picking(['rum']))).toEqual(['Daiquiri', 'Mojito', 'Jungle Bird']);
		expect(await names(picking(['aged rum']))).toEqual(['Jungle Bird']);
	});

	it('filters by Tag and by Favorite', async () => {
		expect(await names({ ...EMPTY_FILTER, tags: ['sour'] })).toEqual(['Daiquiri', 'Gimlet']);
		expect(await names({ ...EMPTY_FILTER, favorites: true })).toEqual(['Daiquiri', 'Gimlet']);
	});

	it('offers used Ingredients and their Parent Ingredients, sectioned by Ingredient type', async () => {
		const browse = await browseRecipes(local.db, EMPTY_FILTER);

		expect(browse.sections.map((s) => [s.type, s.ingredients.map((i) => i.name)])).toEqual([
			['spirit', ['aged rum', 'gin', 'rum', 'Smith & Cross', 'white rum']],
			['liqueur', ['Campari']],
			['syrup', ['simple syrup']],
			['juice', ['lime juice']],
			['mixer', ['club soda']],
			['fresh', ['mint']]
		]);
	});

	it('suggests matching Ingredients and Tags while searching', async () => {
		const camp = await browseRecipes(local.db, { ...EMPTY_FILTER, query: 'camp' });
		expect(camp.suggestions).toEqual([{ kind: 'ingredient', id: ids.get('Campari'), name: 'Campari' }]);

		const sour = await browseRecipes(local.db, { ...EMPTY_FILTER, query: 'sour' });
		expect(sour.suggestions).toEqual([{ kind: 'tag', name: 'sour' }]);
	});

	it('ignores picked Ingredients that are not offered', async () => {
		const browse = await browseRecipes(local.db, picking(['mint'], { ingredients: [ids.get('mint')!, 9999] }));

		expect(browse.filter.ingredients).toEqual([ids.get('mint')]);
		expect(browse.recipes.map((c) => c.name)).toEqual(['Mojito']);
	});

	describe('invalidation', () => {
		it('reflects a newly created Recipe on the next browse', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);
			const changes: RecipeChanges = {
				name: 'Boulevardier',
				glass: 'rocks',
				garnish: null,
				iceServe: null,
				description: null,
				source: null,
				ownerNotes: null,
				method: [],
				tags: [],
				newIngredients: [],
				lines: [{ ingredientId: ids.get('Campari')!, amountMin: 1, amountMax: null, unit: 'oz', note: null }]
			};

			await createRecipe(local.db, changes);

			expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Boulevardier', 'Jungle Bird', 'Mojito']);
		});

		it('reflects an edited Recipe, including its name, glass, Tags and lines', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Mojito'));
			const changes: RecipeChanges = {
				name: 'Mojito Especial',
				glass: 'highball',
				garnish: 'mint sprig',
				iceServe: null,
				description: null,
				source: null,
				ownerNotes: null,
				method: [],
				tags: ['fizz'],
				newIngredients: [],
				lines: [{ ingredientId: ids.get('gin')!, amountMin: 2, amountMax: null, unit: 'oz', note: null }]
			};

			await updateRecipe(local.db, id, changes);

			const card = (await browseRecipes(local.db, EMPTY_FILTER)).recipes.find((c) => c.id === id);
			expect(card).toMatchObject({ name: 'Mojito Especial', glass: 'highball', subtitle: 'gin' });
			expect((await browseRecipes(local.db, { ...EMPTY_FILTER, tags: ['fizz'] })).recipes.map((c) => c.name)).toEqual([
				'Mojito Especial'
			]);
		});

		it('reorders the list when a Favorite is marked', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Mojito'));

			await setFavorite(local.db, id, true);

			expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Mojito', 'Jungle Bird']);
		});

		it('drops a deleted Recipe from the list', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Jungle Bird'));

			await deleteRecipe(local.db, id);

			expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Mojito']);
		});

		it('reflects renaming, retyping and reparenting an Ingredient', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);

			await updateIngredient(local.db, ids.get('white rum')!, {
				name: 'blanco rum',
				type: 'pantry',
				parentId: null
			});

			expect(await names(picking(['rum']))).toEqual(['Jungle Bird']);
			expect((await browseRecipes(local.db, picking(['rum']))).recipes.map((c) => c.subtitle)).toEqual(['Smith & Cross']);
			expect((await browseRecipes(local.db, EMPTY_FILTER)).sections.find((s) => s.type === 'pantry')?.ingredients).toEqual([
				{ id: ids.get('white rum'), name: 'blanco rum' }
			]);
		});

		it('reflects merging one Ingredient into another', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);

			expect(await mergeIngredient(local.db, ids.get('white rum')!, ids.get('gin')!)).toBe('merged');

			expect(await names(picking(['gin']))).toEqual(['Daiquiri', 'Gimlet', 'Mojito']);
		});

		it('reflects SQL run by hand, which proves the triggers', async () => {
			await browseRecipes(local.db, EMPTY_FILTER);

			await local.d1.prepare("INSERT INTO recipe (name) VALUES ('Hand-run Special')").run();
			await local.d1.prepare("UPDATE ingredient SET name = 'white rum (old)' WHERE name = 'white rum'").run();

			expect(await names()).toContain('Hand-run Special');
			expect(
				(await browseRecipes(local.db, EMPTY_FILTER)).recipes.some((c) => c.subtitle.includes('white rum (old)'))
			).toBe(true);
		});

		it('never stores Owner notes in the snapshot', async () => {
			const [{ id }] = await local.db.select({ id: recipe.id }).from(recipe).where(eq(recipe.name, 'Mojito'));
			await updateRecipe(local.db, id, {
				name: 'Mojito',
				glass: null,
				garnish: null,
				iceServe: null,
				description: null,
				source: null,
				ownerNotes: 'Secret party note',
				method: [],
				tags: ['highball'],
				newIngredients: [],
				lines: [{ ingredientId: ids.get('white rum')!, amountMin: 2, amountMax: null, unit: 'oz', note: null }]
			});
			await browseRecipes(local.db, EMPTY_FILTER);

			const { results } = await local.d1
				.prepare('SELECT data FROM browse_snapshot WHERE id = 1')
				.all<{ data: string }>();

			expect(results[0].data).not.toContain('Secret party note');
		});
	});

	it('rebuilds a stored snapshot written in an older format', async () => {
		await local.d1
			.prepare('INSERT INTO browse_snapshot (id, format_version, generation, data) VALUES (1, 999, 0, ?)')
			.bind(JSON.stringify({ recipes: [], catalog: [], usedIngredientIds: [], tagNames: [] }))
			.run();

		expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Jungle Bird', 'Mojito']);
	});

	it('does not store a rebuild whose generation was overtaken by a write', async () => {
		const racing = raceWithBatch(local.db, async () => {
			await local.d1.prepare("UPDATE recipe SET favorite = 1 WHERE name = 'Mojito'").run();
		});

		await browseRecipes(racing, EMPTY_FILTER);

		expect(await names()).toEqual(['Daiquiri', 'Gimlet', 'Mojito', 'Jungle Bird']);
	});
});
