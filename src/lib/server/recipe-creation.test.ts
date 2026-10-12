import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RecipeChanges } from '../recipe-draft';
import { ingredient, recipe } from './db/schema';
import {
	createRecipe,
	getOwnerNotes,
	getRecipe,
	listFilterSections,
	listIngredientOptions,
	listRecipeCards,
	updateRecipe
} from './recipes';
import { createLocalD1, type LocalD1 } from './testing/local-d1';

const fields: Omit<RecipeChanges, 'lines' | 'newIngredients'> = {
	name: 'Jungle Bird',
	glass: 'rocks',
	garnish: 'pineapple wedge',
	iceServe: 'Over a big cube',
	description: null,
	source: 'Jeff Berry',
	ownerNotes: 'Try with Smith & Cross.',
	method: ['Shake with ice.'],
	tags: ['tiki']
};

describe('Creating a Recipe', () => {
	let local: LocalD1;
	let rum: number;
	let campari: number;
	let changes: RecipeChanges;

	beforeEach(async () => {
		local = await createLocalD1();
		[{ id: rum }, { id: campari }] = await local.db
			.insert(ingredient)
			.values([
				{ name: 'rum', type: 'spirit' },
				{ name: 'Campari', type: 'liqueur' }
			])
			.returning();
		changes = {
			...fields,
			lines: [
				{ ingredientId: rum, amountMin: 1.5, amountMax: null, unit: 'oz', note: null },
				{ ingredientId: campari, amountMin: 0.75, amountMax: null, unit: 'oz', note: null }
			],
			newIngredients: []
		};
	});

	afterEach(async () => {
		await local.dispose();
	});

	const created = async (result: Awaited<ReturnType<typeof createRecipe>>) => {
		if (typeof result !== 'object' || !('id' in result)) throw new Error(`not created: ${JSON.stringify(result)}`);
		return result.id;
	};

	it('creates a Recipe that Visitors see', async () => {
		const id = await created(await createRecipe(local.db, changes));

		expect(await getRecipe(local.db, id)).toMatchObject({
			name: 'Jungle Bird',
			glass: 'rocks',
			garnish: 'pineapple wedge',
			iceServe: 'Over a big cube',
			source: 'Jeff Berry',
			method: ['Shake with ice.'],
			tags: ['tiki'],
			lines: [
				{ ingredient: 'rum', amountMin: 1.5, unit: 'oz' },
				{ ingredient: 'Campari', amountMin: 0.75, unit: 'oz' }
			]
		});
		expect(await getOwnerNotes(local.db, id)).toBe('Try with Smith & Cross.');
		expect((await listRecipeCards(local.db)).map((card) => card.name)).toEqual(['Jungle Bird']);
	});

	it('creates new Ingredients with the Recipe, including a new Parent Ingredient', async () => {
		const id = await created(
			await createRecipe(local.db, {
				...changes,
				lines: [
					{ ingredientId: -2, amountMin: 1.5, amountMax: null, unit: 'oz', note: null },
					{ ingredientId: -3, amountMin: 0.5, amountMax: null, unit: 'oz', note: null }
				],
				newIngredients: [
					{ id: -1, name: 'Jamaican rum', type: 'spirit', parentId: rum },
					{ id: -2, name: 'Smith & Cross', type: 'spirit', parentId: -1 },
					{ id: -3, name: 'demerara syrup', type: 'syrup', parentId: null }
				]
			})
		);

		expect((await getRecipe(local.db, id))?.lines.map((line) => line.ingredient)).toEqual([
			'Smith & Cross',
			'demerara syrup'
		]);
		expect(await listIngredientOptions(local.db)).toEqual([
			{ id: campari, name: 'Campari', parent: null, type: 'liqueur' },
			{ id: expect.any(Number), name: 'demerara syrup', parent: null, type: 'syrup' },
			{ id: expect.any(Number), name: 'Jamaican rum', parent: 'rum', type: 'spirit' },
			{ id: rum, name: 'rum', parent: null, type: 'spirit' },
			{ id: expect.any(Number), name: 'Smith & Cross', parent: 'Jamaican rum', type: 'spirit' }
		]);
	});

	it('shows a new Ingredient in the filter sheet under its type once a Recipe uses it', async () => {
		await createRecipe(local.db, {
			...changes,
			lines: [{ ingredientId: -1, amountMin: 0.5, amountMax: null, unit: 'oz', note: null }],
			newIngredients: [{ id: -1, name: 'falernum', type: 'liqueur', parentId: null }]
		});

		const sections = await listFilterSections(local.db, []);
		expect(sections.find((section) => section.type === 'liqueur')?.ingredients.map((i) => i.name)).toEqual([
			'falernum'
		]);
	});

	it('refuses a new Ingredient whose name is already in the catalog, ignoring case, and creates nothing', async () => {
		const result = await createRecipe(local.db, {
			...changes,
			lines: [{ ingredientId: -1, amountMin: 1, amountMax: null, unit: 'oz', note: null }],
			newIngredients: [{ id: -1, name: 'CAMPARI', type: 'liqueur', parentId: null }]
		});

		expect(result).toEqual({ taken: 'Campari' });
		expect(await local.db.select().from(recipe)).toEqual([]);
		expect(await local.db.select().from(ingredient)).toHaveLength(2);
	});

	it('refuses a new Ingredient that differs from one in the catalog only by accents or spacing', async () => {
		const result = await createRecipe(local.db, {
			...changes,
			lines: [{ ingredientId: -1, amountMin: 1, amountMax: null, unit: 'oz', note: null }],
			newIngredients: [{ id: -1, name: 'Campàri', type: 'liqueur', parentId: null }]
		});

		expect(result).toEqual({ taken: 'Campari' });
		expect(await local.db.select().from(recipe)).toEqual([]);
	});

	it('refuses a Recipe line whose Ingredient is gone from the catalog, and creates nothing', async () => {
		const result = await createRecipe(local.db, {
			...changes,
			lines: [{ ingredientId: 404, amountMin: 1, amountMax: null, unit: 'oz', note: null }]
		});

		expect(result).toBe('missing ingredient');
		expect(await local.db.select().from(recipe)).toEqual([]);
	});

	it('refuses a new Parent Ingredient that is gone from the catalog', async () => {
		const result = await createRecipe(local.db, {
			...changes,
			lines: [{ ingredientId: -1, amountMin: 1, amountMax: null, unit: 'oz', note: null }],
			newIngredients: [{ id: -1, name: 'aged rum', type: 'spirit', parentId: 404 }]
		});

		expect(result).toBe('missing ingredient');
		expect(await local.db.select().from(ingredient)).toHaveLength(2);
	});

	it('keeps Ingredient names unique in the database, ignoring case', async () => {
		await expect(local.db.insert(ingredient).values({ name: 'RUM', type: 'spirit' })).rejects.toThrow();
	});
});

describe('Creating an Ingredient while editing a Recipe', () => {
	let local: LocalD1;
	let id: number;
	let changes: RecipeChanges;

	beforeEach(async () => {
		local = await createLocalD1();
		const [gin] = await local.db.insert(ingredient).values({ name: 'gin', type: 'spirit' }).returning();
		[{ id }] = await local.db.insert(recipe).values({ name: 'Gimlet' }).returning({ id: recipe.id });
		changes = {
			...fields,
			name: 'Gimlet',
			lines: [
				{ ingredientId: gin.id, amountMin: 2, amountMax: null, unit: 'oz', note: null },
				{ ingredientId: -1, amountMin: 0.75, amountMax: null, unit: 'oz', note: null }
			],
			newIngredients: [{ id: -1, name: 'lime cordial', type: 'syrup', parentId: null }]
		};
	});

	afterEach(async () => {
		await local.dispose();
	});

	it('creates the new Ingredient when the edit is saved', async () => {
		expect(await updateRecipe(local.db, id, changes)).toBe('saved');

		expect((await getRecipe(local.db, id))?.lines.map((line) => line.ingredient)).toEqual(['gin', 'lime cordial']);
	});

	it('refuses a name already in the catalog and changes nothing', async () => {
		const result = await updateRecipe(local.db, id, {
			...changes,
			newIngredients: [{ id: -1, name: 'Gin', type: 'spirit', parentId: null }]
		});

		expect(result).toEqual({ taken: 'gin' });
		expect((await getRecipe(local.db, id))?.lines).toEqual([]);
		expect(await local.db.select().from(ingredient)).toHaveLength(1);
	});
});
